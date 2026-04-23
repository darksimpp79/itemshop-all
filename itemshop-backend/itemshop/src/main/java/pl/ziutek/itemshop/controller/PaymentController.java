package pl.ziutek.itemshop.controller;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import pl.ziutek.itemshop.model.Owner;
import pl.ziutek.itemshop.model.ProcessedStripeEvent;
import pl.ziutek.itemshop.model.PendingItem;
import pl.ziutek.itemshop.model.Product;
import pl.ziutek.itemshop.model.Shop;
import pl.ziutek.itemshop.repository.OwnerRepository;
import pl.ziutek.itemshop.repository.ProcessedStripeEventRepository;
import pl.ziutek.itemshop.repository.PendingItemRepository;
import pl.ziutek.itemshop.repository.ProductRepository;
import pl.ziutek.itemshop.repository.ShopRepository;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    @Value("${stripe.webhook.secret}")
    private String stripeWebhookSecret;

    @Value("${app.frontend.base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    @Autowired
    private OwnerRepository ownerRepository;

    @Autowired
    private ProcessedStripeEventRepository processedStripeEventRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PendingItemRepository pendingItemRepository;

    @PostMapping("/create-checkout-session")
    public ResponseEntity<?> createCheckoutSession() {
        if (stripeApiKey == null || stripeApiKey.isBlank() || stripeApiKey.contains("REPLACE_ME")) {
            return ResponseEntity.status(500).body("Brak konfiguracji Stripe. Ustaw zmienną środowiskową STRIPE_API_KEY.");
        }
        Stripe.apiKey = stripeApiKey;
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        if (email == null || !email.contains("@")) {
            return ResponseEntity.status(400).body("Niepoprawny e-mail konta. Zaloguj się na konto z prawidłowym adresem e-mail.");
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
                    .addLineItem(
                            SessionCreateParams.LineItem.builder()
                                    .setQuantity(1L)
                                    .setPriceData(
                                            SessionCreateParams.LineItem.PriceData.builder()
                                                    .setCurrency("pln")
                                                    .setUnitAmount(2999L) // 29.99 PLN
                                                    .setProductData(
                                                            SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                    .setName("Ziutek PRO - Odblokowanie Konta")
                                                                    .build()
                                                    ).build()
                                    ).build()
                    ).build();

            Session session = Session.create(params);
            Map<String, String> responseData = new HashMap<>();
            responseData.put("url", session.getUrl());
            return ResponseEntity.ok(responseData);

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Błąd generowania sesji płatności: " + e.getMessage());
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader
    ) {
        Stripe.apiKey = stripeApiKey;
        try {
            if (sigHeader == null || sigHeader.isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing Stripe-Signature");
            }

            Event event;
            try {
                event = Webhook.constructEvent(payload, sigHeader, stripeWebhookSecret);
            } catch (SignatureVerificationException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
            }

            if (processedStripeEventRepository.existsById(event.getId())) {
                return ResponseEntity.ok("Already processed");
            }

            if ("checkout.session.completed".equals(event.getType())) {
                Session session = (Session) event.getData().getObject();
                Map<String, String> metadata = session.getMetadata() != null ? session.getMetadata() : new HashMap<>();
                String type = metadata.getOrDefault("type", "");

                if ("subscription_pro".equals(type)) {
                    String customerEmail = session.getCustomerEmail();
                    if (customerEmail != null && !customerEmail.isBlank()) {
                        Optional<Owner> ownerOpt = ownerRepository.findByEmail(customerEmail);
                        if (ownerOpt.isPresent()) {
                            Owner owner = ownerOpt.get();
                            owner.setSubscriptionPlan("PRO");
                            ownerRepository.save(owner);
                        }
                    }
                } else if ("product_purchase".equals(type)) {
                    String serverName = metadata.get("serverName");
                    String productIdStr = metadata.get("productId");
                    String nick = metadata.get("nick");
                    String mode = metadata.getOrDefault("mode", "survival");

                    if (serverName != null && productIdStr != null && nick != null) {
                        Optional<Shop> shopOpt = shopRepository.findByServerNameIgnoreCase(serverName);
                        Optional<Product> productOpt = productRepository.findById(Long.valueOf(productIdStr));

                        if (shopOpt.isPresent() && productOpt.isPresent()) {
                            Shop shop = shopOpt.get();
                            Product product = productOpt.get();

                            if (product.getShop().getId().equals(shop.getId())) {
                                for (String cmd : product.getCommands()) {
                                    PendingItem newItem = new PendingItem();
                                    newItem.setShop(shop);
                                    newItem.setPlayerName(nick.trim());
                                    newItem.setItemName(product.getName());
                                    newItem.setRewardCommand(cmd);
                                    newItem.setRequiredSlots(product.getRequiredSlots());
                                    newItem.setMode(mode);
                                    newItem.setClaimed(false);
                                    pendingItemRepository.save(newItem);
                                }
                            }
                        }
                    }
                }
            }

            ProcessedStripeEvent processed = new ProcessedStripeEvent();
            processed.setEventId(event.getId());
            processedStripeEventRepository.save(processed);

            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Webhook Error");
        }
    }
}