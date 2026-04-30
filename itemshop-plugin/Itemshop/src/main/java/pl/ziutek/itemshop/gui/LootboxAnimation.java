package pl.ziutek.itemshop.gui;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.Particle;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.plugin.Plugin;

import java.util.*;

/**
 * CS:GO-style spinning lootbox animation.
 *
 * Layout (27-slot chest, 3 rows):
 *   Row 0 [0-8]:   border | ITEM ITEM ITEM ★CENTER★ ITEM ITEM ITEM | border
 *   Row 1 [9-17]:  glass  | glass glass glass  ▲  glass glass glass | glass
 *   Row 2 [18-26]: glass  | glass glass glass INFO glass glass glass | glass
 */
public class LootboxAnimation {

    public static final String GUI_TITLE = "§8✦ Skrzynka Losu";

    // Ticks per frame for each phase, steps per phase
    private static final int[] PHASE_TICKS = {1, 2, 4,  7, 11};
    private static final int[] PHASE_STEPS = {10, 8, 6, 5,  4};

    // Total steps = 33 → winner placed at pool index 33+3 = 36
    private static final int TOTAL_STEPS   = 33;
    private static final int CENTER_OFFSET = 3; // slot 4 of the strip = index 3 of the window
    private static final int WINNER_INDEX  = TOTAL_STEPS + CENTER_OFFSET; // = 36
    private static final int POOL_SIZE     = 50;

    // Active animations (UUID → animation) for cleanup on close
    private static final Map<UUID, LootboxAnimation> ACTIVE = new HashMap<>();

    private final Plugin plugin;
    private final Player player;
    private final Inventory inv;
    private final List<String> pool; // reward names for the strip
    private final String winnerName;

    private int step = 0;
    private int phase = 0;
    private int stepsInPhase = 0;
    private boolean cancelled = false;
    private float currentPitch = 0.5f;

    // Colorful materials for the strip items
    private static final Material[] STRIP_MATERIALS = {
        Material.YELLOW_DYE, Material.ORANGE_DYE, Material.LIME_DYE,
        Material.LIGHT_BLUE_DYE, Material.PINK_DYE, Material.CYAN_DYE,
        Material.MAGENTA_DYE, Material.RED_DYE, Material.PURPLE_DYE
    };

    public LootboxAnimation(Plugin plugin, Player player, Inventory inv,
                            List<String> rewardNames, String winnerName) {
        this.plugin = plugin;
        this.player = player;
        this.inv = inv;
        this.winnerName = winnerName;
        this.pool = buildPool(rewardNames);
    }

    // ── Pool construction ──────────────────────────────────────────────────

    private List<String> buildPool(List<String> rewards) {
        List<String> p = new ArrayList<>(POOL_SIZE);
        if (rewards.isEmpty()) {
            rewards = List.of("Diament", "Szmaragd", "Złoto", "Żelazo", "Rubiny");
        }
        // Fill pool with shuffled rewards
        Random rng = new Random();
        while (p.size() < POOL_SIZE) {
            List<String> shuffled = new ArrayList<>(rewards);
            Collections.shuffle(shuffled, rng);
            p.addAll(shuffled);
        }
        p.subList(POOL_SIZE, p.size()).clear();
        // Place winner at fixed index
        p.set(WINNER_INDEX, winnerName);
        return p;
    }

    // ── Public API ─────────────────────────────────────────────────────────

    public static void start(Plugin plugin, Player player, List<String> rewardNames, String winnerName) {
        Inventory inv = Bukkit.createInventory(null, 27,
                Component.text("✦ Skrzynka Losu").color(TextColor.color(0x333333)));
        LootboxAnimation anim = new LootboxAnimation(plugin, player, inv, rewardNames, winnerName);
        ACTIVE.put(player.getUniqueId(), anim);
        anim.buildStaticFrame();
        Bukkit.getScheduler().runTask(plugin, () -> {
            player.openInventory(inv);
            anim.scheduleNext();
        });
    }

    public static void cancel(UUID uuid) {
        LootboxAnimation a = ACTIVE.remove(uuid);
        if (a != null) a.cancelled = true;
    }

    public static boolean isActive(UUID uuid) {
        return ACTIVE.containsKey(uuid);
    }

    // ── Animation engine ───────────────────────────────────────────────────

    private void buildStaticFrame() {
        // Row 1: selector row — red glass with yellow pointer at center (slot 13)
        ItemStack red    = glass(Material.RED_STAINED_GLASS_PANE, " ");
        ItemStack yellow = glass(Material.YELLOW_STAINED_GLASS_PANE, "§e▲ Tutaj ląduje nagroda");
        for (int i = 9; i <= 17; i++) inv.setItem(i, (i == 13) ? yellow : red);

        // Row 2: info row — black glass with spinning info at center (slot 22)
        ItemStack black = glass(Material.BLACK_STAINED_GLASS_PANE, " ");
        for (int i = 18; i <= 26; i++) inv.setItem(i, black);
        inv.setItem(22, infoItem("§7Kręcę..."));

        // Row 0 borders
        inv.setItem(0, glass(Material.BLACK_STAINED_GLASS_PANE, " "));
        inv.setItem(8, glass(Material.BLACK_STAINED_GLASS_PANE, " "));
    }

