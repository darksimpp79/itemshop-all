package pl.ziutek.itemshop.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private static final Logger log = LoggerFactory.getLogger(FileController.class);
    private static final List<String> ALLOWED_EXTENSIONS = List.of(
            ".jpg", ".jpeg", ".png", ".gif", ".webp"
    );

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${app.upload.dir:uploads/products/}")
    private String uploadDir;

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Plik jest pusty!");
        }

        String original = StringUtils.cleanPath(
                Objects.requireNonNullElse(file.getOriginalFilename(), "")
        );

        int dotIndex = original.lastIndexOf('.');
        if (dotIndex < 0) {
            return ResponseEntity.badRequest().body("Plik musi mieć rozszerzenie!");
        }
        String ext = original.substring(dotIndex).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            return ResponseEntity.badRequest()
                    .body("Niedozwolone rozszerzenie. Dozwolone: " + ALLOWED_EXTENSIONS);
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body("Plik musi być obrazem!");
        }

        try {
            Path root = Paths.get(uploadDir);
            if (!Files.exists(root)) Files.createDirectories(root);

            String fileName = UUID.randomUUID().toString() + ext;
            Files.copy(file.getInputStream(), root.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);

            return ResponseEntity.ok(Map.of("url", baseUrl + "/api/files/images/" + fileName));

        } catch (Exception e) {
            // FIX: logujemy szczegóły (ścieżka, komunikat systemowy) po stronie serwera,
            // klient dostaje bezpieczny ogólny komunikat bez wewnętrznych detali systemu plików.
            log.error("[FileController] Błąd zapisu pliku: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Nie udało się zapisać pliku. Spróbuj ponownie.");
        }
    }
}