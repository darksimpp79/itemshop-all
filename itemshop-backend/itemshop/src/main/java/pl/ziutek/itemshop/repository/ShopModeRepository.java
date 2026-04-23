package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.ziutek.itemshop.model.Shop;
import pl.ziutek.itemshop.model.ShopMode;

import java.util.List;

@Repository
public interface ShopModeRepository extends JpaRepository<ShopMode, Long> {
    List<ShopMode> findByShop(Shop shop);
}