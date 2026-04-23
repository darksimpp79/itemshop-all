package pl.ziutek.itemshop.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    /**
     * Simple in-memory sliding window limiter.
     * Good enough for MVP. For multi-instance prod use Redis/Bucket4j etc.
     */
    private final Map<String, Deque<Long>> windows = new ConcurrentHashMap<>();

    @Value("${app.ratelimit.storefront.max-requests-per-minute:120}")
    private int maxRequestsPerMinute;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/storefront/")) return true;

        String method = request.getMethod();
        // Only rate-limit read-heavy public traffic
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

        String key = clientIp(request) + "|" + request.getRequestURI();
        Deque<Long> deque = windows.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());

        // Trim old timestamps
        while (true) {
            Long head = deque.peekFirst();
            if (head == null || head >= cutoff) break;
            deque.pollFirst();
        }

        if (deque.size() >= maxRequestsPerMinute) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", "60");
            response.setContentType("text/plain; charset=utf-8");
            response.getWriter().write("Rate limit exceeded.");
            return;
        }

        deque.addLast(now);
        filterChain.doFilter(request, response);
    }

    private String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            // First IP in chain
            int idx = xff.indexOf(',');
            return (idx > 0 ? xff.substring(0, idx) : xff).trim();
        }
        return request.getRemoteAddr();
    }
}

