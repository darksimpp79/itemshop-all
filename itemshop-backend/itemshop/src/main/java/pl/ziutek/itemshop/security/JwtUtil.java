package pl.ziutek.itemshop.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    public static final long EXPIRATION_MS       = 86_400_000L;  // 24h
    public static final long PRE_2FA_EXPIRATION_MS = 600_000L;   // 10min

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generuje pełny token JWT z rolą i unikalnym JTI (JWT ID).
     * JTI służy do identyfikacji tokenu przy logout (blacklista).
     */
    public String generateToken(String email, String role) {
        return Jwts.builder()
                .subject(email)
                .id(UUID.randomUUID().toString())          // JTI — unikalny ID tokenu
                .claim("role", role != null ? role.toUpperCase() : "USER")
                .claim("pre2fa", false)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith(getSigningKey())
                .compact();
    }

    public String generatePre2faToken(String email) {
        return Jwts.builder()
                .subject(email)
                .id(UUID.randomUUID().toString())
                .claims(Map.of(
                        "role", "PRE_2FA",
                        "pre2fa", true
                ))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + PRE_2FA_EXPIRATION_MS))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractEmail(String token) {
        return getClaims(token).getSubject();
    }

    public String extractRole(String token) {
        Object role = getClaims(token).get("role");
        return role != null ? role.toString() : "USER";
    }

    /**
     * Wyciąga JTI (JWT ID) z tokenu — używane przy blacklistowaniu (logout).
     */
    public String extractJti(String token) {
        return getClaims(token).getId();
    }

    /**
     * Zwraca czas wygaśnięcia tokenu jako LocalDateTime — używane przy tworzeniu rekordu blacklisty.
     */
    public LocalDateTime extractExpiration(String token) {
        Date exp = getClaims(token).getExpiration();
        return Instant.ofEpochMilli(exp.getTime())
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();
    }

    public boolean isTokenValid(String token) {
        try {
            getClaims(token); // rzuca wyjątek jeśli wygasły lub niepoprawny podpis
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isPre2faToken(String token) {
        try {
            Object pre2fa = getClaims(token).get("pre2fa");
            return Boolean.TRUE.equals(pre2fa);
        } catch (Exception e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}