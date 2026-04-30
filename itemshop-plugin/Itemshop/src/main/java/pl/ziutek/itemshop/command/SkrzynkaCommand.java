package pl.ziutek.itemshop.command;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.inventory.InventoryCloseEvent;
import pl.ziutek.itemshop.Itemshop;
import pl.ziutek.itemshop.gui.LootboxAnimation;
import pl.ziutek.itemshop.model.LootboxReward;
import pl.ziutek.itemshop.model.WalletResponse;

import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

public class SkrzynkaCommand implements CommandExecutor, TabCompleter, Listener {

    private final Itemshop plugin;
    private final Gson gson = new Gson();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(5))
            .build();

    private static final int LOOTBOX_COST = 500;

    public SkrzynkaCommand(Itemshop plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage("Komenda tylko dla graczy!");
            return true;
        }

        if (LootboxAnimation.isActive(player.getUniqueId())) {
            player.sendMessage(Component.text("✗ Skrzynka jest już otwarta!")
                    .color(NamedTextColor.RED));
            return true;
        }

        player.sendMessage(
                Component.text("✦ ").color(TextColor.color(0xffcc00))
                        .append(Component.text("Sprawdzam portfel...").color(TextColor.color(0x888888)))
        );

        String nick = player.getName();
        String baseUrl = plugin.getApiBaseUrl() + "/storefront/" + plugin.getServerName();

        // 1. Sprawdź portfel gracza
        HttpRequest walletReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/wallet/" + nick))
                .timeout(java.time.Duration.ofSeconds(5))
                .GET().build();

        // 2. Pobierz listę nagród (do animacji)
        HttpRequest rewardsReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/lootbox-nagrody"))
                .timeout(java.time.Duration.ofSeconds(5))
                .GET().build();

        CompletableFuture<HttpResponse<String>> walletFuture  = http.sendAsync(walletReq,  HttpResponse.BodyHandlers.ofString());
        CompletableFuture<HttpResponse<String>> rewardsFuture = http.sendAsync(rewardsReq, HttpResponse.BodyHandlers.ofString());

        CompletableFuture.allOf(walletFuture, rewardsFuture).thenRun(() -> {
            try {
                HttpResponse<String> walletRes  = walletFuture.get();
                HttpResponse<String> rewardsRes = rewardsFuture.get();

                // Sprawdź punkty
                if (walletRes.statusCode() != 200) {
                    player.sendMessage(Component.text("✗ Nie masz jeszcze żadnych punktów! Kup coś w sklepie, aby je zdobyć.")
                            .color(NamedTextColor.RED));
                    return;
                }

                WalletResponse wallet = gson.fromJson(walletRes.body(), WalletResponse.class);
                if (wallet.points < LOOTBOX_COST) {
                    player.sendMessage(
                            Component.text("✗ Za mało punktów! ").color(NamedTextColor.RED)
                                    .append(Component.text("Masz: ").color(TextColor.color(0x888888)))
                                    .append(Component.text(wallet.points + " PKT").color(TextColor.color(0xffcc00)).decorate(TextDecoration.BOLD))
                                    .append(Component.text(", potrzeba: ").color(TextColor.color(0x888888)))
                                    .append(Component.text(LOOTBOX_COST + " PKT").color(TextColor.color(0xffcc00)))
                    );
                    return;
                }

                // Pobierz listę nagród do animacji
                List<String> rewardNames = new ArrayList<>();
                if (rewardsRes.statusCode() == 200) {
                    Type listType = new TypeToken<List<LootboxReward>>() {}.getType();
                    List<LootboxReward> rewards = gson.fromJson(rewardsRes.body(), listType);
                    rewardNames = rewards.stream().map(r -> r.name).collect(Collectors.toList());
                }

                // 3. Otwórz skrzynkę (backend losuje i odejmuje punkty)
                String mode = plugin.getServerMode();
                HttpRequest openReq = HttpRequest.newBuilder()
                        .uri(URI.create(baseUrl + "/lootbox/" + nick + "?mode=" + mode))
                        .timeout(java.time.Duration.ofSeconds(8))
                        .POST(HttpRequest.BodyPublishers.noBody())
                        .build();

                HttpResponse<String> openRes = http.send(openReq, HttpResponse.BodyHandlers.ofString());

                if (openRes.statusCode() == 400) {
                    player.sendMessage(Component.text("✗ " + extractMessage(openRes.body()))
                            .color(NamedTextColor.RED));
                    return;
                }
                if (openRes.statusCode() != 200) {
                    player.sendMessage(Component.text("✗ Błąd serwera: " + openRes.statusCode())
                            .color(NamedTextColor.RED));
                    return;
                }

                // Wyciągnij nazwę nagrody z odpowiedzi
                @SuppressWarnings("unchecked")
                Map<String, Object> openData = gson.fromJson(openRes.body(), Map.class);
                String winnerName = (String) openData.getOrDefault("reward", "Nagroda");

                // Aktualizuj cache punktów
                plugin.pointsCache.put(nick.toLowerCase(), wallet.points - LOOTBOX_COST);

                // 4. Uruchom animację na głównym wątku
                final List<String> finalRewardNames = rewardNames;
                org.bukkit.Bukkit.getScheduler().runTask(plugin, () ->
                        LootboxAnimation.start(plugin, player, finalRewardNames, winnerName)
                );

            } catch (Exception e) {
                player.sendMessage(Component.text("✗ Błąd połączenia z serwerem sklepu.")
                        .color(NamedTextColor.RED));
                plugin.getLogger().warning("[Skrzynka] Błąd: " + e.getMessage());
            }
        }).exceptionally(e -> {
            player.sendMessage(Component.text("✗ Nie można połączyć się z serwerem sklepu.")
                    .color(NamedTextColor.RED));
            return null;
        });

        return true;
    }

    // Blokuj kliknięcia w GUI skrzynki
    @EventHandler
    public void onInventoryClick(InventoryClickEvent event) {
        if (!(event.getWhoClicked() instanceof Player player)) return;
        if (LootboxAnimation.isActive(player.getUniqueId())) {
            String title = event.getView().getTitle();
            if (title.contains("Skrzynka Losu")) {
                event.setCancelled(true);
            }
        }
    }

    // Anuluj animację gdy gracz zamknie GUI
    @EventHandler
    public void onInventoryClose(InventoryCloseEvent event) {
        if (!(event.getPlayer() instanceof Player player)) return;
        LootboxAnimation.cancel(player.getUniqueId());
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        return new ArrayList<>();
    }

    private String extractMessage(String body) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = gson.fromJson(body, Map.class);
            if (map != null && map.containsKey("message")) return (String) map.get("message");
        } catch (Exception ignored) {}
        return body.length() > 100 ? body.substring(0, 100) : body;
    }
}
