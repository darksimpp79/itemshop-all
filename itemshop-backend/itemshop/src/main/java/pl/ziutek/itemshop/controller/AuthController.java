package pl.ziutek.itemshop.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import pl.ziutek.itemshop.model.AuthCode;
import pl.ziutek.itemshop.model.BlacklistedToken;
import pl.ziutek.itemshop.model.Owner;
import pl.ziutek.itemshop.repository.BlacklistedTokenRepository;
import pl.ziutek.itemshop.repository.OwnerRepository;
import pl.ziutek.itemshop.security.AuthRateLimitService;
import pl.ziutek.itemshop.security.ClientIpResolver;
import pl.ziutek.itemshop.security.JwtUtil;
import pl.ziutek.itemshop.service.AuthCodeService;
import pl.ziutek.itemshop.service.EmailService;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private OwnerRepository ownerRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private AuthCodeService authCodeService;
    @Autowired private EmailService emailService;
    @Autowired private AuthRateLimitService authRateLimitService;
    @Autowired private BlacklistedTokenRepository blacklistedTokenRepository;
    @Autowired private ClientIpResolver clientIpResolver;

    private boolean isValidEmail(String email) {
        if (email == null) return false;
        String e = email.trim();
        return e.contains("@") && e.contains(".") && !e.contains(" ");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String email    = request.get("email");
        String password = request.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body("Brakuje emaila lub hasła!");
        }
        if (!isValidEmail(email)) {
            return ResponseEntity.badRequest().body("Podaj poprawny adres e-mail (np. nick@gmail.com).");
        }
        if (password.length() < 8) {
            return ResponseEntity.badRequest().body("Hasło musi mieć co najmniej 8 znaków.");
        }

        String normalizedEmail = email.trim().toLowerCase();

        if (!allowAuthAttempt("register", normalizedEmail, httpRequest, 5, 60)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Za dużo prób rejestracji. Spróbuj ponownie za chwilę.");
        }

        if (ownerRepository.findByEmail(normalizedEmail).isPresent()) {
            return ResponseEntity.badRequest().body("Ten email jest już w użyciu!");
        }

        long secondsToWait = authCodeService.secondsUntilResendAllowed(normalizedEmail, AuthCode.Purpose.REGISTER);
        if (secondsToWait > 0) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Poczekaj " + secondsToWait + "s przed ponowną wysyłką kodu.");
        }

        String passwordHash = passwordEncoder.encode(password);

        ResponseEntity<?> sendResult = sendCode(normalizedEmail, AuthCode.Purpose.REGISTER, passwordHash, "rejestracja konta");
        if (!sendResult.getStatusCode().is2xxSuccessful()) return sendResult;

        return ResponseEntity.ok("Kod weryfikacyjny wysłany na adres " + normalizedEmail + ". Potwierdź konto w ciągu 10 minut.");
    }

    @PostMapping("/register/verify")
    public ResponseEntity<?> verifyRegistration(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String email = request.get("email");
        String code  = request.get("code");

        if (email == null || code == null) {
            return ResponseEntity.badRequest().body("Brakuje emaila lub kodu!");
        }
        if (!isValidEmail(email)) {
            return ResponseEntity.badRequest().body("Podaj poprawny adres e-mail.");
        }

        String normalizedEmail = email.trim().toLowerCase();

        if (!allowAuthAttempt("register_verify", normalizedEmail, httpRequest, 10, 600)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Za dużo prób weryfikacji kodu. Odczekaj chwilę.");
        }

        Optional<AuthCode> verifiedCode = authCodeService.verifyCodeAndGet(
                normalizedEmail, AuthCode.Purpose.REGISTER, code.trim()
        );
        if (verifiedCode.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Niepoprawny lub wygasły kod.");
        }
        if (ownerRepository.findByEmail(normalizedEmail).isPresent()) {
            return ResponseEntity.badRequest().body("Ten email jest już w użyciu!");
        }

        String passwordHash = verifiedCode.get().getPendingPasswordHash();
        if (passwordHash == null || passwordHash.isBlank()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Brak danych rejestracji. Spróbuj ponownie wykonać /api/auth/register.");
        }

        Owner newOwner = new Owner();
        newOwner.setEmail(normalizedEmail);
        newOwner.setPassword(passwordHash);
        newOwner.setRole("USER");
        newOwner.setEmailVerified(true);
        newOwner.setTwoFactorEnabled(false);
        ownerRepository.save(newOwner);

        return ResponseEntity.ok("Konto zostało potwierdzone i utworzone. Możesz się zalogować.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String email    = request.get("email");
        String password = request.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body("Brakuje emaila lub hasła!");
        }
        if (!isValidEmail(email)) {
            return ResponseEntity.status(401).body("Błędny email lub hasło!");
        }

        String normalizedEmail = email.trim().toLowerCase();

        if (!allowAuthAttempt("login", normalizedEmail, httpRequest, 10, 60)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Za dużo prób logowania. Spróbuj ponownie za chwilę.");
        }

        Optional<Owner> ownerOpt = ownerRepository.findByEmail(normalizedEmail);
        if (ownerOpt.isEmpty() || !passwordEncoder.matches(password, ownerOpt.get().getPassword())) {
            return ResponseEntity.status(401).body("Błędny email lub hasło!");
        }

        Owner owner = ownerOpt.get();

        if (!owner.isEmailVerified()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Najpierw potwierdź konto kodem z maila.");
        }

        if (owner.isTwoFactorEnabled()) {
            long secondsToWait = authCodeService.secondsUntilResendAllowed(owner.getEmail(), AuthCode.Purpose.LOGIN_2FA);
            if (secondsToWait > 0) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body("Poczekaj " + secondsToWait + "s przed kolejną próbą logowania 2FA.");
            }
            ResponseEntity<?> sendResult = sendCode(owner.getEmail(), AuthCode.Purpose.LOGIN_2FA, null, "logowanie 2FA");
            if (!sendResult.getStatusCode().is2xxSuccessful()) return sendResult;

            Map<String, Object> response = new HashMap<>();
            response.put("requires2fa", true);
            response.put("tempToken", jwtUtil.generatePre2faToken(owner.getEmail()));
            response.put("message", "Kod 2FA został wysłany na email.");
            return ResponseEntity.ok(response);
        }

        String token = jwtUtil.generateToken(owner.getEmail(), owner.getRole());

        Map<String, Object> response = new HashMap<>();
        response.put("requires2fa", false);
        response.put("token", token);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login/verify-2fa")
    public ResponseEntity<?> verifyLogin2fa(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String tempToken = request.get("tempToken");
        String code      = request.get("code");

        if (tempToken == null || code == null) {
            return ResponseEntity.badRequest().body("Brakuje tempToken lub kodu.");
        }
        if (!jwtUtil.isTokenValid(tempToken) || !jwtUtil.isPre2faToken(tempToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Nieprawidłowy lub wygasły tempToken.");
        }

        String email = jwtUtil.extractEmail(tempToken);

        if (!allowAuthAttempt("login_verify_2fa", email, httpRequest, 10, 600)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Za dużo prób kodu 2FA. Spróbuj później.");
        }
        if (!authCodeService.verifyCode(email, AuthCode.Purpose.LOGIN_2FA, code.trim())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Niepoprawny lub wygasły kod 2FA.");
        }

        Optional<Owner> ownerOpt = ownerRepository.findByEmail(email);
        if (ownerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Użytkownik nie istnieje.");
        }

        String token = jwtUtil.generateToken(email, ownerOpt.get().getRole());
        return ResponseEntity.ok(Map.of("token", token));
    }

    /**
     * Logout — unieważnia token JWT przez dodanie jego JTI do blacklisty.
     * Token przestaje działać natychmiast, nawet jeśli nie wygasł.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest httpRequest) {
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.badRequest().body("Brak tokenu do unieważnienia.");
        }

        String token = authHeader.substring(7);
        if (!jwtUtil.isTokenValid(token)) {
            // Token już wygasły lub niepoprawny — z perspektywy bezpieczeństwa OK
            return ResponseEntity.ok("Wylogowano.");
        }

        try {
            String jti = jwtUtil.extractJti(token);
            if (jti != null && !blacklistedTokenRepository.existsByJti(jti)) {
                BlacklistedToken blacklisted = new BlacklistedToken(
                        jti,
                        jwtUtil.extractExpiration(token)
                );
                blacklistedTokenRepository.save(blacklisted);
            }
        } catch (Exception e) {
            // Logujemy ale nie zwracamy błędu — użytkownik i tak jest "wylogowany" z perspektywy frontu
            // (wyrzuca token z localStorage). Nie ujawniamy szczegółów błędu.
        }

        return ResponseEntity.ok("Wylogowano pomyślnie.");
    }

    @PostMapping("/register/resend-code")
    public ResponseEntity<?> resendRegisterCode(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String email    = request.get("email");
        String password = request.get("password");

        if (email == null || !isValidEmail(email)) {
            return ResponseEntity.badRequest().body("Podaj poprawny email.");
        }
        String normalizedEmail = email.trim().toLowerCase();

        if (ownerRepository.findByEmail(normalizedEmail).isPresent()) {
            return ResponseEntity.badRequest().body("To konto już istnieje.");
        }
        if (!allowAuthAttempt("register_resend", normalizedEmail, httpRequest, 3, 600)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Za dużo próśb o kod. Spróbuj później.");
        }

        long secondsToWait = authCodeService.secondsUntilResendAllowed(normalizedEmail, AuthCode.Purpose.REGISTER);
        if (secondsToWait > 0) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Poczekaj " + secondsToWait + "s przed ponowną wysyłką kodu.");
        }

        String pendingPasswordHash = authCodeService.getLatestCode(normalizedEmail, AuthCode.Purpose.REGISTER)
                .map(AuthCode::getPendingPasswordHash)
                .orElse(null);

        if ((pendingPasswordHash == null || pendingPasswordHash.isBlank()) && (password == null || password.isBlank())) {
            return ResponseEntity.badRequest().body("Podaj hasło, aby ponownie wysłać kod.");
        }
        if (pendingPasswordHash == null || pendingPasswordHash.isBlank()) {
            pendingPasswordHash = passwordEncoder.encode(password);
        }

        ResponseEntity<?> sendResult = sendCode(normalizedEmail, AuthCode.Purpose.REGISTER, pendingPasswordHash, "rejestracja konta");
        if (!sendResult.getStatusCode().is2xxSuccessful()) return sendResult;
        return ResponseEntity.ok("Wysłaliśmy nowy kod rejestracyjny.");
    }

    @PostMapping("/login/resend-2fa-code")
    public ResponseEntity<?> resendLogin2faCode(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String tempToken = request.get("tempToken");

        if (tempToken == null || !jwtUtil.isTokenValid(tempToken) || !jwtUtil.isPre2faToken(tempToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Nieprawidłowy lub wygasły tempToken.");
        }

        String email = jwtUtil.extractEmail(tempToken);

        if (!allowAuthAttempt("login_resend_2fa", email, httpRequest, 3, 600)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Za dużo próśb o kod 2FA. Spróbuj później.");
        }

        long secondsToWait = authCodeService.secondsUntilResendAllowed(email, AuthCode.Purpose.LOGIN_2FA);
        if (secondsToWait > 0) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Poczekaj " + secondsToWait + "s przed ponowną wysyłką kodu.");
        }

        ResponseEntity<?> sendResult = sendCode(email, AuthCode.Purpose.LOGIN_2FA, null, "logowanie 2FA");
        if (!sendResult.getStatusCode().is2xxSuccessful()) return sendResult;
        return ResponseEntity.ok("Wysłaliśmy nowy kod 2FA.");
    }

    @PostMapping("/2fa/enable/request")
    public ResponseEntity<?> requestEnable2fa() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Owner> ownerOpt = ownerRepository.findByEmail(email);
        if (ownerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Brak użytkownika.");
        }

        AuthCode code = authCodeService.createCode(email, AuthCode.Purpose.ENABLE_2FA, null);
        try {
            emailService.sendAuthCode(email, code.getCodeHash(), "włączenie 2FA");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Nie udało się wysłać kodu 2FA.");
        }
        return ResponseEntity.ok("Kod do włączenia 2FA wysłany na email.");
    }

    @PostMapping("/2fa/enable/confirm")
    public ResponseEntity<?> confirmEnable2fa(@RequestBody Map<String, String> request) {
        String code = request.get("code");
        if (code == null) {
            return ResponseEntity.badRequest().body("Brakuje kodu.");
        }

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!authCodeService.verifyCode(email, AuthCode.Purpose.ENABLE_2FA, code.trim())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Niepoprawny kod.");
        }

        return ownerRepository.findByEmail(email).map(owner -> {
            owner.setTwoFactorEnabled(true);
            ownerRepository.save(owner);
            return ResponseEntity.ok("2FA zostało włączone.");
        }).orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Brak użytkownika."));
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<?> disable2fa() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return ownerRepository.findByEmail(email).map(owner -> {
            owner.setTwoFactorEnabled(false);
            ownerRepository.save(owner);
            return ResponseEntity.ok("2FA zostało wyłączone.");
        }).orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Brak użytkownika."));
    }

    @GetMapping("/2fa/status")
    public ResponseEntity<?> status2fa() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return ownerRepository.findByEmail(email)
                .<ResponseEntity<?>>map(owner -> ResponseEntity.ok(Map.of(
                        "twoFactorEnabled", owner.isTwoFactorEnabled(),
                        "emailVerified", owner.isEmailVerified()
                )))
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Brak użytkownika."));
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private ResponseEntity<?> sendCode(String email, AuthCode.Purpose purpose, String pendingPasswordHash, String reason) {
        AuthCode code = authCodeService.createCode(email, purpose, pendingPasswordHash);
        try {
            emailService.sendAuthCode(email, code.getCodeHash(), reason);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            // Logowanie po stronie serwera — klient nie dostaje szczegółów błędu SMTP
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Nie udało się wysłać maila z kodem. Sprawdź konfigurację SMTP.");
        }
    }

    private boolean allowAuthAttempt(String action, String email, HttpServletRequest request, int max, long windowSeconds) {
        String ip = clientIpResolver.resolve(request);
        String key = "auth:" + action + ":" + ip + ":" + email;
        return authRateLimitService.tryConsume(key, max, windowSeconds);
    }
}