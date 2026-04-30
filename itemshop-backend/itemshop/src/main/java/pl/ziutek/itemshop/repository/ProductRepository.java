package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.ziutek.itemshop.model.Product;
import pl.ziutek.itemshop.model.Shop;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    // Szuka wszystkich produktów przypisanych do konkretnego sklepu
    List<Product> findByShop(Shop shop);
    List<Product> findByShopOrderByPositionAsc(Shop shop);
    Optional<Product> findByShopAndName(Shop shop, String name);
    long countByShop(Shop shop);
}