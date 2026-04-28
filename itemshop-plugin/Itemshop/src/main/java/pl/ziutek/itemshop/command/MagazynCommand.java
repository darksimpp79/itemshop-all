package pl.ziutek.itemshop.command;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.plugin.Plugin;
import pl.ziutek.itemshop.model.MagazynItem;

import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MagazynCommand implements CommandExecutor, Listener, TabCompleter {

    private final Plugin plugin;
    private final Gson gson = new Gson();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(5))
            .build();

    private String API_KEY;
    private String API_URL;
    private String SERVER_MODE;
    private String SERVER_NAME;

    private final String GUI_MAIN    = ChatColor.DARK_GREEN + "Twój Magazyn";
    private final String GUI_CONFIRM = ChatColor.DARK_BLUE  + "Potwierdź odbiór";

    private final NamespacedKey idsKey;
    private final NamespacedKey cmdsKey;
    private final NamespacedKey nameKey;
    private final NamespacedKey slotsKey;
    private final NamespacedKey sigKey;

    public MagazynCommand(Plugin plugin) {
        this.plugin  = plugin;
        this.idsKey  = new NamespacedKey(plugin, "reward_ids");
        this.cmdsKey = new NamespacedKey(plugin, "reward_cmds");
        this.nameKey = new NamespacedKey(plugin, "reward_name");
        this.slotsKey = new NamespacedKey(plugin, "reward_slots");
        this.sigKey  = new NamespacedKey(plugin, "reward_sig");

        zaladujConfig();
    }

    private void zaladujConfig() {
        plugin.reloadConfig();
        this.API_KEY     = plugin.getConfig().getString("api-key", "BRAK_KLUCZA");
        this.SERVER_NAME = plugin.getConfig().getString("server-name", "default").toLowerCase();
        this.SERVER_MODE = plugin.getConfig().getString("server-mode", "survival").toLowerCase();

        String baseApiUrl = plugin.getConfig().getString("api-url", "https://api.pumpking.club/api");
        if (baseApiUrl.endsWith("/")) baseApiUrl = baseApiUrl.substring(0, baseApiUrl.length() - 1);

        this.API_URL = baseApiUrl + "/storefront/" + SERVER_NAME + "/magazyn/";
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length > 0) {
            if (args[0].equalsIgnoreCase("reload")) {
                if (!sender.hasPermission("itemshop.admin")) {
                    sender.sendMessage(ChatColor.RED + "Brak uprawnień!");
                    return true;
                }
                zaladujConfig();
                sender.sendMessage(ChatColor.GREEN + "✅ Przeładowano konfigurację ItemShopu!");
                return true;
            }
            if (args[0].equalsIgnoreCase("help")) {
                wyslijPomoc(sender);
                return true;
            }
        }

        if (!(sender instanceof Player player)) {
            sender.sendMessage(ChatColor.RED + "Komenda tylko dla graczy!");
            return true;
        }

        player.sendMessage(ChatColor.YELLOW + "Ładuję dane z magazynu...");

        String requestUrl = API_URL + player.getName() + "?mode=" + SERVER_MODE;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(requestUrl))
                .header("X-API-Key", API_KEY)
                .timeout(java.time.Duration.ofSeconds(5))
                .GET()
                .build();

        httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenAccept(response -> {
                    if (response.statusCode() == 200) {
                        otworzGlowneGui(player, response.body());
                    } else if (response.statusCode() == 401) {
                        player.sendMessage(ChatColor.RED + "Błąd autoryzacji (zły API-KEY w configu).");
                    } else {
                        player.sendMessage(ChatColor.RED + "Błąd połączenia z API: " + response.statusCode());
                    }
                })
                .exceptionally(e -> {
                    player.sendMessage(ChatColor.RED + "Serwer sklepu jest obecnie niedostępny.");
                    return null;
                });

        return true;
    }

    private void otworzGlowneGui(Player player, String jsonBody) {
        List<MagazynItem> items = gson.fromJson(jsonBody, new TypeToken<List<MagazynItem>>() {}.getType());

        if (items == null || items.isEmpty()) {
            player.sendMessage(plugin.getConfig().getString("messages.nothing-to-collect",
                    ChatColor.RED + "Brak przedmiotów.").replace("&", "§"));
            return;
        }

        Map<String, List<MagazynItem>> groupedItems = new HashMap<>();
        for (MagazynItem item : items) {
            groupedItems.computeIfAbsent(item.itemName, k -> new ArrayList<>()).add(item);
        }

        Bukkit.getScheduler().runTask(plugin, () -> {
            Inventory inv = Bukkit.createInventory(null, 27, GUI_MAIN);

            for (Map.Entry<String, List<MagazynItem>> entry : groupedItems.entrySet()) {
                String itemName        = entry.getKey();
                List<MagazynItem> group = entry.getValue();

                List<Long> ids    = group.stream().map(i -> i.id).toList();
                List<String> cmds = group.stream().map(i -> i.rewardCommand).toList();
                int requiredSlots = group.get(0).requiredSlots;
                String sig        = group.get(0).signature;

                ItemStack icon = new ItemStack(Material.CHEST);
                ItemMeta meta  = icon.getItemMeta();
                if (meta == null) continue;

                meta.setDisplayName(ChatColor.GOLD + "" + ChatColor.BOLD + itemName);
                meta.setLore(List.of(
                        ChatColor.DARK_GRAY + "Ilość w pakiecie: " + ChatColor.AQUA + cmds.size(),
                        "",
                        ChatColor.GRAY + "Wymagane wolne sloty: " + ChatColor.WHITE + requiredSlots,
                        "",
                        ChatColor.GREEN + "▶ Kliknij, aby odebrać!"
                ));

                meta.getPersistentDataContainer().set(idsKey,  PersistentDataType.STRING,  gson.toJson(ids));
                meta.getPersistentDataContainer().set(cmdsKey, PersistentDataType.STRING,  gson.toJson(cmds));
                meta.getPersistentDataContainer().set(nameKey, PersistentDataType.STRING,  itemName);
                meta.getPersistentDataContainer().set(slotsKey, PersistentDataType.INTEGER, requiredSlots);
                if (sig != null) meta.getPersistentDataContainer().set(sigKey, PersistentDataType.STRING, sig);

                icon.setItemMeta(meta);
                inv.addItem(icon);
            }
            player.openInventory(inv);
        });
    }

    private void otworzGuiPotwierdzenia(Player player, String idsJson, String cmdsJson,
                                        String itemName, int requiredSlots, String signature) {
        Inventory inv = Bukkit.createInventory(null, 27, GUI_CONFIRM);

        ItemStack acceptBtn  = new ItemStack(Material.LIME_STAINED_GLASS_PANE);
        ItemMeta  acceptMeta = acceptBtn.getItemMeta();
        acceptMeta.setDisplayName(ChatColor.GREEN + "" + ChatColor.BOLD + "✔ POTWIERDŹ ODBIÓR");
        acceptMeta.setLore(List.of(
                ChatColor.GRAY + "Pakiet: "         + ChatColor.GOLD  + itemName,
                ChatColor.GRAY + "Wymagane miejsce: " + ChatColor.WHITE + requiredSlots
        ));
        acceptMeta.getPersistentDataContainer().set(idsKey,   PersistentDataType.STRING,  idsJson);
        acceptMeta.getPersistentDataContainer().set(cmdsKey,  PersistentDataType.STRING,  cmdsJson);
        acceptMeta.getPersistentDataContainer().set(slotsKey, PersistentDataType.INTEGER, requiredSlots);
        acceptMeta.getPersistentDataContainer().set(nameKey,  PersistentDataType.STRING,  itemName);
        if (signature != null) acceptMeta.getPersistentDataContainer().set(sigKey, PersistentDataType.STRING, signature);
        acceptBtn.setItemMeta(acceptMeta);

        ItemStack cancelBtn  = new ItemStack(Material.RED_STAINED_GLASS_PANE);
        ItemMeta  cancelMeta = cancelBtn.getItemMeta();
        cancelMeta.setDisplayName(ChatColor.RED + "" + ChatColor.BOLD + "✖ ANULUJ");
        cancelBtn.setItemMeta(cancelMeta);

        inv.setItem(11, acceptBtn);
        inv.setItem(15, cancelBtn);

        player.openInventory(inv);
    }

    @EventHandler
    public void onInventoryClick(InventoryClickEvent event) {
        String title = event.getView().getTitle();
        if (!title.equals(GUI_MAIN) && !title.equals(GUI_CONFIRM)) return;

        event.setCancelled(true);
        ItemStack clickedItem = event.getCurrentItem();
        if (clickedItem == null || clickedItem.getType() == Material.AIR) return;
        ItemMeta meta = clickedItem.getItemMeta();
        if (meta == null) return;

        Player player = (Player) event.getWhoClicked();

        if (title.equals(GUI_MAIN)) {
            if (meta.getPersistentDataContainer().has(idsKey, PersistentDataType.STRING)) {
                String ids  = meta.getPersistentDataContainer().get(idsKey,  PersistentDataType.STRING);
                String cmds = meta.getPersistentDataContainer().get(cmdsKey, PersistentDataType.STRING);
                String name = meta.getPersistentDataContainer().get(nameKey, PersistentDataType.STRING);
                int slots   = meta.getPersistentDataContainer().get(slotsKey, PersistentDataType.INTEGER);
                String sig  = meta.getPersistentDataContainer().has(sigKey, PersistentDataType.STRING)
                        ? meta.getPersistentDataContainer().get(sigKey, PersistentDataType.STRING) : null;

                otworzGuiPotwierdzenia(player, ids, cmds, name, slots, sig);
            }
        } else if (title.equals(GUI_CONFIRM)) {

            if (clickedItem.getType() == Material.RED_STAINED_GLASS_PANE) {
                player.closeInventory();
                player.sendMessage(ChatColor.GRAY + "Anulowano odbiór.");

            } else if (clickedItem.getType() == Material.LIME_STAINED_GLASS_PANE) {
                int wymagane = meta.getPersistentDataContainer().get(slotsKey, PersistentDataType.INTEGER);

                if (policzWolneKratki(player) < wymagane) {
                    player.sendMessage(plugin.getConfig().getString("messages.no-slots",
                            "&cBrak miejsca!").replace("&", "§"));
                    return;
                }

                String idsJson   = meta.getPersistentDataContainer().get(idsKey,   PersistentDataType.STRING);
                String cmdsJson  = meta.getPersistentDataContainer().get(cmdsKey,  PersistentDataType.STRING);
                String itemName  = meta.getPersistentDataContainer().get(nameKey,  PersistentDataType.STRING);
                String sig       = meta.getPersistentDataContainer().has(sigKey, PersistentDataType.STRING)
                        ? meta.getPersistentDataContainer().get(sigKey, PersistentDataType.STRING) : null;

                List<Long>   ids  = gson.fromJson(idsJson,  new TypeToken<List<Long>>()  {}.getType());
                List<String> cmds = gson.fromJson(cmdsJson, new TypeToken<List<String>>(){}.getType());

                player.closeInventory();

                List<String> allowPrefixes = plugin.getConfig().getStringList("allowed-command-prefixes");
                // ZMIANA: pusta lista = blokuj wszystko (poprzednio pusta = wildcard — niebezpieczne)
                boolean isWildcard = allowPrefixes.contains("*");

                for (String cmd : cmds) {
                    String finalCmd = cmd.replace("{player}", player.getName()).trim();

                    boolean allowed = isWildcard || allowPrefixes.stream()
                            .anyMatch(p -> !p.isBlank() && finalCmd.toLowerCase().startsWith(p.toLowerCase()));

                    if (allowed) {
                        Bukkit.dispatchCommand(Bukkit.getConsoleSender(), finalCmd);
                    } else {
                        plugin.getLogger().warning("Zablokowano komendę (brak na allowliście): " + finalCmd);
                        player.sendMessage(ChatColor.RED + "Zablokowano komendę: " + ChatColor.GRAY + finalCmd);
                    }
                }

                String successMsg = plugin.getConfig().getString("messages.bought-success",
                        "&aOdebrano: &f{item}").replace("&", "§").replace("{item}", itemName);
                player.sendTitle(ChatColor.GOLD + "ODEBRANO!", ChatColor.YELLOW + itemName, 10, 70, 20);
                player.sendMessage(successMsg);

                // ZMIANA: broadcast tylko jeśli włączony w configu (domyślnie false)
                if (plugin.getConfig().getBoolean("broadcast-purchases", false)) {
                    Bukkit.broadcastMessage(ChatColor.AQUA + "ITEMSHOP > "
                            + ChatColor.GRAY + player.getName() + " odebrał "
                            + ChatColor.GOLD + itemName + " (" + SERVER_MODE + ")");
                }

                // ZMIANA: obsługa błędów przy oznaczaniu — zapobiega podwójnemu odbiorowi
                for (Long id : ids) oznaczJakoOdebrane(id, sig, player);
            }
        }
    }

    private int policzWolneKratki(Player player) {
        int wolne = 0;
        for (ItemStack item : player.getInventory().getStorageContents()) {
            if (item == null || item.getType() == Material.AIR) wolne++;
        }
        return wolne;
    }

    private void oznaczJakoOdebrane(Long itemId, String signature, Player player) {
        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(API_URL + "odbierz/" + itemId))
                .header("X-API-Key", API_KEY)
                .POST(HttpRequest.BodyPublishers.noBody());

        if (signature != null && !signature.isEmpty()) {
            requestBuilder.header("X-Signature", signature);
        }

        // ZMIANA: logowanie błędów — bez tego podwójny odbiór był niemożliwy do wykrycia
        httpClient.sendAsync(requestBuilder.build(), HttpResponse.BodyHandlers.ofString())
                .thenAccept(response -> {
                    if (response.statusCode() != 200) {
                        plugin.getLogger().warning(
                                "Błąd oznaczania item #" + itemId + " jako odebranego: HTTP " + response.statusCode()
                                + " | gracz: " + player.getName()
                        );
                    }
                })
                .exceptionally(e -> {
                    plugin.getLogger().severe(
                            "Nie udało się oznaczyć item #" + itemId + " jako odebranego"
                            + " | gracz: " + player.getName()
                            + " | błąd: " + e.getMessage()
                    );
                    return null;
                });
    }

    private void wyslijPomoc(CommandSender s) {
        s.sendMessage(ChatColor.AQUA + "--- ItemShop Pomoc ---");
        s.sendMessage(ChatColor.YELLOW + "/magazyn" + ChatColor.GRAY + " - Otwórz odbiór");
        if (s.hasPermission("itemshop.admin"))
            s.sendMessage(ChatColor.RED + "/magazyn reload" + ChatColor.GRAY + " - Przeładuj config");
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (args.length == 1) {
            List<String> list = new ArrayList<>();
            list.add("help");
            if (sender.hasPermission("itemshop.admin")) list.add("reload");
            return list.stream().filter(s -> s.startsWith(args[0].toLowerCase())).toList();
        }
        return new ArrayList<>();
    }
}