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
import pl.ziutek.itemshop.model.Owner;
import pl.ziutek.itemshop.repository.OwnerRepository;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
public class JwtFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private OwnerRepository ownerRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        // Wyciągamy nagłówek "Authorization"
        final String authHeader = request.getHeader("Authorization");

        // Sprawdzamy czy ma format "Bearer <token>"
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            // Ochroniarz sprawdza autentyczność kryptograficzną!
            if (jwtUtil.isTokenValid(token)) {
                String email = jwtUtil.extractEmail(token);

                Optional<Owner> ownerOpt = ownerRepository.findByEmail(email);
                if (ownerOpt.isPresent()) {
                    String role = ownerOpt.get().getRole();
                    String authority = "ROLE_" + ((role == null || role.isBlank()) ? "USER" : role.trim().toUpperCase());

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            email,
                            null,
                            List.of(new SimpleGrantedAuthority(authority))
                    );

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        }
        // Niezależnie od wyniku, puszczamy żądanie dalej (jak nie ma tokenu, Spring i tak go zablokuje sam)
        chain.doFilter(request, response);
    }
}