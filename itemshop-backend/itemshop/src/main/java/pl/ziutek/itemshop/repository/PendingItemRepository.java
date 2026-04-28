package pl.ziutek.itemshop.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pl.ziutek.itemshop.model.PendingItem;
import pl.ziutek.itemshop.model.Shop;

import java.util.List;

public interface PendingItemRepository extends JpaRepository<PendingItem, Long> {

    // Dla CSV export — jednorazowe, akceptowalne
    List<PendingItem> findByShop(Shop shop);

    // Paginowana dla /zamowienia
    Page<PendingItem> findByShop(Shop shop, Pageable pageable);

    List<PendingItem> findByShopAndPlayerNameAndClaimedFalse(Shop shop, String playerName);

    long countByClaimed(boolean claimed);

    // Liczenie bez ładowania do RAM — używane w stats
    long countByShop(Shop shop);
    long countByShopAndClaimed(Shop shop, boolean claimed);

    // Unikalni gracze i przychód — agregacje po stronie DB, zero OOM
    @Query("SELECT COUNT(DISTINCT p.playerName) FROM PendingItem p WHERE p.shop = :shop")
    long countDistinctPlayersByShop(@Param("shop") Shop shop);

    @Query("SELECT COALESCE(SUM(prod.price), 0) FROM PendingItem p " +
            "JOIN Product prod ON p.itemName = prod.name AND p.shop = prod.shop " +
            "WHERE p.shop = :shop AND p.claimed = true")
    double sumRevenueByShop(@Param("shop") Shop shop);

    @Query("SELECT p.playerName, SUM(prod.price) FROM PendingItem p " +
            "JOIN Product prod ON p.itemName = prod.name AND p.shop = prod.shop " +
            "WHERE LOWER(p.shop.serverName) = LOWER(:serverName) " +
            "GROUP BY p.playerName " +
            "ORDER BY SUM(prod.price) DESC")
    List<Object[]> findTopDonatorsByServer(@Param("serverName") String serverName, Pageable pageable);

    @Query("SELECT p FROM PendingItem p WHERE LOWER(p.shop.serverName) = LOWER(:serverName) ORDER BY p.id DESC")
    List<PendingItem> findRecentPurchases(@Param("serverName") String serverName, Pageable pageable);

    // Dla wykresu — tylko ostatnie N dni, tylko pola potrzebne do agregacji
    @Query("SELECT p FROM PendingItem p WHERE p.shop = :shop AND p.createdAt >= :since ORDER BY p.createdAt ASC")
    List<PendingItem> findByShopAndCreatedAtAfter(@Param("shop") Shop shop, @Param("since") java.time.LocalDateTime since);

    List<PendingItem> findByShopAndPlayerNameAndModeIgnoreCaseAndClaimedFalse(Shop shop, String playerName, String mode);
}