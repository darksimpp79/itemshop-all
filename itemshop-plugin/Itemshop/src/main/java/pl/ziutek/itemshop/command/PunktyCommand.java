package pl.ziutek.itemshop.command;

import com.google.gson.Gson;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import pl.ziutek.itemshop.Itemshop;
import pl.ziutek.itemshop.model.WalletResponse;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;

public class PunktyCommand implements CommandExecutor, TabCompleter {

    private final Itemshop plugin;
    private final Gson gson = new Gson();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(5))
            .build();

    public PunktyCommand(Itemshop plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage("Komenda tylko dla graczy!");
            return true;
        }

        String nick = args.length > 0 ? args[0] : player.getName();

        player.sendMessage(Component.text("✦ Sprawdzam punkty dla ")
                .color(TextColor.color(0xbbf028))
                .append(Component.text(nick).color(NamedTextColor.WHITE))
                .append(Component.text("...").color(TextColor.color(0x888888))));

        String url = plugin.getApiBaseUrl() + "/storefront/" + plugin.getServerName() + "/wallet/" + nick;
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(java.time.Duration.ofSeconds(5))
                .GET()
                .build();

        http.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .thenAccept(res -> {
                    if (res.statusCode() == 200) {
                        WalletResponse wallet = gson.fromJson(res.body(), WalletResponse.class);
                        // Aktualizuj cache
                        plugin.pointsCache.put(nick.toLowerCase(), wallet.points);
                        // Wyślij wynik
                        player.sendMessage(
                                Component.text("✦ ").color(TextColor.color(0xbbf028))
                                        .append(Component.text(nick).color(NamedTextColor.WHITE).decorate(TextDecoration.BOLD))
                                        .append(Component.text(" → ").color(TextColor.color(0x555555)))
                                        .append(Component.text(wallet.points + " PKT").color(TextColor.color(0xbbf028)).decorate(TextDecoration.BOLD))
                        );
                        // Action bar
                        if (nick.equalsIgnoreCase(player.getName())) {
                            player.sendActionBar(Component.text("✦ " + wallet.points + " PKT  |  /skrzynka (500 PKT)")
                                    .color(TextColor.color(0xbbf028)));
                        }
                    } else if (res.statusCode() == 404) {
                        player.sendMessage(Component.text("✗ Gracz " + nick + " nie ma jeszcze punktów.")
                                .color(NamedTextColor.RED));
                    } else {
                        player.sendMessage(Component.text("✗ Błąd API: " + res.statusCode())
                                .color(NamedTextColor.RED));
                    }
                })
                .exceptionally(e -> {
                    player.sendMessage(Component.text("✗ Nie można połączyć z serwerem sklepu.")
                            .color(NamedTextColor.RED));
                    return null;
                });

        return true;
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        return new ArrayList<>();
    }
}
