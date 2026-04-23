package pl.ziutek.itemshop.service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import pl.ziutek.itemshop.controller.StorefrontController;
import pl.ziutek.itemshop.model.PendingItem;
import pl.ziutek.itemshop.model.Product;
import pl.ziutek.itemshop.model.Shop;
import pl.ziutek.itemshop.repository.PendingItemRepository;
import pl.ziutek.itemshop.repository.ProductRepository;
import pl.ziutek.itemshop.repository.ShopModeRepository;
import pl.ziutek.itemshop.repository.ShopRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class StorefrontService {

    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final PendingItemRepository itemRepository;
    private final ShopModeRepository shopModeRepository;

    public StorefrontService(
            ShopRepository shopRepository,
            ProductRepository productRepository,
            PendingItemRepository itemRepository,
            ShopModeRepository shopModeRepository
    ) {
        this.shopRepository = shopRepository;
        this.productRepository = productRepository;
        this.itemRepository = itemRepository;
        this.shopModeRepository = shopModeRepository;
    }

    public Optional<Shop> findShopByServerName(String serverName) {
        return shopRepository.findByServerNameIgnoreCase(serverName);
    }

    @Cacheable(cacheNames = "storefrontInfo", key = "#serverName.toLowerCase()")
    public StorefrontController.ShopInfoDTO getShopInfoDto(String serverName) {
        Shop shop = shopRepository.findByServerNameIgnoreCase(serverName)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono sklepu!"));

        return new StorefrontController.ShopInfoDTO(
                shop.getServerName(),
                shop.getServerIp(),
                shop.getTheme(),
                shop.getDiscordLink(),
                shop.getBannerText(),
                shop.getTermsContent()
        );
    }

    @Cacheable(cacheNames = "storefrontProducts", key = "#shop.id")
    public List<Product> getProductsForShop(Shop shop) {
        return productRepository.findByShop(shop);
    }

    @Cacheable(cacheNames = "storefrontModes", key = "#shop.id")
    public Object getModesForShop(Shop shop) {
        return shopModeRepository.findByShop(shop);
    }

    @Cacheable(cacheNames = "storefrontTop", key = "#serverName.toLowerCase()")
    public List<StorefrontController.TopDonatorDTO> getTopDonators(String serverName) {
        List<Object[]> results = itemRepository.findTopDonatorsByServer(serverName, PageRequest.of(0, 3));
        return results.stream()
                .map(result -> new StorefrontController.TopDonatorDTO(
                        (String) result[0],
                        BigDecimal.valueOf(((Number) result[1]).doubleValue())
                ))
                .collect(Collectors.toList());
    }

    @Cacheable(cacheNames = "storefrontRecent", key = "#serverName.toLowerCase()")
    public List<StorefrontController.RecentPurchaseDTO> getRecentPurchases(String serverName) {
        List<PendingItem> recent = itemRepository.findRecentPurchases(serverName, PageRequest.of(0, 10));
        return recent.stream()
                .map(item -> new StorefrontController.RecentPurchaseDTO(
                        item.getPlayerName(),
                        item.getItemName(),
                        "Przed chwilą"
                ))
                .distinct()
                .limit(5)
                .collect(Collectors.toList());
    }
}

