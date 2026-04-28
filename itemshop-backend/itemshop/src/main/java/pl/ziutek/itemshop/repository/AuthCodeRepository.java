package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.ziutek.itemshop.model.AuthCode;

import java.util.Optional;

@Repository
public interface AuthCodeRepository extends JpaRepository<AuthCode, Long> {
    Optional<AuthCode> findTopByEmailAndPurposeAndUsedFalseOrderByIdDesc(String email, AuthCode.Purpose purpose);
    Optional<AuthCode> findTopByEmailAndPurposeOrderByIdDesc(String email, AuthCode.Purpose purpose);
    java.util.List<AuthCode> findByEmailAndPurposeAndUsedFalse(String email, AuthCode.Purpose purpose);
}
