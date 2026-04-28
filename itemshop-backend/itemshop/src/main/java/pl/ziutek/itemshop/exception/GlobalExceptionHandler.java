package pl.ziutek.itemshop.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Centralny handler wyjątków — zapobiega wyciekaniu stack trace'ów i szczegółów
 * implementacji do klienta. Wszystkie nieoczekiwane błędy logowane są po stronie
 * serwera z pełnym kontekstem, a klient dostaje bezpieczny komunikat.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Błędy walidacji Bean Validation (@Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.toList());

        return ResponseEntity.badRequest().body(errorBody(
                HttpStatus.BAD_REQUEST.value(),
                "Błąd walidacji danych.",
                errors
        ));
    }

    // Plik za duży (skonfigurowane w application.properties: spring.servlet.multipart.max-file-size)
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(errorBody(
                HttpStatus.PAYLOAD_TOO_LARGE.value(),
                "Plik jest zbyt duży.",
                null
        ));
    }

    // Wszystkie nieoczekiwane wyjątki — logujemy pełny stos, klient dostaje ogólny komunikat
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        log.error("[GlobalExceptionHandler] Nieoczekiwany błąd: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Wystąpił błąd serwera. Spróbuj ponownie później.",
                null
        ));
    }

    private Map<String, Object> errorBody(int status, String message, List<String> details) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status);
        body.put("message", message);
        body.put("timestamp", LocalDateTime.now().toString());
        if (details != null && !details.isEmpty()) {
            body.put("details", details);
        }
        return body;
    }
}