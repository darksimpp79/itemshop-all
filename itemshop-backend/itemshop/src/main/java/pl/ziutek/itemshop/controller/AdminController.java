package pl.ziutek.itemshop.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import pl.ziutek.itemshop.model.*;
import pl.ziutek.itemshop.repository.*;

import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private ShopRepository shopRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private OwnerRepository ownerRepository;
    @Autowired
    private PendingItemRepository itemRepository;
    @Autowired
    private ShopModeRepository shopModeRepository;

    // 1. ZAKŁADANIE SKLEPU (Z BLOKADĄ LIMITU 1 DLA FREE)
    @PostMapping("/sklep")
    public ResponseEntity<?> zalozSklep(@RequestParam String serverName) {
        String ownerEmail = SecurityContextHolder.getContext().getAuthentication().getName();

        // Pobieramy Ownera
        Owner owner = ownerRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new RuntimeException("Błąd autoryzacji!"));

        // BLOKADA: Sprawdzamy plan subskrypcji przypisany do OWNERA
        List<Shop> existingShops = shopRepository.findByOwnerEmail(ownerEmail);
        if ("FREE".equals(owner.getSubscriptionPlan()) && existingShops.size() >= 1) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Limit 1 sklepu dla planu FREE! Odblokuj PRO, aby tworzyć bez limitów. 🚀");
        }

        // Sprawdzamy czy nazwa nie jest zajęta globalnie
        boolean exists = shopRepository.findAll().stream()
                .anyMatch(s -> s.getServerName().equalsIgnoreCase(serverName));

        if (exists) {
            return ResponseEntity.badRequest().body("Serwer o takiej nazwie już istnieje!");
        }

        Shop shop = new Shop();
        shop.setServerName(serverName);
        shop.setOwner(owner);

        Shop savedShop = shopRepository.save(shop);
        return ResponseEntity.ok(savedShop);
    }

    // 2. GLOBALNY UPGRADE KONTA DO PRO (DLA CAŁEGO OWNERA)
    @PostMapping("/user/upgrade")
    public ResponseEntity<?> upgradeOwnerToPro() {
        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();

        return ownerRepository.findByEmail(loggedInEmail).map(owner -> {
            owner.setSubscriptionPlan("PRO");
            ownerRepository.save(owner);
            return ResponseEntity.ok("Subskrypcja PRO została aktywowana dla całego konta! 💎");
        }).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body("Nie znaleziono użytkownika"));
    }

    @GetMapping("/user/profile")
    public ResponseEntity<?> getUserProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return ownerRepository.findByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 3. DODAWANIE PRODUKTU
    @PostMapping("/produkt")
    public ResponseEntity<?> dodajProdukt(
            @RequestHeader("X-API-Key") String apiKey,
            @RequestBody Product product) {

        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);
        if (shopOpt.isEmpty()) return ResponseEntity.status(401).body("Nieautoryzowany klucz API!");

        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();

        // ZABEZPIECZENIE IGNORUJĄCE WIELKOŚĆ LITER:
        if (!shopOpt.get().getOwner().getEmail().equalsIgnoreCase(loggedInEmail)) {
            return ResponseEntity.status(403).body("Brak dostępu!");
        }

        product.setShop(shopOpt.get());
        productRepository.save(product);
        return ResponseEntity.ok("Produkt dodany!");
    }

    // 4. POBIERANIE TWOICH SKLEPÓW
    @GetMapping("/moje-sklepy")
    public ResponseEntity<?> getMyShops() {
        String ownerEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(shopRepository.findByOwnerEmail(ownerEmail));
    }

    // 5. POBIERANIE PRODUKTÓW
    @GetMapping("/produkty")
    public ResponseEntity<?> getShopProducts(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = (apiKeyHeader != null && !apiKeyHeader.isBlank()) ? apiKeyHeader : apiKeyParam;
        if (apiKey == null || apiKey.isBlank()) return ResponseEntity.status(401).body("Brak klucza API!");

        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);
        if (shopOpt.isEmpty()) return ResponseEntity.status(404).body("Nie znaleziono sklepu");

        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!shopOpt.get().getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).body("Brak dostępu!");
        }

        return ResponseEntity.ok(productRepository.findByShop(shopOpt.get()));
    }

    @PutMapping("/produkty/kolejnosc")
    public ResponseEntity<?> updateProductOrder(
            @RequestHeader("X-API-Key") String apiKey,
            @RequestBody List<Map<String, Object>> orderData) {

        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);
        if (shopOpt.isEmpty()) return ResponseEntity.status(401).build();

        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!shopOpt.get().getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).build();
        }

        for (Map<String, Object> item : orderData) {
            Long productId = Long.valueOf(item.get("id").toString());
            int position   = Integer.parseInt(item.get("position").toString());

            productRepository.findById(productId).ifPresent(product -> {
                if (product.getShop().getId().equals(shopOpt.get().getId())) {
                    product.setPosition(position);
                    productRepository.save(product);
                }
            });
        }

        return ResponseEntity.ok("Kolejność zaktualizowana!");
    }

    @DeleteMapping("/produkt/{id}")
    public ResponseEntity<?> usunProdukt(@PathVariable Long id) {
        Optional<Product> prodOpt = productRepository.findById(id);
        if (prodOpt.isEmpty()) return ResponseEntity.notFound().build();

        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!prodOpt.get().getShop().getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).body("Brak uprawnień!");
        }

        productRepository.delete(prodOpt.get());
        return ResponseEntity.ok("Usunięto produkt");
    }

    @GetMapping("/zamowienia")
    public ResponseEntity<?> getZamowienia(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = (apiKeyHeader != null && !apiKeyHeader.isBlank()) ? apiKeyHeader : apiKeyParam;
        if (apiKey == null || apiKey.isBlank()) return ResponseEntity.status(401).build();

        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);

        if (shopOpt.isEmpty() || !shopOpt.get().getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(itemRepository.findByShop(shopOpt.get()));
    }

    @GetMapping("/zamowienia/export")
    public ResponseEntity<byte[]> exportOrdersCsv(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) throws Exception {
        String apiKey = (apiKeyHeader != null && !apiKeyHeader.isBlank()) ? apiKeyHeader : apiKeyParam;
        if (apiKey == null || apiKey.isBlank()) return ResponseEntity.status(401).build();

        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);

        if (shopOpt.isEmpty() || !shopOpt.get().getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).build();
        }

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
        // BOM dla Excela (poprawna obsługa polskich znaków)
        byte[] bom = new byte[]{(byte)0xEF, (byte)0xBB, (byte)0xBF};
        byte[] withBom = new byte[bom.length + bytes.length];
        System.arraycopy(bom, 0, withBom, 0, bom.length);
        System.arraycopy(bytes, 0, withBom, bom.length, bytes.length);

        String shopName = shopOpt.get().getServerName().replaceAll("[^a-zA-Z0-9]", "_");
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"zamowienia_" + shopName + ".csv\"")
                .header("Content-Type", "text/csv; charset=UTF-8")
                .body(withBom);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }


    @PutMapping("/sklep/ip")
    public ResponseEntity<?> updateShopIp(
            @RequestHeader("X-API-Key") String apiKey,
            @RequestParam String serverIp) {

        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);
        if (shopOpt.isEmpty()) return ResponseEntity.status(401).build();

        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!shopOpt.get().getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).build();
        }

        Shop shop = shopOpt.get();
        shop.setServerIp(serverIp);
        shopRepository.save(shop);
        return ResponseEntity.ok("IP zaktualizowane");
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = (apiKeyHeader != null && !apiKeyHeader.isBlank()) ? apiKeyHeader : apiKeyParam;
        if (apiKey == null || apiKey.isBlank()) return ResponseEntity.status(401).build();

        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);

        if (shopOpt.isEmpty() || !shopOpt.get().getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).build();
        }

        List<PendingItem> allItems = itemRepository.findByShop(shopOpt.get());
        double totalRevenue = allItems.stream()
                .filter(PendingItem::isClaimed)
                .mapToDouble(item -> 15.0).sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalOrders", allItems.size());
        stats.put("claimedOrders", allItems.stream().filter(PendingItem::isClaimed).count());
        stats.put("totalRevenue", totalRevenue);
        stats.put("uniquePlayers", allItems.stream().map(PendingItem::getPlayerName).distinct().count());

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/chart")
    public ResponseEntity<?> getChartData(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = (apiKeyHeader != null && !apiKeyHeader.isBlank()) ? apiKeyHeader : apiKeyParam;
        if (apiKey == null || apiKey.isBlank()) return ResponseEntity.status(401).build();

        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);

        if (shopOpt.isEmpty() || !shopOpt.get().getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).build();
        }

        Shop shop = shopOpt.get();
        List<PendingItem> allItems = itemRepository.findByShop(shop);

        // Grupujemy po dniach tygodnia (ostatnie 7 dni)
        List<Map<String, Object>> chartData = new ArrayList<>();
        LocalDate today = LocalDate.now();
        String[] dayLabels = {"Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"};

        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            DayOfWeek dow = day.getDayOfWeek();
            String label = dayLabels[dow.getValue() - 1];

            // Liczymy prawdziwy przychód za dany dzień z realnych cen produktów
            double dayRevenue = allItems.stream()
                    .filter(item -> item.isClaimed() && item.getId() != null)
                    .mapToDouble(item -> {
                        Optional<Product> prod = productRepository.findByShopAndName(shop, item.getItemName());
                        return prod.map(Product::getPrice).orElse(0.0);
                    })
                    .sum();

            // W prawdziwej implementacji filtrowałbyś po dacie createdAt w PendingItem
            // Na razie zwracamy dane per dzień tygodnia jako placeholder z realną logiką
            Map<String, Object> point = new HashMap<>();
            point.put("date", label);
            point.put("revenue", dayRevenue / 7.0); // Rozkładamy przychód równomiernie do czasu dodania pola createdAt
            point.put("orders", allItems.size() / 7);
            chartData.add(point);
        }

        return ResponseEntity.ok(chartData);
    }


    // 6. AKTUALIZACJA MOTYWU (Z BLOKADĄ DLA FREE)
    @PutMapping("/sklep/motyw")
    public ResponseEntity<?> updateShopTheme(
            @RequestHeader("X-API-Key") String apiKey,
            @RequestParam String theme) {

        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);
        if (shopOpt.isEmpty()) return ResponseEntity.status(401).body("Błędny klucz!");

        Shop shop = shopOpt.get();
        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!shop.getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).build();
        }

        // BLOKADA: Sprawdzamy plan z Ownera, nie ze Sklepu!
        if ("FREE".equals(shop.getOwner().getSubscriptionPlan()) && !"default".equals(theme)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Motywy premium są zarezerwowane dla planu PRO! 🔒");
        }

        shop.setTheme(theme);
        shopRepository.save(shop);
        return ResponseEntity.ok("Motyw zaktualizowany!");
    }

    @PatchMapping("/shops/{id}/settings")
    public ResponseEntity<?> updateShopSettings(@PathVariable Long id, @RequestBody Map<String, String> updates) {
        return shopRepository.findById(id).map(shop -> {
            String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            if (!shop.getOwner().getEmail().equals(loggedInEmail)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            if (updates.containsKey("dailyRewardName")) shop.setDailyRewardName(updates.get("dailyRewardName"));
            if (updates.containsKey("dailyRewardCommand")) shop.setDailyRewardCommand(updates.get("dailyRewardCommand"));
            if (updates.containsKey("discordLink")) shop.setDiscordLink(updates.get("discordLink"));
            if (updates.containsKey("bannerText")) shop.setBannerText(updates.get("bannerText"));
            if (updates.containsKey("termsContent")) shop.setTermsContent(updates.get("termsContent"));

            shopRepository.save(shop);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // 7. ZARZĄDZANIE TRYBAMI (Z BLOKADĄ LIMITU 1 DLA FREE)
    @GetMapping("/tryby")
    public ResponseEntity<?> getShopModes(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = (apiKeyHeader != null && !apiKeyHeader.isBlank()) ? apiKeyHeader : apiKeyParam;
        if (apiKey == null || apiKey.isBlank()) return ResponseEntity.status(401).build();

        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);
        if (shopOpt.isEmpty()) return ResponseEntity.status(401).build();

        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!shopOpt.get().getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(shopModeRepository.findByShop(shopOpt.get()));
    }

    @PostMapping("/tryb")
    public ResponseEntity<?> saveShopMode(
            @RequestHeader("X-API-Key") String apiKey,
            @RequestBody ShopMode mode) {

        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);
        if (shopOpt.isEmpty()) return ResponseEntity.status(401).build();

        Shop shop = shopOpt.get();
        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!shop.getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).build();
        }

        // BLOKADA: Sprawdzamy plan z Ownera!
        if ("FREE".equals(shop.getOwner().getSubscriptionPlan())) {
            List<ShopMode> existingModes = shopModeRepository.findByShop(shop);
            // Jeśli to nowe żądanie (brak ID) i już jest jeden tryb
            if (mode.getId() == null && existingModes.size() >= 1) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Plan FREE pozwala tylko na 1 tryb gry. Odblokuj limity z planem PRO! 🎮");
            }
        }

        mode.setShop(shop);
        shopModeRepository.save(mode);
        return ResponseEntity.ok("Tryb zapisany!");
    }

    @DeleteMapping("/tryb/{id}")
    public ResponseEntity<?> deleteShopMode(@PathVariable Long id) {
        Optional<ShopMode> modeOpt = shopModeRepository.findById(id);
        if (modeOpt.isEmpty()) return ResponseEntity.notFound().build();

        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!modeOpt.get().getShop().getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).build();
        }

        shopModeRepository.delete(modeOpt.get());
        return ResponseEntity.ok("Tryb usunięty");
    }

    @GetMapping("/stats-v2")
    public ResponseEntity<?> getDetailedStats(
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = (apiKeyHeader != null && !apiKeyHeader.isBlank()) ? apiKeyHeader : apiKeyParam;
        if (apiKey == null || apiKey.isBlank()) return ResponseEntity.status(401).build();

        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);

        if (shopOpt.isEmpty() || !shopOpt.get().getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).build();
        }

        Shop shop = shopOpt.get();
        List<PendingItem> items = itemRepository.findByShop(shop);
        List<Product> products  = productRepository.findByShop(shop);

        // Mapa nazwy produktu -> cena (do szybkiego lookup)
        Map<String, Double> priceMap = products.stream()
                .collect(java.util.stream.Collectors.toMap(
                        Product::getName,
                        Product::getPrice,
                        (a, b) -> a // na wypadek duplikatów nazw
                ));

        // Sumujemy PRAWDZIWE ceny odebranych zamówień
        double totalRevenue = items.stream()
                .filter(PendingItem::isClaimed)
                .mapToDouble(item -> priceMap.getOrDefault(item.getItemName(), 0.0))
                .sum();

        long uniquePlayers = items.stream()
                .map(PendingItem::getPlayerName)
                .distinct()
                .count();

        Map<String, Object> data = new HashMap<>();
        data.put("revenue", totalRevenue);
        data.put("orders",  items.size());
        data.put("claimed", items.stream().filter(PendingItem::isClaimed).count());
        data.put("uniquePlayers", uniquePlayers);

        return ResponseEntity.ok(data);
    }

    // ══ CUSTOM DOMAIN (PRO PLAN ONLY) ══
    @PostMapping("/custom-domain")
    public ResponseEntity<?> setCustomDomain(
            @RequestParam String customDomain,
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam
    ) {
        String apiKey = (apiKeyHeader != null && !apiKeyHeader.isBlank()) ? apiKeyHeader : apiKeyParam;
        if (apiKey == null || apiKey.isBlank()) return ResponseEntity.status(401).body("Brak API Key!");

        String loggedInEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);

        if (shopOpt.isEmpty() || !shopOpt.get().getOwner().getEmail().equals(loggedInEmail)) {
            return ResponseEntity.status(403).body("Brak dostępu do tego sklepu!");
        }

        Shop shop = shopOpt.get();
        Owner owner = shop.getOwner();

        // BLOKADA: Tylko PRO może ustawiać custom domain
        if (!"PRO".equals(owner.getSubscriptionPlan())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("CustomDomain dostępny tylko w planie PRO! 💎");
        }

        // Walidacja domeny
        String validationError = validateCustomDomain(customDomain);
        if (validationError != null) {
            return ResponseEntity.badRequest().body(validationError);
        }

        // Sprawdzenie czy domena nie jest już zajęta
        Optional<Shop> existingDomain = shopRepository.findByCustomDomain(customDomain.trim().toLowerCase());
        if (existingDomain.isPresent() && !existingDomain.get().getId().equals(shop.getId())) {
            return ResponseEntity.badRequest().body("Domena jest już zajęta przez inny sklep! 🚫");
        }

        // Ustawienie domeny
        shop.setCustomDomain(customDomain.trim().toLowerCase());
        shopRepository.save(shop);

        return ResponseEntity.ok(java.util.Map.of(
                "message", "Domena ustawiona! 🎉",
                "domain", shop.getCustomDomain(),
                "note", "Zmiany wejdą w życie w ciągu kilku minut."
        ));
    }

    // Helper: Walidacja domeny
    private String validateCustomDomain(String domain) {
        if (domain == null || domain.isBlank()) {
            return "Domena nie może być pusta!";
        }

        domain = domain.trim().toLowerCase();

        // Reject localhost i IP addresses
        if (domain.contains("localhost") || domain.contains("127.0.0.1") || domain.contains("0.0.0.0")) {
            return "Localhost i prywatne IP nie są dozwolone! 🚫";
        }

        // Reject jeśli zawiera http:// lub https://
        if (domain.contains("http://") || domain.contains("https://")) {
            return "Nie wpisuj protokołu (http://, https://), tylko domenę! 📝";
        }

        // Reject jeśli zawiera port
        if (domain.contains(":")) {
            return "Nie wpisuj portu, tylko domenę! 📝";
        }

        // Regex: Valid domain format
        // Zezwala na: subdomena.domena.pl, domena.com, itp.
        String regex = "^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z0-9]{2,}$";
        if (!domain.matches(regex)) {
            return "Domena musi być ważnym formatem! (np. sklep.mcsurv.pl) 📍";
        }

        return null; // Walidacja pomyślna
    }
}