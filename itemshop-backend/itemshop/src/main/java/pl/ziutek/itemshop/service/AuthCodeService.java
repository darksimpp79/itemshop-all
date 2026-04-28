package pl.ziutek.itemshop.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.ziutek.itemshop.model.AuthCode;
import pl.ziutek.itemshop.repository.AuthCodeRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class AuthCodeService {
    private static final long RESEND_COOLDOWN_SECONDS = 60;

    private final AuthCodeRepository authCodeRepository;

    public AuthCodeService(AuthCodeRepository authCodeRepository) {
        this.authCodeRepository = authCodeRepository;
    }

    /**
     * Tworzy nowy kod, zapisuje jego HASH do bazy, a zwraca obiekt z plaintextem w polu codeHash
     * wyłącznie do jednorazowej wysyłki mailem. Używamy osobnego obiektu (nie zarządzanego przez JPA),
     * żeby uniknąć przypadkowego zapisania plaintextu do bazy przez dirty-checking Hibernate.
     */
    @Transactional
    public AuthCode createCode(String email, AuthCode.Purpose purpose, String pendingPasswordHash) {
        String plaintextCode = generateCode();
        String normalizedEmail = email.trim().toLowerCase();

        invalidateActiveCodes(normalizedEmail, purpose);

        AuthCode authCode = new AuthCode();
        authCode.setEmail(normalizedEmail);
        authCode.setPurpose(purpose);
        authCode.setCodeHash(hash(plaintextCode));   // do bazy trafia HASH
        authCode.setPendingPasswordHash(pendingPasswordHash);
        authCode.setCreatedAt(LocalDateTime.now());
        authCode.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        authCode.setAttempts(0);
        authCode.setMaxAttempts(5);
        authCode.setUsed(false);

        authCodeRepository.save(authCode);

        // FIX: zwracamy nowy, niezarządzany przez JPA obiekt z plaintextem — oryginał pozostaje z hashem.
        // Dzięki temu dirty-checking Hibernate nie może przypadkowo nadpisać hasha plaintextem.
        AuthCode result = new AuthCode();
        result.setId(authCode.getId());
        result.setEmail(authCode.getEmail());
        result.setPurpose(authCode.getPurpose());
        result.setCodeHash(plaintextCode);             // plaintext tylko do wysyłki mailem
        result.setPendingPasswordHash(pendingPasswordHash);
        result.setCreatedAt(authCode.getCreatedAt());
        result.setExpiresAt(authCode.getExpiresAt());
        result.setAttempts(authCode.getAttempts());
        result.setMaxAttempts(authCode.getMaxAttempts());
        result.setUsed(authCode.isUsed());
        return result;
    }

    public boolean verifyCode(String email, AuthCode.Purpose purpose, String code) {
        Optional<AuthCode> codeOpt = authCodeRepository
                .findTopByEmailAndPurposeAndUsedFalseOrderByIdDesc(email.trim().toLowerCase(), purpose);

        if (codeOpt.isEmpty()) return false;

        AuthCode authCode = codeOpt.get();
        if (authCode.getExpiresAt().isBefore(LocalDateTime.now())) return false;
        if (authCode.getAttempts() >= authCode.getMaxAttempts()) return false;

        authCode.setAttempts(authCode.getAttempts() + 1);
        boolean valid = authCode.getCodeHash().equals(hash(code));
        if (valid) {
            authCode.setUsed(true);
        }
        authCodeRepository.save(authCode);
        return valid;
    }

    public Optional<AuthCode> verifyCodeAndGet(String email, AuthCode.Purpose purpose, String code) {
        Optional<AuthCode> codeOpt = authCodeRepository
                .findTopByEmailAndPurposeAndUsedFalseOrderByIdDesc(email.trim().toLowerCase(), purpose);

        if (codeOpt.isEmpty()) return Optional.empty();

        AuthCode authCode = codeOpt.get();
        if (authCode.getExpiresAt().isBefore(LocalDateTime.now())) return Optional.empty();
        if (authCode.getAttempts() >= authCode.getMaxAttempts()) return Optional.empty();

        authCode.setAttempts(authCode.getAttempts() + 1);
        boolean valid = authCode.getCodeHash().equals(hash(code));
        if (!valid) {
            authCodeRepository.save(authCode);
            return Optional.empty();
        }

        authCode.setUsed(true);
        authCodeRepository.save(authCode);
        return Optional.of(authCode);
    }

    public Optional<AuthCode> getLatestActiveCode(String email, AuthCode.Purpose purpose) {
        return authCodeRepository.findTopByEmailAndPurposeAndUsedFalseOrderByIdDesc(
                email.trim().toLowerCase(),
                purpose
        );
    }

    public Optional<AuthCode> getLatestCode(String email, AuthCode.Purpose purpose) {
        return authCodeRepository.findTopByEmailAndPurposeOrderByIdDesc(
                email.trim().toLowerCase(),
                purpose
        );
    }

    public long secondsUntilResendAllowed(String email, AuthCode.Purpose purpose) {
        Optional<AuthCode> latest = getLatestCode(email, purpose);
        if (latest.isEmpty()) return 0;

        LocalDateTime allowedAt = latest.get().getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS);
        long seconds = java.time.Duration.between(LocalDateTime.now(), allowedAt).getSeconds();
        return Math.max(0, seconds);
    }

    @Transactional
    public void invalidateActiveCodes(String email, AuthCode.Purpose purpose) {
        var activeCodes = authCodeRepository.findByEmailAndPurposeAndUsedFalse(email, purpose);
        if (activeCodes.isEmpty()) return;

        for (AuthCode code : activeCodes) {
            code.setUsed(true);
        }
        authCodeRepository.saveAll(activeCodes);
    }

    private String generateCode() {
        int number = ThreadLocalRandom.current().nextInt(100000, 1000000);
        return Integer.toString(number);
    }

    private String hash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Brak SHA-256 w JVM", e);
        }
    }
}