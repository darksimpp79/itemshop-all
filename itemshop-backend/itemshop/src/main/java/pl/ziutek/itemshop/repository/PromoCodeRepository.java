package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.ziutek.itemshop.model.PromoCode;
import pl.ziutek.itemshop.model.Shop;

import java.util.List;
import java.util.Optional;

public interface PromoCodeRepository extends JpaRepository<PromoCode, Long> {
    List<PromoCode> findByShopOrderByCreatedAtDesc(Shop shop);
    Optional<PromoCode> findByShopAndCodeIgnoreCase(Shop shop, String code);
}
