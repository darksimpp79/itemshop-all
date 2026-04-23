package pl.ziutek.itemshop.security;

import org.springframework.beans.factory.annotation.Autowired;
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
import org.springframework.beans.factory.annotation.Value;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtFilter jwtFilter;

    @Value("${app.cors.allowed-origin-patterns:http://localhost:3000,http://127.0.0.1:3000,http://*.localhost:3000}")
    private String allowedOriginPatterns;

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
                        // To MUSI być otwarte, żeby dało się zalogować i zdobyć token JWT
                        .requestMatchers("/api/auth/**").permitAll()

                        // STRIPE WEBHOOK (Otwarte, żeby Stripe mogło powiadomić o wpłacie!)
                        .requestMatchers("/api/payment/webhook").permitAll()

                        // To MUSI być otwarte dla pluginu i frontendu sklepu
                        .requestMatchers("/api/storefront/**").permitAll()

                        // Publiczne statystyki / landing page
                        .requestMatchers("/api/public/**").permitAll()

                        // Zezwolenie na pobieranie zdjęć
                        .requestMatchers("/api/files/images/**").permitAll()

                        // Preflight dla CORS z Next.js
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Panel właściciela (Owner) - wymagany token.
                        // Dalsze ograniczenia per-sklep robi już logika w kontrolerach (porównanie ownerEmail).
                        .requestMatchers("/api/admin/**").authenticated()

                        // Reszta musi mieć token
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Panel admina (frontend) powinien być na kontrolowanej domenie; publiczny storefront nie wymaga credentials.
        // Dla dev zostawiamy localhost, a dla produkcji ustaw przez ENV/konfigurację.
        config.setAllowedOriginPatterns(Arrays.stream(allowedOriginPatterns.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList()));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-API-Key", "Cache-Control"));
        config.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}