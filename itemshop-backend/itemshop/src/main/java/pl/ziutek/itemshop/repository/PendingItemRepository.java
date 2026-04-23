package pl.ziutek.itemshop.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pl.ziutek.itemshop.model.PendingItem;
import pl.ziutek.itemshop.model.Shop;

import java.util.List;

public interface PendingItemRepository extends JpaRepository<PendingItem, Long> {

    // TA METODA JEST POTRZEBNA DLA ADMINA (Logi zamówień)
    List<PendingItem> findByShop(Shop shop);

    // Ta metoda jest potrzebna dla pluginu Minecraft
    List<PendingItem> findByShopAndPlayerNameAndClaimedFalse(Shop shop, String playerName);

    // Zapytanie dla Top Donatorów (dodaliśmy wcześniej)
    // Top Donatorzy z ignorowaniem wielkości liter
    @Query("SELECT p.playerName, SUM(prod.price) FROM PendingItem p " +
            "JOIN Product prod ON p.itemName = prod.name AND p.shop = prod.shop " +
            "WHERE LOWER(p.shop.serverName) = LOWER(:serverName) " +
            "GROUP BY p.playerName " +
            "ORDER BY SUM(prod.price) DESC")
    List<Object[]> findTopDonatorsByServer(@Param("serverName") String serverName, Pageable pageable);

    // Ostatnie zakupy z ignorowaniem wielkości liter
    @Query("SELECT p FROM PendingItem p WHERE LOWER(p.shop.serverName) = LOWER(:serverName) ORDER BY p.id DESC")
    List<PendingItem> findRecentPurchases(@Param("serverName") String serverName, Pageable pageable);

    List<PendingItem> findByShopAndPlayerNameAndModeIgnoreCaseAndClaimedFalse(Shop shop, String playerName, String mode);
}