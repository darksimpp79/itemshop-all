package pl.ziutek.itemshop.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Bezpieczne wyciąganie IP klienta z requestu.
 *
 * Problem: X-Forwarded-For może być sfałszowany przez klienta jeśli serwer
 * jest dostępny bezpośrednio (bez proxy). Czytamy go TYLKO gdy request pochodzi
 * z zaufanego IP proxy (np. nginx, Cloudflare, load balancer).
 *
 * Konfiguracja w application.properties:
 *   app.security.trusted-proxy-ips=127.0.0.1,::1,10.0.0.1
 *
 * Dla Cloudflare dodaj zakresy: https://www.cloudflare.com/ips/
 */
@Component
public class ClientIpResolver {

    private final Set<String> trustedProxies;

    public ClientIpResolver(
            @Value("${app.security.trusted-proxy-ips:127.0.0.1,::1,0:0:0:0:0:0:0:1}") String trustedProxyIps
    ) {
        this.trustedProxies = Arrays.stream(trustedProxyIps.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toSet());
    }

    /**
     * Zwraca prawdziwe IP klienta.
     * Jeśli request pochodzi z zaufanego proxy — bierze pierwszy IP z X-Forwarded-For.
     * W przeciwnym razie — używa bezpośrednio RemoteAddr (nie można go sfałszować).
     */
    public String resolve(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();

        if (trustedProxies.contains(remoteAddr)) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                int idx = xff.indexOf(',');
                String clientIp = (idx > 0 ? xff.substring(0, idx) : xff).trim();
                if (!clientIp.isBlank()) {
                    return clientIp;
                }
            }
        }

        return remoteAddr;
    }
}