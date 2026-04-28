package pl.ziutek.itemshop.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Shop shop;

    private String name;
    private String description;
    private String iconEmoji;

    @Column(length = 1000)
    private String imageUrl;

    private Double price;
    private Integer requiredSlots;

    private String mode;

    @Column(name = "position", nullable = false, columnDefinition = "int default 0")
    private Integer position;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_commands", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "command")
    private List<String> commands = new ArrayList<>();

    public void setMode(String mode) {
        if (mode != null) {
            this.mode = mode.trim().toLowerCase();
        } else {
            this.mode = null;
        }
    }

    // --- PANCERNE ZABEZPIECZENIE PRZED NULLAMI Z FRONTENDU ---
    @PrePersist
    @PreUpdate
    public void ensureDefaultValues() {
        if (this.position == null) this.position = 0;
        if (this.price == null) this.price = 0.0;
        if (this.requiredSlots == null) this.requiredSlots = 1;
    }
}