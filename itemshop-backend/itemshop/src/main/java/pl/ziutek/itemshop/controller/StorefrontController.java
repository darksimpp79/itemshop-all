package pl.ziutek.itemshop.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
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
import pl.ziutek.itemshop.repository.PlayerWalletRepository;
import pl.ziutek.itemshop.model.PlayerWallet;
import pl.ziutek.itemshop.service.StorefrontService;
import com.stripe.Stripe;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/storefront")
public class StorefrontController {

    // Regex dla nicku Minecraft: 3–16 znaków, litery/cyfry/podkreślnik
    private static final String NICK_REGEX = "^[a-zA-Z0-9_]{3,16}$";

    @Autowired private ShopRepository shopRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private PendingItemRepository itemRepository;
    @Autowired private DailyRewardRepository dailyRewardRepository;
    @Autowired private PlayerWalletRepository playerWalletRepository;
    @Autowired private pl.ziutek.itemshop.repository.LootboxRewardRepository lootboxRewardRepository;
    @Autowired private StorefrontService storefrontService;

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    public record TopDonatorDTO(String nick, BigDecimal amount) {}
    public record RecentPurchaseDTO(String nick, String item, String time) {}
    public record ShopInfoDTO(String serverName, String serverIp, String theme, String discordLink, String bannerText, String termsContent) {}

    // --- Helpers ---

    private boolean isValidNick(String nick) {
        return nick != null && nick.matches(NICK_REGEX);
    }

