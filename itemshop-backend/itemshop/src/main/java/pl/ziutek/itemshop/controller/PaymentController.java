package pl.ziutek.itemshop.controller;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import pl.ziutek.itemshop.model.*;
import pl.ziutek.itemshop.repository.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);
    private static final String NICK_REGEX = "^[a-zA-Z0-9_]{3,16}$";

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    @Value("${stripe.webhook.secret}")
    private String stripeWebhookSecret;

    @Value("${app.frontend.base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    @Autowired private OwnerRepository ownerRepository;
    @Autowired private ProcessedStripeEventRepository processedStripeEventRepository;
    @Autowired private ShopRepository shopRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private PendingItemRepository pendingItemRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private PlayerWalletRepository playerWalletRepository;

    @PostMapping("/create-checkout-session")
    public ResponseEntity<?> createCheckoutSession() {
        if (stripeApiKey == null || stripeApiKey.isBlank() || stripeApiKey.contains("REPLACE_ME")) {
            log.error("[Payment] Brak konfiguracji klucza Stripe API.");
            return ResponseEntity.status(500).body("Płatności są tymczasowo niedostępne.");
        }

        Stripe.apiKey = stripeApiKey;
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        if (email == null || !email.contains("@")) {
            return ResponseEntity.status(400).body("Niepoprawne dane konta.");
        }

        try {
            SessionCreateParams params = SessionCreateParams.builder()
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.BLIK)
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(frontendBaseUrl + "/admin?payment=success")
                    .setCancelUrl(frontendBaseUrl + "/admin?payment=cancel")
                    .setCustomerEmail(email)
                    .putMetadata("type", "subscription_pro")
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency("pln")
                                    .setUnitAmount(2999L)
                                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName("Ziutek PRO - Odblokowanie Konta")
                                            .build())
                                    .build())
                            .build())
                    .build();

            Session session = Session.create(params);
            return ResponseEntity.ok(Map.of("url", session.getUrl()));

        } catch (Exception e) {
            // FIX: logujemy szczegóły po stronie serwera, klient dostaje bezpieczny komunikat
            log.error("[Payment] Błąd tworzenia sesji Stripe dla {}: {}", email, e.getMessage(), e);
            return ResponseEntity.status(500).body("Nie udało się utworzyć sesji płatności. Spróbuj ponownie.");
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader
    ) {
        Stripe.apiKey = stripeApiKey;

        if (sigHeader == null || sigHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing Stripe-Signature");
        }

        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, stripeWebhookSecret);
        } catch (SignatureVerificationException e) {
            log.warn("[Webhook] Nieprawidłowy podpis Stripe.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
        } catch (Exception e) {
            log.error("[Webhook] Błąd parsowania eventu Stripe: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Webhook Error");
        }

        try {
            if (processedStripeEventRepository.existsById(event.getId())) {
                return ResponseEntity.ok("Already processed");
            }

            if ("checkout.session.completed".equals(event.getType())) {
                handleCheckoutCompleted(event);
            }

            ProcessedStripeEvent processed = new ProcessedStripeEvent();
            processed.setEventId(event.getId());
            processedStripeEventRepository.save(processed);

            return ResponseEntity.ok("OK");

        } catch (Exception e) {
            // FIX: nie zwracamy 4xx — Stripe ponowi event przy 4xx/5xx.
            // Logujemy błąd, zwracamy 200 żeby Stripe nie ponawiał w nieskończoność.
            // Wyjątek: błędy parsowania/podpisu powyżej zwracają 400 (celowo).
            log.error("[Webhook] Błąd przetwarzania eventu {}: {}", event.getId(), e.getMessage(), e);
            return ResponseEntity.ok("OK");
        }
    }

    private void handleCheckoutCompleted(Event event) {
        Session session = (Session) event.getData().getObject();
        Map<String, String> metadata = session.getMetadata() != null ? session.getMetadata() : new HashMap<>();
        String type = metadata.getOrDefault("type", "");

        if ("subscription_pro".equals(type)) {
            handleSubscriptionPro(session);
        } else if ("product_purchase".equals(type)) {
            handleProductPurchase(metadata);
        }
    }

    private void handleSubscriptionPro(Session session) {
        String customerEmail = session.getCustomerEmail();
        if (customerEmail == null || customerEmail.isBlank()) {
            log.warn("[Webhook] subscription_pro bez emaila klienta — sesja: {}", session.getId());
            return;
        }

        Optional<Owner> ownerOpt = ownerRepository.findByEmail(customerEmail);
        if (ownerOpt.isPresent()) {
            Owner owner = ownerOpt.get();
            owner.setSubscriptionPlan("PRO");
            ownerRepository.save(owner);
            log.info("[Webhook] Konto {} upgrade do PRO.", customerEmail);
        } else {
            log.warn("[Webhook] Nie znaleziono konta dla emaila: {}", customerEmail);
        }
    }

    private void handleProductPurchase(Map<String, String> metadata) {
        String serverName   = metadata.get("serverName");
        String productIdStr = metadata.get("productId");
        String nick         = metadata.get("nick");
        String mode         = metadata.getOrDefault("mode", "survival");

        if (nick == null || !nick.matches(NICK_REGEX)) {
            log.error("[Webhook] Nieprawidłowy nick w metadanych: '{}'", nick);
            return;
        }
        if (serverName == null || productIdStr == null) {
            log.error("[Webhook] Brakuje serverName lub productId w metadanych.");
            return;
        }

        Optional<Shop> shopOpt = shopRepository.findByServerNameIgnoreCase(serverName);
        Optional<Product> productOpt;
        try {
            productOpt = productRepository.findById(Long.valueOf(productIdStr));
        } catch (NumberFormatException e) {
            log.error("[Webhook] Nieprawidłowy productId: '{}'", productIdStr);
            return;
        }

        if (shopOpt.isEmpty() || productOpt.isEmpty()) {
            log.warn("[Webhook] Nie znaleziono sklepu '{}' lub produktu '{}'", serverName, productIdStr);
            return;
        }

        Shop shop = shopOpt.get();
        Product product = productOpt.get();

        if (!product.getShop().getId().equals(shop.getId())) {
            log.warn("[Webhook] Produkt {} nie należy do sklepu {}", productIdStr, serverName);
            return;
        }

        for (String cmd : product.getCommands()) {
            PendingItem newItem = new PendingItem();
            newItem.setShop(shop);
            newItem.setPlayerName(nick.trim());
            newItem.setItemName(product.getName());
            newItem.setRewardCommand(cmd.replace("{player}", nick.trim()));
            newItem.setRequiredSlots(product.getRequiredSlots());
            newItem.setMode(mode);
            newItem.setClaimed(false);
            pendingItemRepository.save(newItem);
        }

        // Zapis zamówienia
        Order order = new Order();
        order.setNickname(nick.trim());
        order.setStatus("PAID");
        order.setProduct(product);
        order.setShop(shop);
        orderRepository.save(order);

        // Punkty do portfela (10 pkt za każdy 1 PLN)
        int pointsToAdd = product.getPrice() != null ? product.getPrice().intValue() * 10 : 0;
        if (pointsToAdd > 0) {
            PlayerWallet wallet = playerWalletRepository.findByNicknameIgnoreCase(nick.trim())
                    .orElseGet(() -> {
                        PlayerWallet newWallet = new PlayerWallet();
                        newWallet.setNickname(nick.trim().toLowerCase());
                        newWallet.setPoints(0);
                        return newWallet;
                    });
            wallet.setPoints(wallet.getPoints() + pointsToAdd);
            playerWalletRepository.save(wallet);
            log.info("[Webhook] Dodano {} punktów dla gracza '{}'.", pointsToAdd, nick.trim());
        }

        log.info("[Webhook] Zakup produktu '{}' dla gracza '{}' na serwerze '{}'.",
                product.getName(), nick, serverName);
    }
}