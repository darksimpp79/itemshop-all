package pl.ziutek.itemshop.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.util.Hashtable;

@Service
public class DnsVerificationService {

    private static final Logger log = LoggerFactory.getLogger(DnsVerificationService.class);


    @Value("${app.cname.target:cname.itemshop.pl}")
    private String expectedTarget;

    public boolean verifyDomain(String customDomain) {
        if (customDomain == null || customDomain.isBlank()) {
            return false;
        }
        
        // Remove protocol and trailing slashes if present
        String domain = customDomain.toLowerCase().trim()
                .replace("http://", "")
                .replace("https://", "")
                .split("/")[0];

        // 1. Omijamy sprawdzanie CNAME dla "localhost" (do testów lokalnych)
        if (domain.endsWith(".localhost") || domain.equals("localhost")) {
            log.info("Pomijam weryfikację DNS dla domeny lokalnej: {}", domain);
            return true;
        }

        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            DirContext ctx = new InitialDirContext(env);

            // Sprawdzamy CNAME
            Attributes attrs = ctx.getAttributes(domain, new String[]{"CNAME"});
            if (attrs.get("CNAME") != null) {
                String cnameValue = attrs.get("CNAME").get().toString();
                log.info("Znalazłem CNAME dla {}: {}", domain, cnameValue);
                // Niektóre serwery DNS zwracają CNAME z kropką na końcu (np. "cname.itemshop.pl.")
                if (cnameValue.endsWith(".")) {
                    cnameValue = cnameValue.substring(0, cnameValue.length() - 1);
                }
                return cnameValue.equalsIgnoreCase(expectedTarget);
            }
            
            // Jeśli nie znaleziono CNAME, sprawdzamy TXT dla domeny głównej 
            // (Cloudflare potrafi spłaszczać CNAME - tzw. CNAME flattening)
            // Zwykłe A recordy mogą być trudne w weryfikacji, jeśli mamy dynamiczne IP,
            // ale załóżmy na razie, że klient musi podać CNAME pod subdomenę.
            log.warn("Brak rekordu CNAME dla domeny: {}", domain);
            return false;

        } catch (Exception e) {
            log.error("Błąd podczas odpytywania DNS dla domeny {}: {}", domain, e.getMessage());
            return false;
        }
    }
}
