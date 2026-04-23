package pl.ziutek.itemshop.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.web.bind.annotation.*;
import pl.ziutek.itemshop.model.DailyReward;
import pl.ziutek.itemshop.model.PendingItem;
import pl.ziutek.itemshop.model.Product;
import pl.ziutek.itemshop.model.Shop;
import pl.ziutek.itemshop.repository.DailyRewardRepository;
import pl.ziutek.itemshop.repository.PendingItemRepository;
import pl.ziutek.itemshop.repository.ProductRepository;
import pl.ziutek.itemshop.repository.ShopRepository;
import pl.ziutek.itemshop.repository.ShopModeRepository; // DODANO IMPORT
import pl.ziutek.itemshop.service.StorefrontService;
import com.stripe.Stripe;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/storefront")
public class StorefrontController {

    @Autowired
    private ShopRepository shopRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private PendingItemRepository itemRepository;
    @Autowired
    private DailyRewardRepository dailyRewardRepository;

    @Autowired
    private ShopModeRepository shopModeRepository; // DODANE REPOZYTORIUM

    @Autowired
    private StorefrontService storefrontService;

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    public record TopDonatorDTO(String nick, BigDecimal amount) {}
    public record RecentPurchaseDTO(String nick, String item, String time) {}
    public record ShopInfoDTO(String serverName, String serverIp, String theme, String discordLink, String bannerText, String termsContent) {} {}

