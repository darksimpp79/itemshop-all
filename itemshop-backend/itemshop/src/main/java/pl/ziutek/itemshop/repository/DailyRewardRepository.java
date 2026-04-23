package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.ziutek.itemshop.model.DailyReward;

import java.util.Optional;

public interface DailyRewardRepository extends JpaRepository<DailyReward, Long> {
    Optional<DailyReward> findByPlayerNameAndServerNameAndModeIgnoreCase(String playerName, String serverName, String mode);
}