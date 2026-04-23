package pl.ziutek.itemshop;

import org.bukkit.plugin.java.JavaPlugin;
import pl.ziutek.itemshop.command.MagazynCommand;

public final class Itemshop extends JavaPlugin {

    @Override
    public void onEnable() {
        saveDefaultConfig();

        MagazynCommand magazynCmd = new MagazynCommand(this);

        getCommand("magazyn").setExecutor(magazynCmd);
        getCommand("magazyn").setTabCompleter(magazynCmd); // NOWOŚĆ: Rejestrujemy podpowiedzi TAB!

        getServer().getPluginManager().registerEvents(magazynCmd, this);

        getLogger().info("Plugin Itemshop uruchomiony! Załadowano config.yml");
    }

    @Override
    public void onDisable() {
        getLogger().info("Plugin Itemshop zostal wylaczony!");
    }
}