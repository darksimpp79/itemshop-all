package pl.ziutek.itemshop.service;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Value("${resend.api-key}")
    private String apiKey;

    @Value("${app.mail.from:ZiutekShop <noreply@twojadomena.pl>}")
    private String fromAddress;

    public void sendAuthCode(String email, String code, String reason) {
        Resend resend = new Resend(apiKey);

        String html = """
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                  <h2 style="color: #1a1a1a;">Kod weryfikacyjny</h2>
                  <p>Akcja: <strong>%s</strong></p>
                  <div style="background: #f4f4f4; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111;">%s</span>
                  </div>
                  <p style="color: #666; font-size: 14px;">Kod wygasa po 10 minutach. Jeśli to nie Ty — zignoruj tę wiadomość.</p>
                </div>
                """.formatted(reason, code);

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from(fromAddress)
                .to(email)
                .subject("ZiutekShop — kod weryfikacyjny")
                .html(html)
                .build();

        try {
            resend.emails().send(params);
            log.info("[Email] Wysłano kod weryfikacyjny na: {}", email);
        } catch (ResendException e) {
            log.error("[Email] Błąd wysyłki na {}: {}", email, e.getMessage(), e);
            // Rzucamy runtime exception żeby kontroler mógł zwrócić 500
            throw new RuntimeException("Nie udało się wysłać maila z kodem.", e);
        }
    }
}