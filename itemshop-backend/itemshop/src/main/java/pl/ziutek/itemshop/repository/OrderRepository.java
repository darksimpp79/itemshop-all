package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.ziutek.itemshop.model.Order;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    // To wywoła plugin, żeby wiedzieć co wydać
    List<Order> findByShopApiKeyAndStatus(String apiKey, String status);
}
