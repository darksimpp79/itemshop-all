package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.ziutek.itemshop.model.Shop;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {

    // Używane do weryfikacji API Key w komunikacji z pluginem/adminem
    Optional<Shop> findByApiKey(String apiKey);

    // Pobiera listę sklepów dla konkretnego konta w panelu admina
    List<Shop> findByOwnerEmail(String email);

    // --- NOWA METODA ---
    // Potrzebna do pobierania sklepu po nazwie (np. "AlicjaCraft")
    // Używamy jej w StorefrontController do obsługi darmowej nagrody
    Optional<Shop> findByServerName(String serverName);
    Optional<Shop> findByCustomDomain(String customDomain);
    Optional<Shop> findByServerNameIgnoreCase(String serverName);
}