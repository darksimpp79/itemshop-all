package pl.ziutek.itemshop.controller;

import com.stripe.Stripe;
import com.stripe.model.Account;
import com.stripe.model.AccountLink;
import com.stripe.param.AccountCreateParams;
import com.stripe.param.AccountLinkCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import pl.ziutek.itemshop.model.Owner;
import pl.ziutek.itemshop.repository.OwnerRepository;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/stripe")
public class StripeConnectController {

    private static final Logger log = LoggerFactory.getLogger(StripeConnectController.class);

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    @Value("${app.frontend.base-url:https://pumpking.club}")
    private String frontendBaseUrl;

    @Autowired
    private OwnerRepository ownerRepository;

    // POST /api/admin/stripe/connect/start?shopId=1
    // Tworzy Express account + zwraca URL do onboardingu Stripe
    @PostMapping("/connect/start")
    public ResponseEntity<?> startConnect(@RequestParam Long shopId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Owner> ownerOpt = ownerRepository.findByEmail(email);
        if (ownerOpt.isEmpty()) return ResponseEntity.status(404).body("Brak konta.");
        Owner owner = ownerOpt.get();

        Stripe.apiKey = stripeApiKey;
        try {
            String accountId = owner.getStripeConnectAccountId();

            // Jeśli nie ma jeszcze konta Express — utwórz
            if (accountId == null || accountId.isBlank()) {
                Account account = Account.create(AccountCreateParams.builder()
                        .setType(AccountCreateParams.Type.EXPRESS)
                        .setCountry("PL")
                        .setEmail(email)
                        .setCapabilities(AccountCreateParams.Capabilities.builder()
                                .setCardPayments(AccountCreateParams.Capabilities.CardPayments.builder()
                                        .setRequested(true).build())
                                .setTransfers(AccountCreateParams.Capabilities.Transfers.builder()
                                        .setRequested(true).build())
                                .build())
                        .build());
                accountId = account.getId();
                owner.setStripeConnectAccountId(accountId);
                ownerRepository.save(owner);
                log.info("[StripeConnect] Nowe konto Express {} dla {}", accountId, email);
            }

            // Zawsze generuj świeży link onboardingu
            AccountLink link = AccountLink.create(AccountLinkCreateParams.builder()
                    .setAccount(accountId)
                    .setRefreshUrl(frontendBaseUrl + "/admin/shop/" + shopId + "?stripe=refresh")
                    .setReturnUrl(frontendBaseUrl + "/admin/shop/" + shopId + "?stripe=success")
                    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                    .build());

            return ResponseEntity.ok(Map.of("url", link.getUrl()));
        } catch (Exception e) {
            log.error("[StripeConnect] Błąd onboardingu dla {}: {}", email, e.getMessage(), e);
            return ResponseEntity.status(500).body("Błąd połączenia ze Stripe.");
        }
    }

    // GET /api/admin/stripe/connect/status
    // Zwraca status połączenia + czy charges_enabled
    @GetMapping("/connect/status")
    public ResponseEntity<?> getStatus() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Owner> ownerOpt = ownerRepository.findByEmail(email);
        if (ownerOpt.isEmpty()) return ResponseEntity.status(404).body("Brak konta.");
        Owner owner = ownerOpt.get();

        String accountId = owner.getStripeConnectAccountId();
        if (accountId == null || accountId.isBlank()) {
            return ResponseEntity.ok(Map.of("connected", false, "chargesEnabled", false));
        }

        Stripe.apiKey = stripeApiKey;
        try {
            Account account = Account.retrieve(accountId);
            boolean chargesEnabled = Boolean.TRUE.equals(account.getChargesEnabled());

            // Zaktualizuj flagę w bazie jeśli zmieniło się
            if (chargesEnabled != owner.isStripeConnectEnabled()) {
                owner.setStripeConnectEnabled(chargesEnabled);
                ownerRepository.save(owner);
            }

            return ResponseEntity.ok(Map.of(
                    "connected", true,
                    "chargesEnabled", chargesEnabled,
                    "accountId", accountId
            ));
        } catch (Exception e) {
            log.error("[StripeConnect] Błąd pobierania statusu dla {}: {}", email, e.getMessage(), e);
            return ResponseEntity.ok(Map.of("connected", true, "chargesEnabled", owner.isStripeConnectEnabled()));
        }
    }

    // DELETE /api/admin/stripe/connect
    // Odłącza konto Stripe Connect (nie usuwa konta w Stripe — to musi zrobić właściciel)
    @DeleteMapping("/connect")
    public ResponseEntity<?> disconnect() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Owner> ownerOpt = ownerRepository.findByEmail(email);
        if (ownerOpt.isEmpty()) return ResponseEntity.status(404).body("Brak konta.");
        Owner owner = ownerOpt.get();

        owner.setStripeConnectAccountId(null);
        owner.setStripeConnectEnabled(false);
        ownerRepository.save(owner);
        log.info("[StripeConnect] Odłączono konto Stripe dla {}", email);
        return ResponseEntity.ok(Map.of("message", "Konto Stripe zostało odłączone."));
    }
}
