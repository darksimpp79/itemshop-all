package pl.ziutek.itemshop.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "shop_modes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShopMode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Relacja: ten tryb należy do konkretnego sklepu
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    @JsonIgnore // Żeby nie robić nieskończonej pętli przy wysyłaniu JSONa
    private Shop shop;

    private String name;        // np. "Survival"
    private String description; // np. "Klasyczny tryb dla twardzieli"

    @Column(length = 1000)
    private String imageUrl;    // Zdjęcie tła/ikona trybu do ładnego wyświetlania we frontendzie
}