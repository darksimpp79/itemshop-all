package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.ziutek.itemshop.model.LootboxReward;
import pl.ziutek.itemshop.model.Shop;

import java.util.List;

public interface LootboxRewardRepository extends JpaRepository<LootboxReward, Long> {
    List<LootboxReward> findByShop(Shop shop);
}
