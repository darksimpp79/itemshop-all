package pl.ziutek.itemshop.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Mapujemy URL /api/files/images/** na fizyczny folder na dysku
        registry.addResourceHandler("/api/files/images/**")
                .addResourceLocations("file:uploads/products/");
    }
}