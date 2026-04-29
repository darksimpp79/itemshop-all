package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.ziutek.itemshop.model.Owner;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OwnerRepository extends JpaRepository<Owner, Long> {
    Optional<Owner> findByEmail(String email);
    Optional<Owner> findByStripeCustomerId(String stripeCustomerId);
    List<Owner> findBySubscriptionPlanAndSubscriptionExpiresAtBefore(String plan, LocalDateTime cutoff);
}