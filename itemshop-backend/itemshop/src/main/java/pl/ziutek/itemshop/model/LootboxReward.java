package pl.ziutek.itemshop.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "lootbox_rewards")
@Data
public class LootboxReward {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    @JsonIgnore
    private Shop shop;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String command;

    @Column(nullable = false, columnDefinition = "int default 1")
    private Integer weight = 1;
}
