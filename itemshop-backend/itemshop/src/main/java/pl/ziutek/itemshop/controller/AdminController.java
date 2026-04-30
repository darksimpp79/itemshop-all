package pl.ziutek.itemshop.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pl.ziutek.itemshop.dto.PageableResponse;
import pl.ziutek.itemshop.model.*;
import pl.ziutek.itemshop.repository.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    @Autowired private ShopRepository shopRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private OwnerRepository ownerRepository;
    @Autowired private PendingItemRepository itemRepository;
    @Autowired private ShopModeRepository shopModeRepository;
    @Autowired private pl.ziutek.itemshop.service.DnsVerificationService dnsVerificationService;
    @Autowired private pl.ziutek.itemshop.repository.LootboxRewardRepository lootboxRewardRepository;
    @Autowired private pl.ziutek.itemshop.repository.PromoCodeRepository promoCodeRepository;
    @Autowired private CacheManager cacheManager;

    // ══ SKLEP ══

    @PostMapping("/sklep")
    public ResponseEntity<?> zalozSklep(@RequestParam String serverName) {
        String ownerEmail = currentEmail();
        Owner owner = ownerRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new RuntimeException("Błąd autoryzacji!"));

        List<Shop> existingShops = shopRepository.findByOwnerEmail(ownerEmail);
        String plan = owner.getSubscriptionPlan();
        int shopLimit = switch (plan) {
            case "PRO" -> Integer.MAX_VALUE;
            case "STARTER" -> 3;
            default -> 1;
        };
        if (existingShops.size() >= shopLimit) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Plan " + plan + " pozwala na max " + shopLimit + " sklep(y). Ulepsz plan, aby dodać więcej.");
        }

        // Zapytanie DB zamiast findAll() — zero ładowania wszystkich sklepów do RAM
        if (shopRepository.findByServerNameIgnoreCase(serverName).isPresent()) {
            return ResponseEntity.badRequest().body("Serwer o takiej nazwie już istnieje!");
        }

        Shop shop = new Shop();
        shop.setServerName(serverName);
        shop.setOwner(owner);
        return ResponseEntity.ok(shopRepository.save(shop));
    }

    @GetMapping("/moje-sklepy")
    public ResponseEntity<?> getMyShops() {
        return ResponseEntity.ok(shopRepository.findByOwnerEmail(currentEmail()));
    }

    @PutMapping("/sklep/ip")
    public ResponseEntity<?> updateShopIp(@RequestHeader("X-API-Key") String apiKey, @RequestParam String serverIp) {
        return withOwnedShop(apiKey, shop -> {
            shop.setServerIp(serverIp);
            shopRepository.save(shop);
            return ResponseEntity.ok("IP zaktualizowane");
        });
    }

    @PutMapping("/sklep/motyw")
    public ResponseEntity<?> updateShopTheme(@RequestHeader("X-API-Key") String apiKey, @RequestParam String theme) {
        return withOwnedShop(apiKey, shop -> {
            String ownerPlan = shop.getOwner().getSubscriptionPlan();
            boolean themeAllowed = switch (ownerPlan) {
                case "PRO" -> true;
                case "STARTER" -> List.of("default","dark","forest","ocean").contains(theme);
                default -> "default".equals(theme);
            };
            if (!themeAllowed) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Motyw '" + theme + "' niedostępny w planie " + ownerPlan + ".");
            }
            shop.setTheme(theme);
            shopRepository.save(shop);
            return ResponseEntity.ok("Motyw zaktualizowany!");
        });
    }

    @PatchMapping("/shops/{id}/settings")
    public ResponseEntity<?> updateShopSettings(@PathVariable Long id, @RequestBody Map<String, String> updates) {
        return shopRepository.findById(id).map(shop -> {
            if (!shop.getOwner().getEmail().equalsIgnoreCase(currentEmail())) {
                return ResponseEntity.<Object>status(HttpStatus.FORBIDDEN).build();
            }
            if (updates.containsKey("dailyRewardName"))  shop.setDailyRewardName(updates.get("dailyRewardName"));
            if (updates.containsKey("discordLink"))       shop.setDiscordLink(updates.get("discordLink"));
            if (updates.containsKey("bannerText"))        shop.setBannerText(updates.get("bannerText"));
            if (updates.containsKey("termsContent"))      shop.setTermsContent(updates.get("termsContent"));
            if (updates.containsKey("dailyRewardCommand")) {
                String cmd = updates.get("dailyRewardCommand");
                if (cmd != null && cmd.length() > 512) {
                    return ResponseEntity.<Object>badRequest().body("Komenda jest zbyt długa (max 512 znaków).");
                }
                shop.setDailyRewardCommand(cmd);
            }
            shopRepository.save(shop);
            evictShopInfoCache(shop);
            return ResponseEntity.<Object>ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/custom-domain")
    public ResponseEntity<?> setCustomDomain(
            @RequestParam String customDomain,
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).body("Brak API Key!");

        return withOwnedShop(apiKey, shop -> {
            if (!"PRO".equals(shop.getOwner().getSubscriptionPlan())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("CustomDomain dostępny tylko w planie PRO.");
            }
            String validationError = validateCustomDomain(customDomain);
            if (validationError != null) return ResponseEntity.badRequest().body(validationError);

            String normalized = customDomain.trim().toLowerCase();
            Optional<Shop> existing = shopRepository.findByCustomDomain(normalized);
            if (existing.isPresent() && !existing.get().getId().equals(shop.getId())) {
                return ResponseEntity.badRequest().body("Domena jest już zajęta przez inny sklep.");
            }
            
            // DNS Verification
            boolean verified = dnsVerificationService.verifyDomain(normalized);
            if (!verified) {
                return ResponseEntity.badRequest().body("Weryfikacja DNS nie powiodła się. Upewnij się, że dodałeś rekord CNAME zgodnie z instrukcją i poczekaj na propagację.");
            }

            shop.setCustomDomain(normalized);
            shopRepository.save(shop);
            return ResponseEntity.ok(Map.of("message", "Domena zweryfikowana i ustawiona!", "domain", normalized));
        });
    }

    // ══ PRODUKTY ══

    @PostMapping("/produkt")
    public ResponseEntity<?> dodajProdukt(@RequestHeader("X-API-Key") String apiKey, @RequestBody Product product) {
        return withOwnedShop(apiKey, shop -> {
            String prodPlan = shop.getOwner().getSubscriptionPlan();
            int prodLimit = switch (prodPlan) {
                case "PRO" -> Integer.MAX_VALUE;
                case "STARTER" -> 30;
                default -> 5;
            };
            long currentCount = productRepository.countByShop(shop);
            if (currentCount >= prodLimit) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Plan " + prodPlan + " pozwala na max " + prodLimit + " produktów. Ulepsz plan, aby dodać więcej.");
            }
            product.setShop(shop);
            productRepository.save(product);
            evictShopProductCache(shop);
            return ResponseEntity.ok("Produkt dodany!");
        });
    }

    @GetMapping("/produkty")
    public ResponseEntity<?> getShopProducts(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).body("Brak klucza API!");
        return withOwnedShop(apiKey, shop ->
                ResponseEntity.ok(productRepository.findByShopOrderByPositionAsc(shop))
        );
    }

    // FIX: @Transactional — pętla save() jest atomowa; błąd w połowie nie zostawi częściowej aktualizacji
    @PutMapping("/produkty/kolejnosc")
    @Transactional
    public ResponseEntity<?> updateProductOrder(
            @RequestHeader("X-API-Key") String apiKey,
            @RequestBody List<Map<String, Object>> orderData
    ) {
        return withOwnedShop(apiKey, shop -> {
            for (Map<String, Object> item : orderData) {
                Long productId = Long.valueOf(item.get("id").toString());
                int position   = Integer.parseInt(item.get("position").toString());
                productRepository.findById(productId).ifPresent(product -> {
                    if (product.getShop().getId().equals(shop.getId())) {
                        product.setPosition(position);
                        productRepository.save(product);
                    }
                });
            }
            evictShopProductCache(shop);
            return ResponseEntity.ok("Kolejność zaktualizowana!");
        });
    }

    @DeleteMapping("/produkt/{id}")
    public ResponseEntity<?> usunProdukt(@PathVariable Long id) {
        Optional<Product> prodOpt = productRepository.findById(id);
        if (prodOpt.isEmpty()) return ResponseEntity.notFound().build();
        Shop shop = prodOpt.get().getShop();
        if (!shop.getOwner().getEmail().equalsIgnoreCase(currentEmail())) {
            return ResponseEntity.status(403).body("Brak uprawnień!");
        }
        productRepository.delete(prodOpt.get());
        evictShopProductCache(shop);
        return ResponseEntity.ok("Usunięto produkt");
    }

    // ══ ZAMÓWIENIA (z paginacją) ══

    /**
     * FIX: paginacja — nie ładujemy wszystkich zamówień do RAM.
     * Domyślnie strona 0, 20 rekordów, sortowanie po id DESC (najnowsze pierwsze).
     * Frontend może przekazać ?page=0&size=50 aby kontrolować paginację.
     */
    @GetMapping("/zamowienia")
    public ResponseEntity<?> getZamowienia(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).build();

        final int cappedSize = Math.min(size, 100); // ← effectively final, można użyć w lambdzie

        return withOwnedShop(apiKey, shop -> {
            PageRequest pageRequest = PageRequest.of(page, cappedSize, Sort.by(Sort.Direction.DESC, "id"));
            Page<PendingItem> pageResult = itemRepository.findByShop(shop, pageRequest);
            return ResponseEntity.ok(PageableResponse.of(pageResult));
        });
    }
    @GetMapping("/zamowienia/export")
    public ResponseEntity<byte[]> exportOrdersCsv(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).build();

        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);
        if (shopOpt.isEmpty() || !shopOpt.get().getOwner().getEmail().equalsIgnoreCase(currentEmail())) {
            return ResponseEntity.status(403).build();
        }

        // Export pobiera wszystko — akceptowalne dla CSV bo to jednorazowa operacja,
        // ale dla bardzo dużych sklepów warto w przyszłości streamować
        List<PendingItem> items = itemRepository.findByShop(shopOpt.get());
        StringBuilder csv = new StringBuilder();
        csv.append("ID,Nick Gracza,Produkt,Tryb,Status,Komenda\n");
        for (PendingItem item : items) {
            csv.append(item.getId()).append(",")
                    .append(escapeCsv(item.getPlayerName())).append(",")
                    .append(escapeCsv(item.getItemName())).append(",")
                    .append(escapeCsv(item.getMode())).append(",")
                    .append(item.isClaimed() ? "Zrealizowano" : "Oczekuje").append(",")
                    .append(escapeCsv(item.getRewardCommand())).append("\n");
        }

        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        byte[] bom   = new byte[]{(byte)0xEF, (byte)0xBB, (byte)0xBF};
        byte[] result = new byte[bom.length + bytes.length];
        System.arraycopy(bom, 0, result, 0, bom.length);
        System.arraycopy(bytes, 0, result, bom.length, bytes.length);

        String shopName = shopOpt.get().getServerName().replaceAll("[^a-zA-Z0-9]", "_");
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"zamowienia_" + shopName + ".csv\"")
                .header("Content-Type", "text/csv; charset=UTF-8")
                .body(result);
    }

    // ══ STATYSTYKI ══

    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).build();

        return withOwnedShop(apiKey, shop -> {
            long totalOrders   = itemRepository.countByShop(shop);
            long claimedOrders = itemRepository.countByShopAndClaimed(shop, true);
            double revenue     = itemRepository.sumRevenueByShop(shop);
            long uniquePlayers = itemRepository.countDistinctPlayersByShop(shop);

            return ResponseEntity.ok(Map.of(
                    "totalOrders", totalOrders,
                    "claimedOrders", claimedOrders,
                    "totalRevenue", revenue,
                    "uniquePlayers", uniquePlayers
            ));
        });
    }

    @GetMapping("/stats/chart")
    public ResponseEntity<?> getChartData(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).build();

        return withOwnedShop(apiKey, shop -> {
            List<Product> products = productRepository.findByShop(shop);
            Map<String, Double> priceMap = buildPriceMap(products);

            LocalDateTime since = LocalDate.now().minusDays(6).atStartOfDay();
            List<PendingItem> recentItems = itemRepository.findByShopAndCreatedAtAfter(shop, since);

            String[] dayLabels = {"Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"};
            LocalDate today = LocalDate.now();
            List<Map<String, Object>> chartData = new ArrayList<>();

            for (int i = 6; i >= 0; i--) {
                LocalDate day = today.minusDays(i);
                LocalDateTime start = day.atStartOfDay();
                LocalDateTime end   = day.plusDays(1).atStartOfDay();

                List<PendingItem> dayItems = recentItems.stream()
                        .filter(item -> !item.getCreatedAt().isBefore(start)
                                && item.getCreatedAt().isBefore(end))
                        .collect(Collectors.toList());

                double dayRevenue = dayItems.stream()
                        .filter(PendingItem::isClaimed)
                        .mapToDouble(item -> priceMap.getOrDefault(item.getItemName(), 0.0))
                        .sum();

                Map<String, Object> point = new LinkedHashMap<>();
                point.put("date", dayLabels[day.getDayOfWeek().getValue() - 1]);
                point.put("revenue", dayRevenue);
                point.put("orders", dayItems.size());
                chartData.add(point);
            }

            return ResponseEntity.ok(chartData);
        });
    }

    // ══ TRYBY ══

    @GetMapping("/tryby")
    public ResponseEntity<?> getShopModes(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).build();
        return withOwnedShop(apiKey, shop -> ResponseEntity.ok(shopModeRepository.findByShop(shop)));
    }

    @PostMapping("/tryb")
    public ResponseEntity<?> saveShopMode(@RequestHeader("X-API-Key") String apiKey, @RequestBody ShopMode mode) {
        return withOwnedShop(apiKey, shop -> {
            String modePlan = shop.getOwner().getSubscriptionPlan();
            List<ShopMode> existingModes = shopModeRepository.findByShop(shop);
            int modeLimit = switch (modePlan) {
                case "PRO" -> Integer.MAX_VALUE;
                case "STARTER" -> 3;
                default -> 1; // FREE
            };
            if (mode.getId() == null && existingModes.size() >= modeLimit) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Plan " + modePlan + " pozwala na max " + modeLimit + " tryb(ów) gry.");
            }
            mode.setShop(shop);
            shopModeRepository.save(mode);
            evictShopModeCache(shop);
            return ResponseEntity.ok("Tryb zapisany!");
        });
    }

    @DeleteMapping("/tryb/{id}")
    public ResponseEntity<?> deleteShopMode(@PathVariable Long id) {
        Optional<ShopMode> modeOpt = shopModeRepository.findById(id);
        if (modeOpt.isEmpty()) return ResponseEntity.notFound().build();
        Shop shop = modeOpt.get().getShop();
        if (!shop.getOwner().getEmail().equalsIgnoreCase(currentEmail())) {
            return ResponseEntity.status(403).build();
        }
        shopModeRepository.delete(modeOpt.get());
        evictShopModeCache(shop);
        return ResponseEntity.ok("Tryb usunięty");
    }

    // ══ USER PROFILE ══

    @GetMapping("/user/profile")
    public ResponseEntity<?> getUserProfile() {
        return ownerRepository.findByEmail(currentEmail())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/user/profile")
    public ResponseEntity<?> updateUserProfile(@RequestBody Map<String, String> body) {
        return ownerRepository.findByEmail(currentEmail()).map(owner -> {
            if (body.containsKey("firstName")) owner.setFirstName(body.get("firstName"));
            if (body.containsKey("lastName"))  owner.setLastName(body.get("lastName"));
            if (body.containsKey("phoneNumber")) owner.setPhoneNumber(body.get("phoneNumber"));
            ownerRepository.save(owner);
            return ResponseEntity.ok(owner);
        }).orElse(ResponseEntity.notFound().build());
    }



    // ══ Helpers ══

    private String currentEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    /**
     * Wzorzec wyciągający sklep po API key i weryfikujący właściciela.
     * Eliminuje duplikację kodu auth w każdym endpoincie.
     */
    private ResponseEntity<?> withOwnedShop(String apiKey, java.util.function.Function<Shop, ResponseEntity<?>> action) {
        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);
        if (shopOpt.isEmpty()) return ResponseEntity.status(401).body("Nieautoryzowany klucz API!");
        if (!shopOpt.get().getOwner().getEmail().equalsIgnoreCase(currentEmail())) {
            return ResponseEntity.status(403).body("Brak dostępu do tego sklepu!");
        }
        try {
            return action.apply(shopOpt.get());
        } catch (Exception e) {
            log.error("[Admin] Błąd operacji: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Błąd serwera: " + e.getMessage());
        }
    }

    private Map<String, Double> buildPriceMap(List<Product> products) {
        return products.stream().collect(Collectors.toMap(
                Product::getName,
                p -> p.getPrice() != null ? p.getPrice() : 0.0,
                (a, b) -> a
        ));
    }

    private String validateCustomDomain(String domain) {
        if (domain == null || domain.isBlank()) return "Domena nie może być pusta!";
        domain = domain.trim().toLowerCase();
        if (domain.contains("localhost") || domain.contains("127.0.0.1")) return "Localhost nie jest dozwolony!";
        if (domain.contains("http://") || domain.contains("https://")) return "Nie wpisuj protokołu, tylko domenę!";
        if (domain.contains(":")) return "Nie wpisuj portu, tylko domenę!";
        if (!domain.matches("^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z0-9]{2,}$")) {
            return "Domena musi być ważnym formatem (np. sklep.mcsurv.pl)!";
        }
        return null;
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private String resolveApiKey(String header, String param) {
        if (header != null && !header.isBlank()) return header;
        if (param != null && !param.isBlank()) return param;
        return null;
    }

    private void evictShopProductCache(Shop shop) {
        evict("storefrontProducts", shop.getId());
        evict("storefrontTop", shop.getServerName().toLowerCase());
        evict("storefrontRecent", shop.getServerName().toLowerCase());
    }

    private void evictShopModeCache(Shop shop) {
        evict("storefrontModes", shop.getId());
    }

    private void evictShopInfoCache(Shop shop) {
        evict("storefrontInfo", shop.getServerName().toLowerCase());
    }

    private void evict(String cacheName, Object key) {
        org.springframework.cache.Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) cache.evict(key);
    }
    // ══ LOOTBOXY ══

    @GetMapping("/lootbox")
    public ResponseEntity<?> getLootboxRewards(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).body("Brak klucza API!");
        return withOwnedShop(apiKey, shop -> ResponseEntity.ok(lootboxRewardRepository.findByShop(shop)));
    }

    @PostMapping("/lootbox")
    public ResponseEntity<?> addLootboxReward(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam,
            @RequestBody pl.ziutek.itemshop.model.LootboxReward req
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).body("Brak klucza API!");
        
        return withOwnedShop(apiKey, shop -> {
            String lootPlan = shop.getOwner().getSubscriptionPlan();
            if ("FREE".equals(lootPlan)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Lootbox dostępny od planu STARTER.");
            }
            if (req.getName() == null || req.getName().isBlank() || req.getCommand() == null || req.getCommand().isBlank()) {
                return ResponseEntity.badRequest().body("Nazwa i komenda są wymagane.");
            }

            pl.ziutek.itemshop.model.LootboxReward reward = new pl.ziutek.itemshop.model.LootboxReward();
            reward.setShop(shop);
            reward.setName(req.getName().trim());
            reward.setCommand(req.getCommand().trim());
            reward.setWeight(req.getWeight() != null && req.getWeight() > 0 ? req.getWeight() : 1);
            
            return ResponseEntity.ok(lootboxRewardRepository.save(reward));
        });
    }

    @DeleteMapping("/lootbox/{id}")
    public ResponseEntity<?> deleteLootboxReward(
            @PathVariable Long id,
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).body("Brak klucza API!");
        
        return withOwnedShop(apiKey, shop -> {
            pl.ziutek.itemshop.model.LootboxReward reward = lootboxRewardRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Nie znaleziono nagrody"));
                    
            if (!reward.getShop().getId().equals(shop.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Nagroda nie należy do tego sklepu");
            }
            
            lootboxRewardRepository.delete(reward);
            return ResponseEntity.ok("Usunięto nagrodę.");
        });
    }

    // ══ PROMO KODY ══

    @GetMapping("/kody-promo")
    public ResponseEntity<?> getPromoCodes(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).body("Brak klucza API!");
        return withOwnedShop(apiKey, shop ->
                ResponseEntity.ok(promoCodeRepository.findByShopOrderByCreatedAtDesc(shop)));
    }

    @PostMapping("/kod-promo")
    public ResponseEntity<?> addPromoCode(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam,
            @RequestBody Map<String, Object> req
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).body("Brak klucza API!");

        return withOwnedShop(apiKey, shop -> {
            String promoPlan = shop.getOwner().getSubscriptionPlan();
            if ("FREE".equals(promoPlan)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Kody promo dostępne od planu STARTER.");
            }
            String code = req.get("code") != null ? req.get("code").toString().trim().toUpperCase() : null;
            if (code == null || code.isEmpty() || !code.matches("[A-Z0-9_-]{2,30}"))
                return ResponseEntity.badRequest().body("Nieprawidłowy kod (2–30 znaków, litery/cyfry/-/_).");

            if (promoCodeRepository.findByShopAndCodeIgnoreCase(shop, code).isPresent())
                return ResponseEntity.badRequest().body("Kod '" + code + "' już istnieje w tym sklepie.");

            int discount;
            try { discount = Integer.parseInt(req.get("discountPercent").toString()); }
            catch (Exception e) { return ResponseEntity.badRequest().body("Nieprawidłowy procent zniżki."); }
            if (discount < 1 || discount > 100) return ResponseEntity.badRequest().body("Zniżka musi być 1–100%.");

            pl.ziutek.itemshop.model.PromoCode pc = new pl.ziutek.itemshop.model.PromoCode();
            pc.setShop(shop);
            pc.setCode(code);
            pc.setDiscountPercent(discount);
            if (req.get("maxUses") != null) {
                try { pc.setMaxUses(Integer.parseInt(req.get("maxUses").toString())); } catch (Exception ignored) {}
            }
            if (req.get("expiresAt") != null && !req.get("expiresAt").toString().isBlank()) {
                try {
                    String raw = req.get("expiresAt").toString();
                    LocalDateTime parsed;
                    try {
                        parsed = LocalDateTime.parse(raw);
                    } catch (Exception e1) {
                        // HTML datetime-local daje format bez sekund: "2024-01-15T14:30"
                        parsed = LocalDateTime.parse(raw,
                            java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
                    }
                    pc.setExpiresAt(parsed);
                } catch (Exception ignored) {}
            }
            return ResponseEntity.ok(promoCodeRepository.save(pc));
        });
    }

    @PatchMapping("/kod-promo/{id}/toggle")
    public ResponseEntity<?> togglePromoCode(
            @PathVariable Long id,
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).body("Brak klucza API!");
        return withOwnedShop(apiKey, shop -> {
            pl.ziutek.itemshop.model.PromoCode pc = promoCodeRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Nie znaleziono kodu"));
            if (!pc.getShop().getId().equals(shop.getId()))
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Kod nie należy do tego sklepu.");
            pc.setActive(!pc.isActive());
            return ResponseEntity.ok(promoCodeRepository.save(pc));
        });
    }

    @DeleteMapping("/kod-promo/{id}")
    public ResponseEntity<?> deletePromoCode(
            @PathVariable Long id,
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).body("Brak klucza API!");
        return withOwnedShop(apiKey, shop -> {
            pl.ziutek.itemshop.model.PromoCode pc = promoCodeRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Nie znaleziono kodu"));
            if (!pc.getShop().getId().equals(shop.getId()))
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Kod nie należy do tego sklepu.");
            promoCodeRepository.delete(pc);
            return ResponseEntity.ok("Usunięto kod.");
        });
    }
}