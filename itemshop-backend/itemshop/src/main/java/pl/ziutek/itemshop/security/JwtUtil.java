package pl.ziutek.itemshop.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    // Twój tajny klucz serwera (w prawdziwym życiu trzymamy to w zmiennych środowiskowych)
    // Musi mieć minimum 32 znaki!
    private final String SECRET = "SuperTajnyKluczDoItemshopuZiutkaKtoryMa32Znaki!";

    // Ważność tokenu (np. 24 godziny)
    private final long EXPIRATION_TIME = 86400000;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    // Generujemy token dla podanego emaila
    public String generateToken(String email) {
        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(getSigningKey())
                .compact();
    }

    // Wyciągamy email z tokenu, żeby sprawdzić kto to
    public String extractEmail(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    // Sprawdzamy czy token jest legitny i czy nie wygasł
    public boolean isTokenValid(String token) {
        try {
            Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false; // Ktoś próbował sfałszować token!
        }
    }
}