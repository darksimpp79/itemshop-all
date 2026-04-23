package pl.ziutek.itemshop.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static jakarta.persistence.GenerationType.UUID;

@Entity
@Data
public class Transaction {
    @Id
    @GeneratedValue(strategy = UUID)
    private String id; // ID transakcji dla operatora płatności

    private String playerName;
    private String serverName;
    private Long productId;
    private BigDecimal amount;
    private String status; // PENDING, SUCCESS, FAILED
    private LocalDateTime createdAt;
}
