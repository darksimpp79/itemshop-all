package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.ziutek.itemshop.model.Order;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // FIX: poprawna ścieżka przez relację @ManyToOne — shop.apiKey zamiast shopApiKey
    // Poprzedni zapis "findByShopApiKeyAndStatus" powodował błąd przy starcie aplikacji
    // bo Spring Data szukał pola 'shopApiKey' bezpośrednio w encji Order.
    List<Order> findByShop_ApiKeyAndStatus(String apiKey, String status);
}