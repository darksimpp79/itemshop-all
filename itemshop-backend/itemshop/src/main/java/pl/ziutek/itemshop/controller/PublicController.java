package pl.ziutek.itemshop.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.ziutek.itemshop.repository.PendingItemRepository;
import pl.ziutek.itemshop.repository.ShopRepository;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private PendingItemRepository itemRepository;

    // GET /api/public/stats
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getPlatformStats() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("totalShops", shopRepository.count());
        stats.put("totalOrders", itemRepository.count());

        // FIX: usunięto hardcoded "* 20.0" — nie znamy prawdziwych cen na poziomie tego endpointu.
        // Zwracamy liczbę zrealizowanych zamówień; frontend może wyświetlić tę wartość bez fałszywej kwoty.
        long claimedCount = itemRepository.countByClaimed(true);
        stats.put("claimedOrders", claimedCount);

        return ResponseEntity.ok(stats);
    }
}