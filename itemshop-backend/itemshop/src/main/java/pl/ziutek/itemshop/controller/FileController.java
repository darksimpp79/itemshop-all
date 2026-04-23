package pl.ziutek.itemshop.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final String UPLOAD_DIR = "uploads/products/";

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        try {
            Path root = Paths.get(UPLOAD_DIR);
            if (!Files.exists(root)) Files.createDirectories(root);

            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Files.copy(file.getInputStream(), root.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);

            // Zwracamy URL, który Twoja Twierdza wyświetli jako obrazek
            Map<String, String> response = new HashMap<>();
            response.put("url", "http://localhost:8080/api/files/images/" + fileName);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Błąd zapisu pliku: " + e.getMessage());
        }
    }
}