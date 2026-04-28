package pl.ziutek.itemshop.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "pending_items",
        indexes = {
                // Indeks na kolumnach używanych w zapytaniu pluginu MC — bez tego pełny skan przy każdym logowaniu gracza
                @Index(name = "idx_pending_item_plugin_lookup", columnList = "shop_id, player_name, mode, claimed"),
                // Indeks na shop_id dla zapytań admina (lista zamówień sklepu)
                @Index(name = "idx_pending_item_shop", columnList = "shop_id")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PendingItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Shop shop;

    @Column(name = "player_name")
    private String playerName;

    @Column(name = "item_name")
    private String itemName;

    @Column(name = "reward_command")
    private String rewardCommand;

    private String mode;

    @Column(name = "required_slots")
    private int requiredSlots = 1;

    private boolean claimed = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}