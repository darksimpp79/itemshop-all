package pl.ziutek.itemshop.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class CacheConfig {

    @Value("${app.cache.storefront.info-ttl-seconds:30}")
    private long infoTtlSeconds;

    @Value("${app.cache.storefront.products-ttl-seconds:30}")
    private long productsTtlSeconds;

    @Value("${app.cache.storefront.modes-ttl-seconds:30}")
    private long modesTtlSeconds;

    @Value("${app.cache.storefront.top-ttl-seconds:15}")
    private long topTtlSeconds;

    @Value("${app.cache.storefront.recent-ttl-seconds:10}")
    private long recentTtlSeconds;

    @Bean
    public CacheManager cacheManager() {
        Map<String, Duration> ttls = new ConcurrentHashMap<>();
        ttls.put("storefrontInfo", Duration.ofSeconds(infoTtlSeconds));
        ttls.put("storefrontProducts", Duration.ofSeconds(productsTtlSeconds));
        ttls.put("storefrontModes", Duration.ofSeconds(modesTtlSeconds));
        ttls.put("storefrontTop", Duration.ofSeconds(topTtlSeconds));
        ttls.put("storefrontRecent", Duration.ofSeconds(recentTtlSeconds));

        CaffeineCacheManager manager = new CaffeineCacheManager() {
            @Override
            protected com.github.benmanes.caffeine.cache.Cache<Object, Object> createNativeCaffeineCache(String name) {
                Duration ttl = ttls.getOrDefault(name, Duration.ofSeconds(30));
                return Caffeine.newBuilder()
                        .expireAfterWrite(ttl)
                        .maximumSize(10_000)
                        .build();
            }
        };

        manager.setCacheNames(ttls.keySet());
        return manager;
    }
}
