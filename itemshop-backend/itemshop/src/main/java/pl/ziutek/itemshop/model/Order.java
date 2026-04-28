package pl.ziutek.itemshop.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// FIX: dodano @Data, @NoArgsConstructor, @AllArgsConstructor — bez nich OrderRepository
// nie może odczytać pól (brak getterów/setterów), a JPA nie może tworzyć instancji (brak no-arg konstruktora).
@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nickname")
    private String nickname;

    @Column(name = "status")
    private String status;   // PENDING, PAID, COLLECTED

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Shop shop;
}