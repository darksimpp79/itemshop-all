package pl.ziutek.itemshop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableCaching
@EnableScheduling  // FIX: wymagane przez CleanupScheduler (@Scheduled nie działa bez tego)
public class ItemshopApplication {

	public static void main(String[] args) {
		SpringApplication.run(ItemshopApplication.class, args);
	}
}