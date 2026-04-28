package pl.ziutek.itemshop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pl.ziutek.itemshop.model.ProcessedStripeEvent;

import java.time.LocalDateTime;

public interface ProcessedStripeEventRepository extends JpaRepository<ProcessedStripeEvent, String> {

    // Używane przez CleanupScheduler do usuwania starych eventów (>35 dni)
    @Modifying
    @Query("DELETE FROM ProcessedStripeEvent e WHERE e.processedAt < :cutoff")
    int deleteProcessedBefore(@Param("cutoff") LocalDateTime cutoff);
}