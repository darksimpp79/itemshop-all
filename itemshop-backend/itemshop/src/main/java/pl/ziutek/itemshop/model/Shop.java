package pl.ziutek.itemshop.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Entity
@Table(name = "shops")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Shop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String serverName;
    private String serverIp;

    @Column(name = "theme", columnDefinition = "varchar(255) default 'default'")
    private String theme = "default";

    @Column(unique = true)
    private String customDomain; // Tutaj wpiszesz np. "sklep.mcsurv.pl"

    @Column(unique = true, nullable = false)
    private String apiKey;

    // --- NOWE POLA DO KONFIGURACJI NAGRODY ---
    @Column(name = "daily_reward_command")
    private String dailyRewardCommand = "give {player} emerald 1";

    @Column(name = "daily_reward_name")
    private String dailyRewardName = "Darmowa Nagroda 24h";
    // -----------------------------------------
    @Column(name = "discord_link")
    private String discordLink = "https://discord.gg/twoj-serwer";

    @Column(name = "banner_text")
    private String bannerText = "DOŁĄCZ DO ŚWIATA SKLEPU TERAZ";

    @Column(name = "terms_content", columnDefinition = "TEXT")
    private String termsContent = "1. Postanowienia ogólne\nTutaj wpisz swój regulamin...";
    // -----------------------------------------

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @JsonIgnore
    private Owner owner;

    @PrePersist
    protected void onCreate() {
        if (this.apiKey == null) {
            this.apiKey = "sk_" + UUID.randomUUID().toString().replace("-", "");
        }
    }

    
}