    // Timing-safe porównanie API key — zapobiega timing attack
    private boolean apiKeyMatches(String stored, String provided) {
        if (stored == null || provided == null) return false;
        return MessageDigest.isEqual(
                stored.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8)
        );
    }

    // 0. Podstawowe informacje o sklepie
    @GetMapping("/{serverName}/info")
    public ResponseEntity<?> getShopInfo(@PathVariable String serverName) {
        Optional<Shop> shopOpt = storefrontService.findShopByServerName(serverName);
        if (shopOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Nie znaleziono sklepu!");
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(storefrontService.getShopInfoDto(serverName));
    }

    // 1. Produkty
    @GetMapping("/{serverName}/produkty")
    public ResponseEntity<?> getProducts(@PathVariable String serverName) {
        Optional<Shop> shopOpt = storefrontService.findShopByServerName(serverName);
        if (shopOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Nie znaleziono sklepu!");
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(storefrontService.getProductsForShop(shopOpt.get()));
    }

    // 1.5. Tryby
    @GetMapping("/{serverName}/tryby")
    public ResponseEntity<?> getShopModesPublic(@PathVariable String serverName) {
        Optional<Shop> shopOpt = storefrontService.findShopByServerName(serverName);
        if (shopOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Nie znaleziono sklepu!");
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(storefrontService.getModesForShop(shopOpt.get()));
    }

    // 2. Checkout
    @PostMapping("/{serverName}/checkout")
    public ResponseEntity<?> createProductCheckout(
            @PathVariable String serverName,
            @RequestParam Long productId,
            @RequestParam String nick,
            @RequestParam(required = false) String mode,
            HttpServletRequest request
    ) {
        // Walidacja nicku — zapobiega command injection
        if (!isValidNick(nick)) {
            return ResponseEntity.badRequest()
                    .body("Nieprawidłowy nick! Dozwolone: litery, cyfry, podkreślnik (3–16 znaków).");
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

        String origin = request.getHeader("Origin");
        if (origin == null || origin.isBlank()) {
            String referer = request.getHeader("Referer");
            if (referer != null && referer.startsWith("http")) {
                int idx = referer.indexOf("/", 8); // znajdź pierwszy '/' po 'https://'
                origin = (idx != -1) ? referer.substring(0, idx) : referer;
            }
        }

        String successUrl;
        String cancelUrl;

        if (origin != null && !origin.isBlank()) {
            successUrl = origin + "/shop/" + effectiveMode + "?payment=success";
            cancelUrl  = origin + "/shop/" + effectiveMode + "?payment=cancel";
        } else if (shop.getCustomDomain() != null && !shop.getCustomDomain().isBlank()) {
            String base = "https://" + shop.getCustomDomain().trim();
            successUrl = base + "/shop/" + effectiveMode + "?payment=success";
            cancelUrl  = base + "/shop/" + effectiveMode + "?payment=cancel";
        } else {
            String base  = "http://localhost:3000";
            String theme = (shop.getTheme() != null && !shop.getTheme().isBlank()) ? shop.getTheme().trim().toLowerCase() : "default";
            String qs    = "serverName=" + shop.getServerName().toLowerCase() + "&payment=";
            successUrl   = base + "/" + theme + "/shop/" + effectiveMode + "?" + qs + "success";
            cancelUrl    = base + "/" + theme + "/shop/" + effectiveMode + "?" + qs + "cancel";
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
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency("pln")
                                    .setUnitAmount(amount)
                                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName(product.getName())
                                            .build())
                                    .build())
                            .build())
                    .build();

            Session session = Session.create(params);
            return ResponseEntity.ok(java.util.Map.of("url", session.getUrl()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Błąd generowania płatności.");
        }
    }

    // 3. Top donatorzy
    @GetMapping("/{serverName}/top-donatorzy")
    public ResponseEntity<List<TopDonatorDTO>> getTopDonators(@PathVariable String serverName) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(storefrontService.getTopDonators(serverName));
    }

    // 4. Ostatnie zakupy
    @GetMapping("/{serverName}/ostatnie-zakupy")
    public ResponseEntity<List<RecentPurchaseDTO>> getRecentPurchases(@PathVariable String serverName) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(storefrontService.getRecentPurchases(serverName));
    }

    // 5. Nagroda dzienna — @Transactional chroni przed race condition
    @Transactional
    @PostMapping("/{serverName}/nagroda")
    public ResponseEntity<?> claimDailyReward(
            @PathVariable String serverName,
            @RequestParam String nick,
            @RequestParam(required = false) String mode) {

        // Walidacja nicku
        if (!isValidNick(nick)) {
            return ResponseEntity.badRequest()
                    .body("Nieprawidłowy nick! Dozwolone: litery, cyfry, podkreślnik (3–16 znaków).");
        }

        String activeMode = (mode != null && !mode.isEmpty()) ? mode.toLowerCase() : "survival";

        Shop shop = shopRepository.findByServerNameIgnoreCase(serverName)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono sklepu: " + serverName));

        Optional<DailyReward> rewardOpt = dailyRewardRepository
                .findByPlayerNameAndServerNameAndModeIgnoreCase(nick, serverName, activeMode);
        LocalDateTime now = LocalDateTime.now();

        if (rewardOpt.isPresent()) {
            LocalDateTime nextAvailable = rewardOpt.get().getLastClaimed().plusHours(24);
            if (now.isBefore(nextAvailable)) {
                long totalSeconds = java.time.Duration.between(now, nextAvailable).getSeconds();
                long h = totalSeconds / 3600;
                long m = (totalSeconds % 3600) / 60;
                long s = totalSeconds % 60;
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body("Odebrałeś już bonus. Spróbuj za: " + String.format("%02d:%02d:%02d", h, m, s));
            }
        }

        DailyReward reward = rewardOpt.orElse(new DailyReward());
        reward.setPlayerName(nick);
        reward.setServerName(serverName);
        reward.setMode(activeMode);
        reward.setLastClaimed(now);
        dailyRewardRepository.save(reward);

        String command   = shop.getDailyRewardCommand() != null ? shop.getDailyRewardCommand() : "give {player} emerald 1";
        String rewardName = shop.getDailyRewardName() != null ? shop.getDailyRewardName() : "Darmowy Bonus 24h";

        PendingItem dailyItem = new PendingItem();
        dailyItem.setPlayerName(nick);
        dailyItem.setShop(shop);
        dailyItem.setItemName(rewardName);
        // nick jest już zwalidowany regex'em — bezpieczne podstawienie
        dailyItem.setRewardCommand(command.replace("{player}", nick));
        dailyItem.setMode(activeMode);
        dailyItem.setClaimed(false);
        itemRepository.save(dailyItem);

        return ResponseEntity.ok("Nagroda przyznana!");
    }

    // 6. Portfel gracza
    @GetMapping("/{serverName}/wallet/{nick}")
    public ResponseEntity<?> getPlayerWallet(@PathVariable String serverName, @PathVariable String nick) {
        if (!isValidNick(nick)) {
            return ResponseEntity.badRequest().body("Nieprawidłowy nick.");
        }
        Optional<PlayerWallet> walletOpt = playerWalletRepository.findByNicknameIgnoreCase(nick.trim());
        int points = walletOpt.map(PlayerWallet::getPoints).orElse(0);
        return ResponseEntity.ok(java.util.Map.of("points", points));
    }

    // 7. Otwieranie Lootboxa
    @Transactional
    @PostMapping("/{serverName}/lootbox/{nick}")
    public ResponseEntity<?> openLootbox(
            @PathVariable String serverName,
            @PathVariable String nick,
            @RequestParam(required = false) String mode) {
        if (!isValidNick(nick)) {
            return ResponseEntity.badRequest().body("Nieprawidłowy nick.");
        }

        Shop shop = shopRepository.findByServerNameIgnoreCase(serverName)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono sklepu: " + serverName));

        PlayerWallet wallet = playerWalletRepository.findByNicknameIgnoreCase(nick.trim())
                .orElse(null);

        int cost = 500;
        if (wallet == null || wallet.getPoints() < cost) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Zbyt mało punktów! Skrzynka kosztuje " + cost + " pkt.");
        }

        // Pobieramy punkty
        wallet.setPoints(wallet.getPoints() - cost);
        playerWalletRepository.save(wallet);

        // Pobranie nagród z bazy dla tego sklepu
        List<pl.ziutek.itemshop.model.LootboxReward> dbRewards = lootboxRewardRepository.findByShop(shop);
        
        String command;
        String rewardName;
        
        if (dbRewards.isEmpty()) {
            // Fallback, jeśli sklep nie skonfigurował nagród
            String[] rewards = {
                    "give {player} diamond 5",
                    "give {player} emerald 10",
                    "give {player} iron_ingot 64",
                    "give {player} golden_apple 2",
                    "give {player} netherite_ingot 1"
            };
            String[] rewardNames = {
                    "5x Diament",
                    "10x Szmaragd",
                    "64x Żelazo",
                    "2x Złote Jabłko",
                    "1x Netherite"
            };
            int randomIndex = new java.util.Random().nextInt(rewards.length);
            command = rewards[randomIndex];
            rewardName = rewardNames[randomIndex];
        } else {
            // Ważone losowanie nagród
            int totalWeight = dbRewards.stream().mapToInt(r -> r.getWeight() != null ? r.getWeight() : 1).sum();
            int randomValue = new java.util.Random().nextInt(totalWeight);
            int currentWeightSum = 0;
            
            pl.ziutek.itemshop.model.LootboxReward selectedReward = dbRewards.get(0); // fallback
            for (pl.ziutek.itemshop.model.LootboxReward r : dbRewards) {
                int w = r.getWeight() != null ? r.getWeight() : 1;
                currentWeightSum += w;
                if (randomValue < currentWeightSum) {
                    selectedReward = r;
                    break;
                }
            }
            
            command = selectedReward.getCommand();
            rewardName = selectedReward.getName();
        }
        String activeMode = (mode != null && !mode.isEmpty()) ? mode.toLowerCase() : "survival";

        // Dodanie przedmiotu do pending items (do odebrania na serwerze)
        PendingItem boxItem = new PendingItem();
        boxItem.setPlayerName(nick.trim());
        boxItem.setShop(shop);
        boxItem.setItemName("Lootbox: " + rewardName);
        boxItem.setRewardCommand(command.replace("{player}", nick.trim()));
        boxItem.setMode(activeMode);
        boxItem.setClaimed(false);
        itemRepository.save(boxItem);

        return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "reward", rewardName,
                "message", "Wylosowano: " + rewardName + "! Przedmiot czeka w /magazyn na trybie " + activeMode
        ));
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

    // Endpoint dla pluginu MC — timing-safe porównanie klucza API
    @GetMapping("/{serverName}/magazyn/{playerName}")
    public ResponseEntity<List<PendingItem>> getMagazyn(
            @PathVariable String serverName,
            @PathVariable String playerName,
            @RequestParam String mode,
            @RequestHeader("X-API-Key") String apiKey) {

        Shop shop = shopRepository.findByServerNameIgnoreCase(serverName)
                .orElseThrow(() -> new RuntimeException("Sklep nie istnieje"));

        if (!apiKeyMatches(shop.getApiKey(), apiKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<PendingItem> items = itemRepository
                .findByShopAndPlayerNameAndModeIgnoreCaseAndClaimedFalse(shop, playerName, mode);
        return ResponseEntity.ok(items);
    }

    @PostMapping("/{serverName}/magazyn/odbierz/{itemId}")
    public ResponseEntity<?> markAsClaimed(
            @PathVariable String serverName,
            @PathVariable Long itemId,
            @RequestHeader("X-API-Key") String apiKey) {

        Shop shop = shopRepository.findByServerNameIgnoreCase(serverName)
                .orElseThrow(() -> new RuntimeException("Sklep nie istnieje"));

        if (!apiKeyMatches(shop.getApiKey(), apiKey)) {
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