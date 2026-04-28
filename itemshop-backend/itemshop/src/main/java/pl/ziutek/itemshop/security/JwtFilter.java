package pl.ziutek.itemshop.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import pl.ziutek.itemshop.repository.BlacklistedTokenRepository;

import java.io.IOException;
import java.util.List;

@Component
public class JwtFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private BlacklistedTokenRepository blacklistedTokenRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            if (jwtUtil.isTokenValid(token) && !jwtUtil.isPre2faToken(token)) {

                // Sprawdzamy czy token nie został unieważniony (logout)
                String jti = extractJtiSafe(token);
                if (jti != null && blacklistedTokenRepository.existsByJti(jti)) {
                    // Token na blackliście — traktujemy jak brak tokenu (nie 401, żeby nie ujawniać info)
                    chain.doFilter(request, response);
                    return;
                }

                String email = jwtUtil.extractEmail(token);
                String role  = jwtUtil.extractRole(token);

                String authority = "ROLE_" + ((role == null || role.isBlank()) ? "USER" : role.trim().toUpperCase());

                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        email,
                        null,
                        List.of(new SimpleGrantedAuthority(authority))
                );

                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        chain.doFilter(request, response);
    }

    private String extractJtiSafe(String token) {
        try {
            return jwtUtil.extractJti(token);
        } catch (Exception e) {
            return null;
        }
    }
}