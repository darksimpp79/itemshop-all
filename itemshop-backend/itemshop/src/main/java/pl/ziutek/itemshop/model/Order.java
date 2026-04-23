package pl.ziutek.itemshop.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nickname; // Nick gracza z MC
    private String status;   // PENDING, PAID, COLLECTED
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne
    private Product product;

    @ManyToOne
    private Shop shop;

    // Gettery i Settery (wygeneruj je!)
}