    private void scheduleNext() {
        if (cancelled) return;

        if (phase >= PHASE_TICKS.length) {
            onComplete();
            return;
        }

        long delay = PHASE_TICKS[phase];
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (cancelled || !player.isOnline()) { ACTIVE.remove(player.getUniqueId()); return; }

            renderFrame(step);
            playTick();
            step++;
            stepsInPhase++;

            if (stepsInPhase >= PHASE_STEPS[phase]) {
                phase++;
                stepsInPhase = 0;
            }
            scheduleNext();
        }, delay);
    }

    private void renderFrame(int offset) {
        for (int i = 0; i < 7; i++) {
            String name = pool.get(offset + i);
            Material mat = STRIP_MATERIALS[(offset + i) % STRIP_MATERIALS.length];
            boolean isCenter = (i == CENTER_OFFSET);

            ItemStack item = new ItemStack(isCenter ? Material.NETHER_STAR : mat);
            ItemMeta meta  = item.getItemMeta();
            if (meta == null) continue;
            meta.displayName(Component.text(isCenter ? "§e§l★ " + name + " §e§l★" : "§f" + name)
                    .decoration(TextDecoration.ITALIC, false));
            meta.lore(List.of());
            item.setItemMeta(meta);
            inv.setItem(i + 1, item);
        }
        player.updateInventory();
    }

    private void onComplete() {
        ACTIVE.remove(player.getUniqueId());

        // Fill selector row green (celebration)
        ItemStack green = glass(Material.LIME_STAINED_GLASS_PANE, "§a✔ Wylosowano!");
        for (int i = 9; i <= 17; i++) inv.setItem(i, green);

        // Winner item at center (slot 4)
        ItemStack winItem = new ItemStack(Material.NETHER_STAR);
        ItemMeta meta = winItem.getItemMeta();
        if (meta != null) {
            meta.displayName(Component.text("§6§l✦ " + winnerName + " §6§l✦")
                    .decoration(TextDecoration.ITALIC, false));
            meta.lore(List.of(
                    Component.text("§7Twoja nagroda czeka w §f/magazyn").decoration(TextDecoration.ITALIC, false)
            ));
            winItem.setItemMeta(meta);
        }
        inv.setItem(4, winItem);
        inv.setItem(22, infoItem("§a✔ Odbierz: /magazyn"));
        player.updateInventory();

        // Sound + particles
        player.playSound(player, Sound.UI_TOAST_CHALLENGE_COMPLETE, 1.0f, 1.0f);
        player.spawnParticle(Particle.TOTEM_OF_UNDYING, player.getLocation().add(0, 1, 0), 60, 0.5, 0.5, 0.5, 0.1);

        // Title + chat message
        player.showTitle(net.kyori.adventure.title.Title.title(
                Component.text("✦ WYGRAŁEŚ! ✦").color(TextColor.color(0xffcc00)).decorate(TextDecoration.BOLD),
                Component.text(winnerName).color(TextColor.color(0xffffff)),
                net.kyori.adventure.title.Title.Times.times(
                        java.time.Duration.ofMillis(200),
                        java.time.Duration.ofMillis(3000),
                        java.time.Duration.ofMillis(500)
                )
        ));
        player.sendMessage(
                Component.text("✦ LOOTBOX ✦ ").color(TextColor.color(0xffcc00)).decorate(TextDecoration.BOLD)
                        .append(Component.text("Wylosowano: ").color(TextColor.color(0xaaaaaa)))
                        .append(Component.text(winnerName).color(TextColor.color(0xffffff)).decorate(TextDecoration.BOLD))
                        .append(Component.text(" → odbierz przez /magazyn").color(TextColor.color(0x555555)))
        );
    }

    private void playTick() {
        currentPitch = Math.min(2.0f, currentPitch + 0.03f);
        player.playSound(player, Sound.BLOCK_NOTE_BLOCK_PLING, 0.6f, currentPitch);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private static ItemStack glass(Material mat, String name) {
        ItemStack item = new ItemStack(mat);
        ItemMeta meta  = item.getItemMeta();
        if (meta != null) {
            meta.displayName(Component.text(name).decoration(TextDecoration.ITALIC, false));
            item.setItemMeta(meta);
        }
        return item;
    }

    private static ItemStack infoItem(String name) {
        ItemStack item = new ItemStack(Material.PAPER);
        ItemMeta meta  = item.getItemMeta();
        if (meta != null) {
            meta.displayName(Component.text(name).decoration(TextDecoration.ITALIC, false));
            item.setItemMeta(meta);
        }
        return item;
    }


}
