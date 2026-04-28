package pl.ziutek.itemshop.dto;

import java.util.List;

/**
 * Ustandaryzowana odpowiedź paginowana zwracana przez endpointy admina.
 * Pozwala frontendowi wiedzieć ile jest stron, aktualną stronę i total rekordów
 * bez ładowania wszystkich danych do pamięci.
 */
public record PageableResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last
) {
    public static <T> PageableResponse<T> of(org.springframework.data.domain.Page<T> page) {
        return new PageableResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast()
        );
    }
}