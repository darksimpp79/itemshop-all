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
            throw new RuntimeException("Nie udało się wysłać maila z kodem.", e);
        }
    }

    public void sendPurchaseConfirmation(String email, String nick, String productName,
                                         String serverName, int pointsEarned, String promoCode) {
        Resend resend = new Resend(apiKey);

        String promoRow = (promoCode != null && !promoCode.isBlank())
                ? "<tr><td style='color:#888;padding:4px 0'>Kod promo:</td><td style='font-weight:bold'>%s</td></tr>".formatted(promoCode)
                : "";

        String html = """
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:16px;overflow:hidden">
                  <div style="background:#bbf028;padding:20px 32px">
                    <h1 style="margin:0;color:#000;font-size:22px;font-weight:900;letter-spacing:-0.5px">Zakup potwierdzony! 🎉</h1>
                  </div>
                  <div style="padding:32px">
                    <p style="color:#aaa;margin-top:0">Cześć <strong style="color:#fff">%s</strong>! Twój zakup został zrealizowany.</p>
                    <table style="width:100%%;border-collapse:collapse;margin:20px 0;font-size:14px">
                      <tr><td style="color:#888;padding:4px 0">Serwer:</td><td style="font-weight:bold">%s</td></tr>
                      <tr><td style="color:#888;padding:4px 0">Produkt:</td><td style="font-weight:bold">%s</td></tr>
                      %s
                      <tr><td style="color:#888;padding:4px 0">Zdobyte punkty:</td><td style="font-weight:bold;color:#bbf028">+%d PKT</td></tr>
                    </table>
                    <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin:20px 0">
                      <p style="margin:0;color:#888;font-size:13px">Aby odebrać nagrody, wejdź na serwer i wpisz:</p>
                      <p style="margin:8px 0 0;font-family:monospace;font-size:18px;color:#bbf028;font-weight:bold">/magazyn</p>
                    </div>
                    <p style="color:#444;font-size:11px;margin-top:24px">Ta wiadomość została wygenerowana automatycznie — nie odpowiadaj na nią.</p>
                  </div>
                </div>
                """.formatted(nick, serverName, productName, promoRow, pointsEarned);

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from(fromAddress)
                .to(email)
                .subject("✅ Zakup w sklepie %s — %s".formatted(serverName, productName))
                .html(html)
                .build();

        try {
            resend.emails().send(params);
            log.info("[Email] Potwierdzenie zakupu wysłane na: {} (gracz: {}, produkt: {})", email, nick, productName);
        } catch (ResendException e) {
            // Nie rzucamy wyjątku — email to bonus, nie blokujemy zakupu
            log.warn("[Email] Nie udało się wysłać potwierdzenia zakupu na {}: {}", email, e.getMessage());
        }
    }
}