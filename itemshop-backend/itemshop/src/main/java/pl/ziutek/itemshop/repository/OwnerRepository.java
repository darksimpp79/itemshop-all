package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.ziutek.itemshop.model.Owner;

import java.util.Optional;

@Repository
public interface OwnerRepository extends JpaRepository<Owner, Long> {
    // Ta metoda pozwoli nam szukać Ziutka po jego mailu podczas logowania!
    Optional<Owner> findByEmail(String email);
}