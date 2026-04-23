package pl.ziutek.itemshop.model;

public class MagazynItem {
    public Long id;
    public String playerName;
    public String itemName;
    public String rewardCommand;
    public int requiredSlots; // Nowe pole!
    public boolean claimed;
    public String signature;
}