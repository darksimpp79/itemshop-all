package pl.ziutek.itemshop.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "processed_stripe_events")
@Data
public class ProcessedStripeEvent {
    @Id
    @Column(nullable = false, unique = true)
    private String eventId;

    @Column(nullable = false)
    private LocalDateTime processedAt = LocalDateTime.now();
}

