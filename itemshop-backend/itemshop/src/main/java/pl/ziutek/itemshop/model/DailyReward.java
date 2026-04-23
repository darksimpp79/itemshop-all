package pl.ziutek.itemshop.model;

import jakarta.persistence.*; // Ważne dla nowszych wersji Springa
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_rewards")
@Data
public class DailyReward {

    @Id // <-- Tego szuka Hibernate
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String playerName;
    private String serverName;
    private LocalDateTime lastClaimed;
    private String mode;
}