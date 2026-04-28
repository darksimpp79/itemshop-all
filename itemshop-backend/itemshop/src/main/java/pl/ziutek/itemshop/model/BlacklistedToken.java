package pl.ziutek.itemshop.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Przechowuje unieważnione tokeny JWT (logout, zmiana hasła, reset 2FA).
 * JwtFilter sprawdza czy JTI tokenu jest na tej liście przed dopuszczeniem requestu.
 * Rekordy są automatycznie czyszczone przez StripeEventCleanupScheduler
 * po upłynięciu czasu życia tokenu (>24h od expiresAt).
 */
@Entity
@Table(
        name = "blacklisted_tokens",
        indexes = {
                @Index(name = "idx_blacklisted_token_jti", columnList = "jti", unique = true),
                @Index(name = "idx_blacklisted_token_expires", columnList = "expires_at")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BlacklistedToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "jti", nullable = false, unique = true, length = 64)
    private String jti;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "blacklisted_at", nullable = false)
    private LocalDateTime blacklistedAt = LocalDateTime.now();

    public BlacklistedToken(String jti, LocalDateTime expiresAt) {
        this.jti = jti;
        this.expiresAt = expiresAt;
    }
}