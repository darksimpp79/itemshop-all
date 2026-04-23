package pl.ziutek.itemshop.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "pending_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PendingItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // RELACJA: Ten przedmiot należy do konkretnego sklepu
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    private String playerName;
    private String itemName;
    private String rewardCommand;
    private String mode;
    private int requiredSlots = 1;
    private boolean claimed = false;
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

}