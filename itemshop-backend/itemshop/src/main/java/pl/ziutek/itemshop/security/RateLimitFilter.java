package pl.ziutek.itemshop.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Sliding-window rate limiter dla publicznych endpointów storefrontu.
 *
 * UWAGA: Implementacja in-memory. Działa poprawnie dla pojedynczej instancji.
 * Dla deploymentu multi-instance (k8s, wiele podów) zastąp backendem Redis
 * np. używając Bucket4j + Redis lub Spring Boot Starter dla Resilience4j.
 *
 * IP klienta jest wyciągane przez ClientIpResolver który respektuje
 * X-Forwarded-For TYLKO od zaufanych proxy — zapobiega IP spoofing.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Deque<Long>> windows = new ConcurrentHashMap<>();

    @Autowired
    private ClientIpResolver clientIpResolver;

    @Value("${app.ratelimit.storefront.max-requests-per-minute:120}")
    private int maxRequestsPerMinute;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/storefront/")) return true;
        String method = request.getMethod();
        return !("GET".equals(method) || "POST".equals(method));
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        long now = Instant.now().toEpochMilli();
        long windowMs = 60_000L;
        long cutoff = now - windowMs;

        // Używamy ClientIpResolver — bezpieczne wyciąganie IP (nie można sfałszować przez XFF)
        String key = clientIpResolver.resolve(request) + "|" + request.getRequestURI();
        Deque<Long> deque = windows.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());

        while (true) {
            Long head = deque.peekFirst();
            if (head == null || head >= cutoff) break;
            deque.pollFirst();
        }

        if (deque.size() >= maxRequestsPerMinute) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json; charset=utf-8");
            response.getWriter().write("{\"status\":429,\"message\":\"Rate limit exceeded. Retry after 60s.\"}");
            return;
        }

        deque.addLast(now);
        filterChain.doFilter(request, response);
    }
}