package pl.ziutek.itemshop.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class CloudflareService {

    @Value("${app.cname.target:cname.itemshop.pl}")
    private String cnameTarget;

    private final RestTemplate restTemplate = new RestTemplate();

    @SuppressWarnings("unchecked")
    public String findZoneIdForDomain(String accessToken, String customDomain) throws Exception {
        String url = "https://api.cloudflare.com/client/v4/zones";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.GET, request,
                new ParameterizedTypeReference<Map<String, Object>>() {});

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new Exception("Błąd pobierania stref Cloudflare.");
        }

        List<Map<String, Object>> results = (List<Map<String, Object>>) response.getBody().get("result");

        if (results == null || results.isEmpty()) {
            throw new Exception("Brak stref na koncie Cloudflare. Sprawdź uprawnienia tokenu (Zone:Read).");
        }

        String targetZoneId = null;
        int longestMatch = -1;

        for (Map<String, Object> zone : results) {
            String zoneName = (String) zone.get("name");
            if (zoneName != null && (customDomain.equals(zoneName) || customDomain.endsWith("." + zoneName))) {
                if (zoneName.length() > longestMatch) {
                    longestMatch = zoneName.length();
                    targetZoneId = (String) zone.get("id");
                }
            }
        }

        if (targetZoneId == null) {
            throw new Exception("Nie znaleziono strefy w Cloudflare dla domeny: " + customDomain +
                    ". Upewnij się, że domena jest dodana do Twojego konta Cloudflare.");
        }

        return targetZoneId;
    }

    public void addCnameRecord(String accessToken, String zoneId, String customDomain) throws Exception {
        String url = "https://api.cloudflare.com/client/v4/zones/" + zoneId + "/dns_records";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "type", "CNAME",
                "name", customDomain,
                "content", cnameTarget,
                "ttl", 1,
                "proxied", true
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new Exception("Nie udało się dodać rekordu DNS: " + response.getBody());
            }
        } catch (Exception e) {
            String error = e.getMessage() != null ? e.getMessage() : "";
            if (error.contains("already exists") || error.contains("81053")) {
                // Rekord już istnieje – ignorujemy, to nie błąd
                return;
            }
            throw new Exception("Błąd dodawania rekordu CNAME: " + error);
        }
    }
}
