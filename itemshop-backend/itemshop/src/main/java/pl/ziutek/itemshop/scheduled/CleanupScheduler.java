package pl.ziutek.itemshop.scheduled;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pl.ziutek.itemshop.repository.BlacklistedTokenRepository;
import pl.ziutek.itemshop.repository.OwnerRepository;
import pl.ziutek.itemshop.repository.ProcessedStripeEventRepository;

import java.time.LocalDateTime;

/**
 * Harmonogramowane zadania czyszczące dane które rosną bez końca:
 * - blacklisted_tokens: tokeny JWT po wylogowaniu — bezużyteczne po wygaśnięciu
 * - processed_stripe_events: idempotency keys Stripe — bezużyteczne po ~30 dniach
 */
@Component
public class CleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(CleanupScheduler.class);

    @Autowired
    private BlacklistedTokenRepository blacklistedTokenRepository;

    @Autowired
    private ProcessedStripeEventRepository processedStripeEventRepository;

    @Autowired
    private OwnerRepository ownerRepository;

    /**
     * Czyści wygasłe tokeny JWT z blacklisty — co godzinę.
     * Token na blackliście jest bezużyteczny po jego expiresAt, bo JwtFilter
     * i tak odrzuciłby token z powodu wygaśnięcia (przed sprawdzeniem blacklisty).
     */
    @Scheduled(fixedDelay = 3_600_000) // co 1h
    @Transactional
    public void cleanExpiredBlacklistedTokens() {
        LocalDateTime now = LocalDateTime.now();
        int deleted = blacklistedTokenRepository.deleteExpiredBefore(now);
        if (deleted > 0) {
            log.info("[Cleanup] Usunięto {} wygasłych tokenów z blacklisty.", deleted);
        }
    }

    /**
     * Czyści stare Stripe event IDs — co 24h.
     * Stripe gwarantuje unikalność eventów przez 30 dni, więc starsze rekordy
     * są bezużyteczne i tylko puchną tabelę.
     *
     * UWAGA: ProcessedStripeEvent nie ma pola createdAt w oryginalnym kodzie —
     * ma 'processedAt'. Używamy go do filtrowania.
     */
    /**
     * Co godzinę degraduje konta PRO których subscriptionExpiresAt już minął.
     * Backup dla webhooka customer.subscription.deleted — działa nawet gdy Stripe
     * nie dostarczy eventu (np. chwilowa niedostępność naszego endpointu).
     */
    @Scheduled(fixedDelay = 3_600_000) // co 1h
    @Transactional
    public void downgradeExpiredProAccounts() {
        var now = LocalDateTime.now();
        var expiredPro     = ownerRepository.findBySubscriptionPlanAndSubscriptionExpiresAtBefore("PRO",     now);
        var expiredStarter = ownerRepository.findBySubscriptionPlanAndSubscriptionExpiresAtBefore("STARTER", now);
        var expired = new java.util.ArrayList<>(expiredPro);
        expired.addAll(expiredStarter);
        if (expired.isEmpty()) return;
        for (var owner : expired) {
            owner.setSubscriptionPlan("FREE");
            owner.setSubscriptionExpiresAt(null);
            owner.setStripeSubscriptionId(null);
            ownerRepository.save(owner);
        }
        log.info("[Cleanup] Zdegradowano {} kont PRO z wygasłą subskrypcją.", expired.size());
    }

    @Scheduled(fixedDelay = 86_400_000) // co 24h
    @Transactional
    public void cleanOldStripeEvents() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(35); // 35 dni z marginesem
        int deleted = processedStripeEventRepository.deleteProcessedBefore(cutoff);
        if (deleted > 0) {
            log.info("[Cleanup] Usunięto {} starych eventów Stripe.", deleted);
        }
    }
}