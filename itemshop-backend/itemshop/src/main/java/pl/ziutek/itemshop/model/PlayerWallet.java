package pl.ziutek.itemshop.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "player_wallets")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayerWallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nickname", unique = true, nullable = false)
    private String nickname;

    @Column(name = "points", nullable = false)
    private Integer points = 0;
}
