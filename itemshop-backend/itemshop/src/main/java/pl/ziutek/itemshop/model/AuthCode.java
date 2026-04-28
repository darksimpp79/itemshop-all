package pl.ziutek.itemshop.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "auth_codes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthCode {

    public enum Purpose {
        REGISTER,
        LOGIN_2FA,
        ENABLE_2FA
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(name = "code_hash", nullable = false, length = 128)
    private String codeHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Purpose purpose;

    @Column(name = "pending_password_hash")
    private String pendingPasswordHash;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private int attempts = 0;

    @Column(nullable = false)
    private int maxAttempts = 5;

    @Column(nullable = false)
    private boolean used = false;
}
