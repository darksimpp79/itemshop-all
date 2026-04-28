package pl.ziutek.itemshop.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Sliding-window rate limiter dla endpointów autentykacji.
 *
 * UWAGA: Implementacja in-memory — dla multi-instance zastąp Redis.
 * Klucze łączą IP (przez ClientIpResolver) + email, co wymaga jednoczesnego
 * spełnienia obu warunków przez atakującego (trudniejsze do obejścia).
 */
@Service
public class AuthRateLimitService {

    private final Map<String, Deque<Long>> windows = new ConcurrentHashMap<>();

    public boolean tryConsume(String key, int maxRequests, long windowSeconds) {
        long now = Instant.now().toEpochMilli();
        long windowMs = windowSeconds * 1000L;
        long cutoff = now - windowMs;

        Deque<Long> deque = windows.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());

        while (true) {
            Long head = deque.peekFirst();
            if (head == null || head >= cutoff) break;
            deque.pollFirst();
        }

        if (deque.size() >= maxRequests) {
            return false;
        }

        deque.addLast(now);
        return true;
    }
}