    // 0. Pobieranie podstawowych informacji o sklepie
    @GetMapping("/{serverName}/info")
    public ResponseEntity<?> getShopInfo(@PathVariable String serverName) {
        Optional<Shop> shopOpt = storefrontService.findShopByServerName(serverName);
        if (shopOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Nie znaleziono sklepu!");

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(storefrontService.getShopInfoDto(serverName));
    }

    // 1. Pobieranie produktów
    @GetMapping("/{serverName}/produkty")
    public ResponseEntity<?> getProducts(@PathVariable String serverName) {
        Optional<Shop> shopOpt = storefrontService.findShopByServerName(serverName);

        if (shopOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Nie znaleziono sklepu!");
        }

        List<Product> products = storefrontService.getProductsForShop(shopOpt.get());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(products);
    }

    // 1.5. POBIERANIE TRYBÓW (NOWOŚĆ DLA STRONY GŁÓWNEJ GRACZA)
    @GetMapping("/{serverName}/tryby")
    public ResponseEntity<?> getShopModesPublic(@PathVariable String serverName) {
        Optional<Shop> shopOpt = storefrontService.findShopByServerName(serverName);

        if (shopOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Nie znaleziono sklepu!");
        }

        // Zwraca listę trybów (z nazwami, opisami i linkami do zdjęć) z bazy
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(storefrontService.getModesForShop(shopOpt.get()));
    }

    // 2. Proces zakupu
    @PostMapping("/{serverName}/checkout")
    public ResponseEntity<?> createProductCheckout(
            @PathVariable String serverName,
            @RequestParam Long productId,
            @RequestParam String nick,
            @RequestParam(required = false) String mode,
            HttpServletRequest request
    ) {
        if (nick == null || nick.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Błąd: Nick gracza nie może być pusty!");
        }

        Shop shop = shopRepository.findByServerNameIgnoreCase(serverName)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono sklepu!"));

        Optional<Product> productOpt = productRepository.findById(productId);
        if (productOpt.isEmpty()) return ResponseEntity.badRequest().body("Produkt nie istnieje!");
        Product product = productOpt.get();

        if (!product.getShop().getId().equals(shop.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Produkt nie należy do tego sklepu.");
        }

        Stripe.apiKey = stripeApiKey;
        long amount = Math.max(0, Math.round(product.getPrice() * 100.0));

        String effectiveMode = (mode != null && !mode.isBlank()) ? mode.trim().toLowerCase() : product.getMode();

        // Powrót po Stripe na właściwy sklep (custom domain) lub dev (localhost z parametrem serverName)
        String successUrl;
        String cancelUrl;
        if (shop.getCustomDomain() != null && !shop.getCustomDomain().isBlank()) {
            String base = "https://" + shop.getCustomDomain().trim();
            successUrl = base + "/shop/" + effectiveMode + "?payment=success";
            cancelUrl = base + "/shop/" + effectiveMode + "?payment=cancel";
        } else {
            // Dev fallback: bez subdomeny, więc kierujemy na /{theme}/shop/{mode} i dopinamy serverName w query.
            String base = "http://localhost:3000";
            String theme = (shop.getTheme() != null && !shop.getTheme().isBlank()) ? shop.getTheme().trim().toLowerCase() : "default";
            String qs = "serverName=" + shop.getServerName().toLowerCase() + "&payment=";
            successUrl = base + "/" + theme + "/shop/" + effectiveMode + "?" + qs + "success";
            cancelUrl = base + "/" + theme + "/shop/" + effectiveMode + "?" + qs + "cancel";
        }

        try {
            SessionCreateParams params = SessionCreateParams.builder()
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.BLIK)
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(successUrl)
                    .setCancelUrl(cancelUrl)
                    .putMetadata("type", "product_purchase")
                    .putMetadata("serverName", shop.getServerName())
                    .putMetadata("productId", product.getId().toString())
                    .putMetadata("nick", nick.trim())
                    .putMetadata("mode", effectiveMode)
                    .addLineItem(
                            SessionCreateParams.LineItem.builder()
                                    .setQuantity(1L)
                                    .setPriceData(
                                            SessionCreateParams.LineItem.PriceData.builder()
                                                    .setCurrency("pln")
                                                    .setUnitAmount(amount)
                                                    .setProductData(
                                                            SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                    .setName(product.getName())
                                                                    .build()
                                                    )
                                                    .build()
                                    )
                                    .build()
                    )
                    .build();

            Session session = Session.create(params);
            return ResponseEntity.ok(java.util.Map.of("url", session.getUrl()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Błąd generowania płatności.");
        }
    }

    // 3. DYNAMICZNA TOPKA
    @GetMapping("/{serverName}/top-donatorzy")
    public ResponseEntity<List<TopDonatorDTO>> getTopDonators(@PathVariable String serverName) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(storefrontService.getTopDonators(serverName));
    }

    // 4. OSTATNIE ZAKUPY
    @GetMapping("/{serverName}/ostatnie-zakupy")
    public ResponseEntity<List<RecentPurchaseDTO>> getRecentPurchases(@PathVariable String serverName) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(storefrontService.getRecentPurchases(serverName));
    }

    // --- KLUCZOWA POPRAWKA: NAGRODA Z UWZGLĘDNIENIEM TRYBU I LICZNIKA ---
    @PostMapping("/{serverName}/nagroda")
    public ResponseEntity<?> claimDailyReward(
            @PathVariable String serverName,
            @RequestParam String nick,
            @RequestParam(required = false) String mode) {

        // Normalizacja mode (małe litery, domyślnie survival)
        String activeMode = (mode != null && !mode.isEmpty()) ? mode.toLowerCase() : "survival";

        Shop shop = shopRepository.findByServerNameIgnoreCase(serverName)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono sklepu: " + serverName));

        // Sprawdzanie nagrody w bazie (Nick + Sklep + TRYB)
        Optional<DailyReward> rewardOpt = dailyRewardRepository.findByPlayerNameAndServerNameAndModeIgnoreCase(nick, serverName, activeMode);
        LocalDateTime now = LocalDateTime.now();

        if (rewardOpt.isPresent()) {
            LocalDateTime nextAvailable = rewardOpt.get().getLastClaimed().plusHours(24);
            if (now.isBefore(nextAvailable)) {
                long totalSeconds = java.time.Duration.between(now, nextAvailable).getSeconds();
                long h = totalSeconds / 3600;
                long m = (totalSeconds % 3600) / 60;
                long s = totalSeconds % 60;

                // Wysyłamy format HH:mm:ss dla Reactowego licznika
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body("Odebrałeś już bonus. Spróbuj za: " + String.format("%02d:%02d:%02d", h, m, s));
            }
        }

        // Aktualizacja lub stworzenie nowego rekordu nagrody
        DailyReward reward = rewardOpt.orElse(new DailyReward());
        reward.setPlayerName(nick);
        reward.setServerName(serverName);
        reward.setMode(activeMode);
        reward.setLastClaimed(now);
        dailyRewardRepository.save(reward);

        // Dodanie nagrody do magazynu
        String command = shop.getDailyRewardCommand() != null ? shop.getDailyRewardCommand() : "give " + nick + " emerald 1";
        String rewardName = shop.getDailyRewardName() != null ? shop.getDailyRewardName() : "Darmowy Bonus 24h";

        PendingItem dailyItem = new PendingItem();
        dailyItem.setPlayerName(nick);
        dailyItem.setShop(shop);
        dailyItem.setItemName(rewardName);
        dailyItem.setRewardCommand(command.replace("{player}", nick));
        dailyItem.setMode(activeMode);
        dailyItem.setClaimed(false);
        itemRepository.save(dailyItem);

        return ResponseEntity.ok("Nagroda przyznana!");
    }

    @GetMapping("/identify")
    public ResponseEntity<?> identifyShop(HttpServletRequest request) {
        String host = request.getServerName();
        Optional<Shop> shop = shopRepository.findByCustomDomain(host);
        if (shop.isEmpty() && host.contains(".localhost")) {
            String serverName = host.split("\\.")[0];
            shop = shopRepository.findByServerNameIgnoreCase(serverName);
        }
        return shop.map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/{serverName}/magazyn/{playerName}")
    public ResponseEntity<List<PendingItem>> getMagazyn(
            @PathVariable String serverName,
            @PathVariable String playerName,
            @RequestParam String mode,
            @RequestHeader("X-API-Key") String apiKey) {

        Shop shop = shopRepository.findByServerNameIgnoreCase(serverName)
                .orElseThrow(() -> new RuntimeException("Sklep nie istnieje"));

        if (!shop.getApiKey().equals(apiKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<PendingItem> items = itemRepository.findByShopAndPlayerNameAndModeIgnoreCaseAndClaimedFalse(shop, playerName, mode);
        return ResponseEntity.ok(items);
    }

    @PostMapping("/{serverName}/magazyn/odbierz/{itemId}")
    public ResponseEntity<?> markAsClaimed(
            @PathVariable String serverName,
            @PathVariable Long itemId,
            @RequestHeader("X-API-Key") String apiKey) {

        Shop shop = shopRepository.findByServerNameIgnoreCase(serverName)
                .orElseThrow(() -> new RuntimeException("Sklep nie istnieje"));

        if (!shop.getApiKey().equals(apiKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Błędny klucz API!");
        }

        PendingItem item = itemRepository.findById(itemId).orElse(null);
        if (item != null && !item.isClaimed() && item.getShop().getId().equals(shop.getId())) {
            item.setClaimed(true);
            itemRepository.save(item);
            return ResponseEntity.ok("Zaktualizowano status.");
        }
        return ResponseEntity.badRequest().body("Błąd zmiany statusu.");
    }
}