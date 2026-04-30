package pl.ziutek.itemshop;

import com.google.gson.Gson;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextColor;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.java.JavaPlugin;
import pl.ziutek.itemshop.command.MagazynCommand;
import pl.ziutek.itemshop.command.PunktyCommand;
import pl.ziutek.itemshop.command.SkrzynkaCommand;
import pl.ziutek.itemshop.model.WalletResponse;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;

public final class Itemshop extends JavaPlugin implements Listener {

    // Nick (lowercase) → punkty — globalny cache dla action bara
    public final Map<String, Integer> pointsCache = new HashMap<>();

    private final Gson gson = new Gson();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(5))
            .build();

    // Config fields — odczytywane raz przy starcie / reload
    private String apiBaseUrl;
    private String serverName;
    private String serverMode;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        loadConfigFields();

        // ── Komendy ──────────────────────────────────────────────────────────
        MagazynCommand magazyn = new MagazynCommand(this);
        getCommand("magazyn").setExecutor(magazyn);
        getCommand("magazyn").setTabCompleter(magazyn);
        getServer().getPluginManager().registerEvents(magazyn, this);

        PunktyCommand punkty = new PunktyCommand(this);
        getCommand("punkty").setExecutor(punkty);
        getCommand("punkty").setTabCompleter(punkty);

        SkrzynkaCommand skrzynka = new SkrzynkaCommand(this);
        getCommand("skrzynka").setExecutor(skrzynka);
        getCommand("skrzynka").setTabCompleter(skrzynka);
        getServer().getPluginManager().registerEvents(skrzynka, this);

        // ── Własne eventy ─────────────────────────────────────────────────────
        getServer().getPluginManager().registerEvents(this, this);

        // ── Action bar — co 5 sekund (100 ticków) ────────────────────────────
        getServer().getScheduler().runTaskTimer(this, () -> {
            for (Player player : getServer().getOnlinePlayers()) {
                Integer pts = pointsCache.get(player.getName().toLowerCase());
                if (pts != null) {
                    player.sendActionBar(
                            Component.text("✦ " + pts + " PKT")
                                    .color(TextColor.color(0xbbf028))
                                    .append(Component.text("  |  /skrzynka (500 PKT)  |  /punkty")
                                            .color(TextColor.color(0x444444)))
                    );
                }
            }
        }, 100L, 100L);

        getLogger().info("Plugin Itemshop uruchomiony! Server: " + serverName + " | Mode: " + serverMode);
    }

    @Override
    public void onDisable() {
        getLogger().info("Plugin Itemshop wyłączony.");
    }

    // ── Reload config (via /magazyn reload) ───────────────────────────────────

    public void reloadPluginConfig() {
        reloadConfig();
        loadConfigFields();
    }

    private void loadConfigFields() {
        String base = getConfig().getString("api-url", "http://localhost:8080/api");
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        // MagazynCommand konstruuje własny URL — zostawiamy mu to. Tu trzymamy bazę bez /storefront.
        this.apiBaseUrl = base;
        this.serverName = getConfig().getString("server-name", "default").toLowerCase();
        this.serverMode = getConfig().getString("server-mode", "survival").toLowerCase();
    }

    // ── Pobierz punkty przy wejściu gracza ────────────────────────────────────

    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();
        String nick = player.getName();
        odswiezPunkty(nick);
        sprawdzMagazyn(nick, player);
    }

    private void sprawdzMagazyn(String nick, Player player) {
        String url = apiBaseUrl + "/storefront/" + serverName + "/magazyn/" + nick;
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(java.time.Duration.ofSeconds(5))
                .GET().build();

        http.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .thenAccept(res -> {
                    if (res.statusCode() != 200) return;
                    try {
                        com.google.gson.JsonArray arr = gson.fromJson(res.body(), com.google.gson.JsonArray.class);
                        if (arr == null || arr.size() == 0) return;
                        int count = arr.size();
                        // Uruchamiamy na głównym wątku Bukkit
                        getServer().getScheduler().runTask(this, () -> {
                            player.sendMessage(
                                Component.text("┌─────────────────────────────────")
                                    .color(TextColor.color(0x444444))
                            );
                            player.sendMessage(
                                Component.text("│ ")
                                    .color(TextColor.color(0x444444))
                                    .append(Component.text("📦 Masz ")
                                        .color(TextColor.color(0xaaaaaa)))
                                    .append(Component.text(count + " nagród")
                                        .color(TextColor.color(0xbbf028)))
                                    .append(Component.text(" czekających w magazynie!")
                                        .color(TextColor.color(0xaaaaaa)))
                            );
                            player.sendMessage(
                                Component.text("│ ")
                                    .color(TextColor.color(0x444444))
                                    .append(Component.text("Wpisz ")
                                        .color(TextColor.color(0x888888)))
                                    .append(Component.text("/magazyn")
                                        .color(TextColor.color(0xbbf028)))
                                    .append(Component.text(", aby odebrać.")
                                        .color(TextColor.color(0x888888)))
                            );
                            player.sendMessage(
                                Component.text("└─────────────────────────────────")
                                    .color(TextColor.color(0x444444))
                            );
                        });
                    } catch (Exception ignored) {}
                })
                .exceptionally(e -> null);
    }

    public void odswiezPunkty(String nick) {
        String url = apiBaseUrl + "/storefront/" + serverName + "/wallet/" + nick;
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(java.time.Duration.ofSeconds(5))
                .GET().build();

        http.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .thenAccept(res -> {
                    if (res.statusCode() == 200) {
                        WalletResponse wallet = gson.fromJson(res.body(), WalletResponse.class);
                        pointsCache.put(nick.toLowerCase(), wallet.points);
                    }
                })
                .exceptionally(e -> null); // cicha obsługa — action bar po prostu nie pokaże punktów
    }

    // ── Gettery dla innych klas ───────────────────────────────────────────────

    public String getApiBaseUrl() { return apiBaseUrl; }
    public String getServerName() { return serverName; }
    public String getServerMode() { return serverMode; }
}
