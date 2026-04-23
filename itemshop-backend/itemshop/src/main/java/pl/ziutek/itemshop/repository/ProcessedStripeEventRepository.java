package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.ziutek.itemshop.model.ProcessedStripeEvent;

public interface ProcessedStripeEventRepository extends JpaRepository<ProcessedStripeEvent, String> {
}

