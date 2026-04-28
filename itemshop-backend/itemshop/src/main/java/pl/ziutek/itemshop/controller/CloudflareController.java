package pl.ziutek.itemshop.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.ziutek.itemshop.model.Shop;
import pl.ziutek.itemshop.repository.ShopRepository;
import pl.ziutek.itemshop.service.CloudflareService;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/cloudflare")
public class CloudflareController {

    @Autowired
    private CloudflareService cloudflareService;

    @Autowired
    private ShopRepository shopRepository;

    @PostMapping("/setup")
    public ResponseEntity<?> setup(
            @RequestBody Map<String, String> payload,
            @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
            @RequestParam(value = "apiKey", required = false) String apiKeyParam) {

        String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
        if (apiKey == null) return ResponseEntity.status(401).body("Brak API Key!");

        Optional<Shop> shopOpt = shopRepository.findByApiKey(apiKey);
        if (shopOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Nieprawidłowy klucz API!");
        }

        Shop shop = shopOpt.get();
        if (!"PRO".equals(shop.getOwner().getSubscriptionPlan())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("CustomDomain dostępny tylko w planie PRO.");
        }

        String domain = payload.get("domain");
        String apiToken = payload.get("apiToken");

        if (domain == null || domain.isBlank() || apiToken == null || apiToken.isBlank()) {
            return ResponseEntity.badRequest().body("Brak domeny lub tokenu API.");
        }

        domain = domain.trim().toLowerCase();

        Optional<Shop> existingShopDomain = shopRepository.findByCustomDomain(domain);
        if (existingShopDomain.isPresent() && !existingShopDomain.get().getId().equals(shop.getId())) {
            return ResponseEntity.badRequest().body("Domena jest już zajęta przez inny sklep.");
        }

        try {
            String zoneId = cloudflareService.findZoneIdForDomain(apiToken, domain);
            cloudflareService.addCnameRecord(apiToken, zoneId, domain);

            shop.setCustomDomain(domain);
            shopRepository.save(shop);

            return ResponseEntity.ok(Map.of(
                    "message", "Domena podpięta z sukcesem przez Cloudflare!",
                    "domain", domain
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Błąd Cloudflare: " + e.getMessage());
        }
    }

    private String resolveApiKey(String header, String param) {
        if (header != null && !header.isBlank()) return header;
        if (param != null && !param.isBlank()) return param;
        return null;
    }
}
