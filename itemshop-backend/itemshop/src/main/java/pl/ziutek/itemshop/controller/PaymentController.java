package pl.ziutek.itemshop.controller;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.Invoice;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.SubscriptionUpdateParams;
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

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
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

    @Value("${stripe.price.pro-monthly}")
    private String stripePriceProMonthly;

    @Value("${stripe.price.starter-monthly}")
    private String stripePriceStarterMonthly;

    @Value("${app.frontend.base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    @Autowired private OwnerRepository ownerRepository;
    @Autowired private ProcessedStripeEventRepository processedStripeEventRepository;
    @Autowired private ShopRepository shopRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private PendingItemRepository pendingItemRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private PlayerWalletRepository playerWalletRepository;
    @Autowired private pl.ziutek.itemshop.repository.PromoCodeRepository promoCodeRepository;
    @Autowired private pl.ziutek.itemshop.service.EmailService emailService;

    @PostMapping("/create-checkout-session")
    public ResponseEntity<?> createCheckoutSession() {
        Stripe.apiKey = stripeApiKey;
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        if (email == null || !email.contains("@")) {
            return ResponseEntity.status(400).body("Niepoprawne dane konta.");
        }

        Optional<Owner> ownerOpt = ownerRepository.findByEmail(email);
        if (ownerOpt.isEmpty()) return ResponseEntity.status(400).body("Brak konta.");

        Owner owner = ownerOpt.get();
        if ("PRO".equals(owner.getSubscriptionPlan()) && owner.getSubscriptionExpiresAt() != null
                && owner.getSubscriptionExpiresAt().isAfter(LocalDateTime.now())) {
            return ResponseEntity.status(400).body("Masz już aktywny plan PRO.");
        }

        try {
            SessionCreateParams.Builder builder = SessionCreateParams.builder()
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.PAYPAL)
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .setSuccessUrl(frontendBaseUrl + "/admin?payment=success")
                    .setCancelUrl(frontendBaseUrl + "/admin?payment=cancel")
                    .putMetadata("ownerEmail", email)
                    .putMetadata("type", "subscription_pro")
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPrice(stripePriceProMonthly)
                            .build());

            if (owner.getStripeCustomerId() != null) {
                builder.setCustomer(owner.getStripeCustomerId());
            } else {
                builder.setCustomerEmail(email);
            }

            Session session = Session.create(builder.build());
            return ResponseEntity.ok(Map.of("url", session.getUrl()));

        } catch (Exception e) {
            log.error("[Payment] Błąd tworzenia sesji Stripe dla {}: {}", email, e.getMessage(), e);
            return ResponseEntity.status(500).body("Nie udało się utworzyć sesji płatności. Spróbuj ponownie.");
        }
    }

    @PostMapping("/create-checkout-session-starter")
    public ResponseEntity<?> createStarterCheckoutSession() {
        Stripe.apiKey = stripeApiKey;
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        if (email == null || !email.contains("@")) return ResponseEntity.status(400).body("Niepoprawne dane konta.");

        Optional<Owner> ownerOpt = ownerRepository.findByEmail(email);
        if (ownerOpt.isEmpty()) return ResponseEntity.status(400).body("Brak konta.");
        Owner owner = ownerOpt.get();

        if (List.of("STARTER","PRO").contains(owner.getSubscriptionPlan())
                && owner.getSubscriptionExpiresAt() != null
                && owner.getSubscriptionExpiresAt().isAfter(LocalDateTime.now())) {
            return ResponseEntity.status(400).body("Masz już aktywny plan " + owner.getSubscriptionPlan() + ".");
        }

        try {
            SessionCreateParams.Builder builder = SessionCreateParams.builder()
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.PAYPAL)
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .setSuccessUrl(frontendBaseUrl + "/admin?payment=success")
                    .setCancelUrl(frontendBaseUrl + "/admin?payment=cancel")
                    .putMetadata("ownerEmail", email)
                    .putMetadata("type", "subscription_starter")
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPrice(stripePriceStarterMonthly)
                            .build());
            if (owner.getStripeCustomerId() != null) builder.setCustomer(owner.getStripeCustomerId());
            else builder.setCustomerEmail(email);
            Session session = Session.create(builder.build());
            return ResponseEntity.ok(Map.of("url", session.getUrl()));
        } catch (Exception e) {
            log.error("[Payment] Błąd tworzenia sesji Starter dla {}: {}", email, e.getMessage(), e);
            return ResponseEntity.status(500).body("Nie udało się utworzyć sesji płatności.");
        }
    }

    @PostMapping("/cancel-subscription")
    public ResponseEntity<?> cancelSubscription() {
        Stripe.apiKey = stripeApiKey;
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        return ownerRepository.findByEmail(email).<ResponseEntity<?>>map(owner -> {
            if ("FREE".equals(owner.getSubscriptionPlan())) {
                return ResponseEntity.badRequest().body("Nie masz aktywnej subskrypcji.");
            }
            // Brak Stripe subscription ID — bezpośredni downgrade (dev mode / ręcznie ustawiony plan)
            if (owner.getStripeSubscriptionId() == null) {
                owner.setSubscriptionPlan("FREE");
                owner.setSubscriptionExpiresAt(null);
                ownerRepository.save(owner);
                log.info("[Payment] Bezpośredni downgrade do FREE (brak sub Stripe) dla: {}", email);
                return ResponseEntity.ok(Map.of("message", "Subskrypcja anulowana."));
            }
            try {
                // Anuluj na koniec bieżącego okresu — użytkownik zachowuje plan do końca
                Subscription sub = Subscription.retrieve(owner.getStripeSubscriptionId());
                sub.update(SubscriptionUpdateParams.builder()
                        .setCancelAtPeriodEnd(true)
                        .build());
                log.info("[Payment] Subskrypcja {} oznaczona do anulowania na koniec okresu. Konto: {}", owner.getStripeSubscriptionId(), email);
                return ResponseEntity.ok(Map.of("message", "Subskrypcja zostanie anulowana po zakończeniu bieżącego okresu."));
            } catch (Exception e) {
                log.error("[Payment] Błąd anulowania subskrypcji dla {}: {}", email, e.getMessage(), e);
                return ResponseEntity.status(500).body("Nie udało się anulować subskrypcji. Spróbuj ponownie.");
            }
        }).orElse(ResponseEntity.status(404).body("Konto nie istnieje."));
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

            switch (event.getType()) {
                case "checkout.session.completed"       -> handleCheckoutCompleted(event);
                case "invoice.payment_succeeded"        -> handleInvoicePaid(event);
                case "customer.subscription.deleted"    -> handleSubscriptionDeleted(event);
                default -> log.debug("[Webhook] Zignorowano event: {}", event.getType());
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
        Session session = (Session) event.getData().getObject(); // deprecated ale jedyne dostępne bez dodatkowej deserializacji
        Map<String, String> metadata = session.getMetadata() != null ? session.getMetadata() : new HashMap<>();
        String type = metadata.getOrDefault("type", "");

        if ("subscription_pro".equals(type)) {
            handleSubscriptionPro(session);
        } else if ("subscription_starter".equals(type)) {
            handleSubscriptionStarter(session);
        } else if ("product_purchase".equals(type)) {
            String customerEmail = null;
            try {
                var details = session.getCustomerDetails();
                if (details != null) customerEmail = details.getEmail();
            } catch (Exception ignored) {}
            handleProductPurchase(metadata, customerEmail);
        }
    }

    private void handleSubscriptionPro(Session session) {
        String customerEmail = session.getCustomerEmail();
        String customerId    = session.getCustomer();
        String subscriptionId = session.getSubscription();

        if (customerEmail == null || customerEmail.isBlank()) {
            // Fallback — szukaj po metadata.ownerEmail
            customerEmail = session.getMetadata() != null
                    ? session.getMetadata().getOrDefault("ownerEmail", null)
                    : null;
        }
        if (customerEmail == null) {
            log.warn("[Webhook] subscription_pro bez emaila klienta — sesja: {}", session.getId());
            return;
        }

        final String finalEmail = customerEmail;
        ownerRepository.findByEmail(finalEmail).ifPresentOrElse(owner -> {
            owner.setSubscriptionPlan("PRO");
            owner.setSubscriptionExpiresAt(LocalDateTime.now().plusMonths(1));
            if (customerId != null)    owner.setStripeCustomerId(customerId);
            if (subscriptionId != null) owner.setStripeSubscriptionId(subscriptionId);
            ownerRepository.save(owner);
            log.info("[Webhook] Konto {} upgrade do PRO (sub: {}).", finalEmail, subscriptionId);
        }, () -> log.warn("[Webhook] Nie znaleziono konta dla emaila: {}", finalEmail));
    }

    private void handleSubscriptionStarter(Session session) {
        String customerEmail = session.getCustomerEmail();
        String customerId    = session.getCustomer();
        String subscriptionId = session.getSubscription();
        if (customerEmail == null || customerEmail.isBlank()) {
            customerEmail = session.getMetadata() != null
                    ? session.getMetadata().getOrDefault("ownerEmail", null) : null;
        }
        if (customerEmail == null) { log.warn("[Webhook] subscription_starter bez emaila — sesja: {}", session.getId()); return; }
        final String finalEmail = customerEmail;
        ownerRepository.findByEmail(finalEmail).ifPresentOrElse(owner -> {
            owner.setSubscriptionPlan("STARTER");
            owner.setSubscriptionExpiresAt(LocalDateTime.now().plusMonths(1));
            if (customerId != null)     owner.setStripeCustomerId(customerId);
            if (subscriptionId != null) owner.setStripeSubscriptionId(subscriptionId);
            ownerRepository.save(owner);
            log.info("[Webhook] Konto {} upgrade do STARTER (sub: {}).", finalEmail, subscriptionId);
        }, () -> log.warn("[Webhook] subscription_starter — brak konta dla emaila: {}", finalEmail));
    }

    private void handleInvoicePaid(Event event) {
        Invoice invoice = (Invoice) event.getData().getObject();
        String customerId = invoice.getCustomer();

        Long periodEnd = null;
        String detectedPriceId = null;
        try {
            var lines = invoice.getLines();
            if (lines != null && !lines.getData().isEmpty()) {
                var line = lines.getData().get(0);
                periodEnd = line.getPeriod().getEnd();
                if (line.getPrice() != null) detectedPriceId = line.getPrice().getId();
            }
        } catch (Exception e) {
            log.warn("[Webhook] Nie udało się wyciągnąć danych z invoice: {}", e.getMessage());
        }

        final Long finalPeriodEnd = periodEnd;
        final String finalPriceId = detectedPriceId;
        ownerRepository.findByStripeCustomerId(customerId).ifPresentOrElse(owner -> {
            // Wykryj plan na podstawie price_id; fallback: zachowaj obecny plan
            String newPlan = owner.getSubscriptionPlan();
            if (stripePriceProMonthly.equals(finalPriceId)) newPlan = "PRO";
            else if (stripePriceStarterMonthly.equals(finalPriceId)) newPlan = "STARTER";

            owner.setSubscriptionPlan(newPlan);
            owner.setSubscriptionExpiresAt(finalPeriodEnd != null
                    ? LocalDateTime.ofInstant(Instant.ofEpochSecond(finalPeriodEnd), ZoneId.systemDefault())
                    : LocalDateTime.now().plusMonths(1));
            ownerRepository.save(owner);
            log.info("[Webhook] Odnowiono {} dla customerId={}, wygasa: {}", newPlan, customerId, owner.getSubscriptionExpiresAt());
        }, () -> log.warn("[Webhook] invoice.payment_succeeded — brak konta dla customerId={}", customerId));
    }

    private void handleSubscriptionDeleted(Event event) {
        Subscription sub = (Subscription) event.getData().getObject();
        String customerId = sub.getCustomer();

        ownerRepository.findByStripeCustomerId(customerId).ifPresentOrElse(owner -> {
            owner.setSubscriptionPlan("FREE");
            owner.setSubscriptionExpiresAt(null);
            owner.setStripeSubscriptionId(null);
            ownerRepository.save(owner);
            log.info("[Webhook] Subskrypcja anulowana dla customerId={}. Konto zdegradowane do FREE.", customerId);
        }, () -> log.warn("[Webhook] subscription.deleted — brak konta dla customerId={}", customerId));
    }

    private void handleProductPurchase(Map<String, String> metadata, String customerEmail) {
        String serverName   = metadata.get("serverName");
        String productIdStr = metadata.get("productId");
        String nick         = metadata.get("nick");
        String mode         = metadata.getOrDefault("mode", "survival");
        String promoCode    = metadata.get("promoCode");

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

        // Inkrementacja użycia kodu promo
        if (promoCode != null && !promoCode.isBlank()) {
            promoCodeRepository.findByShopAndCodeIgnoreCase(shop, promoCode).ifPresent(pc -> {
                pc.setCurrentUses(pc.getCurrentUses() + 1);
                promoCodeRepository.save(pc);
            });
        }

        // Email potwierdzający zakup (opcjonalny — nie blokuje zakupu)
        if (customerEmail != null && !customerEmail.isBlank()) {
            emailService.sendPurchaseConfirmation(customerEmail, nick.trim(),
                    product.getName(), serverName, pointsToAdd, promoCode);
        }

        log.info("[Webhook] Zakup produktu '{}' dla gracza '{}' na serwerze '{}'.",
                product.getName(), nick, serverName);
    }
}