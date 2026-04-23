package pl.ziutek.itemshop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class ItemshopApplication {

	public static void main(String[] args) {
		SpringApplication.run(ItemshopApplication.class, args);
	}
}
