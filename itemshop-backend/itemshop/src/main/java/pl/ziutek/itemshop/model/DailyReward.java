package pl.ziutek.itemshop.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "daily_rewards",
        uniqueConstraints = {
                // Jeden rekord na kombinację nick + serwer + tryb — blokuje race condition na poziomie bazy
                @UniqueConstraint(
                        name = "uq_daily_reward_player_server_mode",
                        columnNames = {"player_name", "server_name", "mode"}
                )
        },
        indexes = {
                @Index(name = "idx_daily_reward_lookup", columnList = "player_name, server_name, mode")
        }
)
@Data
public class DailyReward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player_name", nullable = false)
    private String playerName;

    @Column(name = "server_name", nullable = false)
    private String serverName;

    @Column(name = "last_claimed", nullable = false)
    private LocalDateTime lastClaimed;

    @Column(name = "mode", nullable = false)
    private String mode;
}