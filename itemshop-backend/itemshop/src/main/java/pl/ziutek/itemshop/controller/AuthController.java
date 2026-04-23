package pl.ziutek.itemshop.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import pl.ziutek.itemshop.model.Owner;
import pl.ziutek.itemshop.repository.OwnerRepository;
import pl.ziutek.itemshop.security.JwtUtil;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private OwnerRepository ownerRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    private boolean isValidEmail(String email) {
        if (email == null) return false;
        String e = email.trim();
        return e.contains("@") && e.contains(".") && !e.contains(" ");
    }

    // 1. REJESTRACJA NOWEGO ZIUTKA
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body("Brakuje emaila lub hasła!");
        }

        if (!isValidEmail(email)) {
            return ResponseEntity.badRequest().body("Podaj poprawny adres e-mail (np. nick@gmail.com).");
        }

        // Sprawdzamy, czy ktoś już nie zajął tego maila
        if (ownerRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body("Ten email jest już w użyciu!");
        }

        // Tworzymy konto i SZYFRUJEMY hasło (algorytm BCrypt)
        Owner newOwner = new Owner();
        newOwner.setEmail(email);
        newOwner.setPassword(passwordEncoder.encode(password));
        newOwner.setRole("USER");

        ownerRepository.save(newOwner);

        return ResponseEntity.ok("Konto założone pomyślnie! Możesz się zalogować.");
    }

    // 2. LOGOWANIE I ODBIÓR TOKENA JWT
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body("Brakuje emaila lub hasła!");
        }
        if (!isValidEmail(email)) {
            return ResponseEntity.status(401).body("Błędny email lub hasło!");
        }

        Optional<Owner> ownerOpt = ownerRepository.findByEmail(email);

        // Sprawdzamy, czy konto istnieje oraz czy podane hasło pasuje do szyfru w bazie
        if (ownerOpt.isEmpty() || !passwordEncoder.matches(password, ownerOpt.get().getPassword())) {
            return ResponseEntity.status(401).body("Błędny email lub hasło!");
        }

        // Jeśli wszystko gra, generujemy kryptograficzny token ważny przez 24 godziny!
        String token = jwtUtil.generateToken(email);

        // Zwracamy go jako JSON
        Map<String, String> response = new HashMap<>();
        response.put("token", token);

        return ResponseEntity.ok(response);
    }
}