package pl.ziutek.itemshop.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtFilter jwtFilter;

    /**
     * Lista dozwolonych originsów oddzielona przecinkami.
     * Na produkcji MUSISZ ustawić konkretne domeny w ENV/application.properties:
     *   app.cors.allowed-origins=https://twojadomena.pl,https://admin.twojadomena.pl
     *
     * Celowo usunięto wildcard *.localhost — był ryzykiem jeśli ktoś zapomniał
     * ustawić ENV na produkcji.
     */
    @Value("${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
    private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // 2FA management — wymaga pełnego JWT (nie pre-2FA)
                        .requestMatchers("/api/auth/2fa/**").authenticated()

                        // Auth — otwarte (login, register, verify)
                        .requestMatchers("/api/auth/**").permitAll()

                        // Stripe webhook — musi być otwarte, podpis weryfikowany w kontrolerze
                        .requestMatchers("/api/payment/webhook").permitAll()

                        // Storefront — publiczny dla graczy i pluginu MC
                        .requestMatchers("/api/storefront/**").permitAll()

                        // Publiczne statystyki landing page
                        .requestMatchers("/api/public/**").permitAll()

                        // Statyczne obrazki produktów
                        .requestMatchers("/api/files/images/**").permitAll()

                        // CORS preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Panel admina — wymaga tokenu JWT
                        .requestMatchers("/api/admin/**").authenticated()

                        // Upload plików — wymaga tokenu
                        .requestMatchers("/api/files/**").authenticated()

                        // Płatności (poza webhookiem) — wymaga tokenu
                        .requestMatchers("/api/payment/**").authenticated()

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());
        // setAllowedOriginPatterns obsługuje wzorce z *, np. https://*.pumpking.club
        config.setAllowedOriginPatterns(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-API-Key", "Cache-Control"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}