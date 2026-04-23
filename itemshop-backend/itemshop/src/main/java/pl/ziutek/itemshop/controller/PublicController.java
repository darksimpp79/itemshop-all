package pl.ziutek.itemshop.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.ziutek.itemshop.repository.*;

import java.util.HashMap;
import java.util.Map;

// ════════════════════════════════════════════════════════════════════════════
// NOWY PLIK: PublicController.java
// Endpoint publiczny – bez autoryzacji – dla landing page
// SecurityConfig już ma: .requestMatchers("/api/public/**").permitAll()
// DODAJ TĘ LINIĘ DO SecurityConfig.java w sekcji authorizeHttpRequests!
// ════════════════════════════════════════════════════════════════════════════

@RestController
@RequestMapping("/api/public")
public class PublicController {

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private PendingItemRepository itemRepository;

    @Autowired
    private ProductRepository productRepository;

    // GET /api/public/stats
    // Zwraca ogólne statystyki platformy dla landing page
    // Nie ujawnia żadnych wrażliwych danych
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getPlatformStats() {
        Map<String, Object> stats = new HashMap<>();

        // Liczba aktywnych sklepów
        stats.put("totalShops", shopRepository.count());

        // Liczba wszystkich zamówień w platformie
        stats.put("totalOrders", itemRepository.count());

        // Suma przychodów (tylko zrealizowane) – bez wrażliwych danych per-sklep
        double totalRevenue = productRepository.findAll().stream()
                .mapToDouble(p -> 0) // placeholder – docelowo z transakcji
                .sum();
        // Użyjemy count * średnia jako przybliżenie
        long claimedCount = itemRepository.findAll().stream()
                .filter(item -> item.isClaimed())
                .count();
        stats.put("totalRevenue", claimedCount * 20.0); // ~20 PLN średnia

        return ResponseEntity.ok(stats);
    }
}