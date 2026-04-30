"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useShop } from "@/hooks/useShop";

interface RpgThemeProps {
  serverName: string;
}

export default function RpgTheme({ serverName }: RpgThemeProps) {
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);
  const { modes, serverInfo } = useShop(serverName);

  useEffect(() => {
    if (!serverName || !serverInfo?.serverIp) return;
    fetch(`https://api.mcsrvstat.us/2/${serverInfo.serverIp}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setOnlinePlayers(d.players?.online ?? 0); })
      .catch(() => setOnlinePlayers(null));
  }, [serverName, serverInfo]);

  return (
    <main
      className="min-h-screen pb-24 overflow-x-hidden relative"
      style={{ background: "linear-gradient(160deg, #0f0804 0%, #0a0502 50%, #110905 100%)", fontFamily: "'Georgia', 'Times New Roman', serif", color: "#e8d5a3" }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rpg-flicker { 0%,100%{opacity:1} 94%{opacity:0.96} 96%{opacity:0.92} }
        .rpg-flicker { animation: rpg-flicker 5s infinite; }
        @keyframes rpg-glow-pulse { 0%,100%{text-shadow:0 0 20px rgba(212,160,23,0.4),0 0 40px rgba(212,160,23,0.2)} 50%{text-shadow:0 0 30px rgba(212,160,23,0.7),0 0 60px rgba(212,160,23,0.3)} }
        .rpg-glow { animation: rpg-glow-pulse 3s ease-in-out infinite; color: #d4a017; }
        .rpg-border { border: 1px solid rgba(212,160,23,0.2); }
        .rpg-card:hover { border-color: rgba(212,160,23,0.4); box-shadow: 0 0 30px rgba(212,160,23,0.08); }
        @keyframes rpg-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .rpg-float { animation: rpg-float 5s ease-in-out infinite; }
        .rpg-divider { background: linear-gradient(90deg, transparent, rgba(212,160,23,0.5), rgba(212,160,23,0.9), rgba(212,160,23,0.5), transparent); height: 1px; }
        @keyframes rpg-marquee { 0%{transform:translateX(100vw)} 100%{transform:translateX(-100%)} }
        .rpg-marquee { display: inline-flex; white-space: nowrap; animation: rpg-marquee 30s linear infinite; }
      ` }} />

      {/* Ambient lighting */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(212,160,23,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(139,0,0,0.06) 0%, transparent 60%)" }} />

      <div className="relative z-10 max-w-[1300px] mx-auto px-4 sm:px-6">

        {/* Scroll ticker */}
        <div className="overflow-hidden py-2.5 border-b" style={{ borderColor: "rgba(212,160,23,0.1)", fontSize: "0.65rem", color: "rgba(212,160,23,0.35)", letterSpacing: "0.15em" }}>
          <span className="rpg-marquee">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className="mx-16">
                ⚔ KRÓLESTWO {serverName.toUpperCase()} &nbsp;✦&nbsp; SKLEP OTWARTY &nbsp;✦&nbsp; WĘDROWCY W TAWERNIE: {onlinePlayers ?? "?"} &nbsp;✦&nbsp; BŁOGOSŁAWIEŃSTWO CODZIENNIE &nbsp;✦&nbsp;
              </span>
            ))}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center justify-between py-7 mb-12">
          <div className="flex items-center gap-3">
            <span className="rpg-glow text-2xl font-bold italic rpg-flicker">⚔ {serverName}</span>
          </div>
          <div className="flex items-center gap-8" style={{ fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            <a href="#kategorie" style={{ color: "rgba(212,160,23,0.6)" }} className="hover:text-amber-400 transition-colors">Zbrojownia</a>
            <Link href="/regulamin" style={{ color: "rgba(212,160,23,0.4)" }} className="hover:text-amber-400 transition-colors">Regulamin</Link>
            <Link href="/docs" style={{ color: "rgba(212,160,23,0.4)" }} className="hover:text-amber-400 transition-colors">Pomoc</Link>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg rpg-border" style={{ background: "rgba(212,160,23,0.04)", fontSize: "0.65rem" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              <span style={{ color: "#d4a017" }}>Wędrowcy: {onlinePlayers !== null ? onlinePlayers : "?"}</span>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-28">
          <div>
            <div style={{ fontSize: "0.65rem", color: "rgba(212,160,23,0.4)", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "1rem" }}>
              ✦ Witaj w Królestwie ✦
            </div>
            <h1 className="font-bold italic mb-6 leading-tight" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "#d4a017", textShadow: "0 0 40px rgba(212,160,23,0.3)" }}>
              Tawerna<br /><span style={{ color: "#e8d5a3" }}>{serverName}</span>
            </h1>
            <div className="rpg-divider mb-6" />
            <p style={{ color: "rgba(232,213,163,0.55)", lineHeight: 1.8, fontSize: "0.95rem", fontStyle: "italic", maxWidth: "480px" }}>
              Zdobądź potężne artefakty, zbierz błogosławieństwo losu i zdominuj królestwo. Każdy zakup wspiera rozwój naszego świata.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <a
                href="#kategorie"
                className="flex items-center gap-3 font-bold uppercase transition-all hover:brightness-110 active:scale-95"
                style={{ background: "rgba(212,160,23,0.15)", border: "1px solid rgba(212,160,23,0.5)", color: "#d4a017", padding: "0.875rem 2rem", borderRadius: "0.75rem", fontSize: "0.7rem", letterSpacing: "0.15em" }}
              >
                ⚜ Wejdź do Zbrojowni
              </a>
              <a
                href={serverInfo?.discordLink || "#"}
                className="flex items-center gap-3 font-bold uppercase transition-all hover:brightness-110"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,213,163,0.5)", padding: "0.875rem 2rem", borderRadius: "0.75rem", fontSize: "0.7rem", letterSpacing: "0.15em" }}
              >
                ♟ Discord
              </a>
            </div>
          </div>

          {/* Decorative right panel */}
          <div className="hidden lg:flex items-center justify-center relative h-80">
            <div className="rpg-float absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div style={{ fontSize: "8rem", filter: "drop-shadow(0 0 40px rgba(212,160,23,0.3))" }}>⚔</div>
              </div>
            </div>
            {/* Floating stat cards */}
            <div className="absolute top-4 left-0 rpg-border rounded-xl px-5 py-3 rpg-float" style={{ background: "rgba(20,12,4,0.9)", animationDelay: "0.5s" }}>
              <div style={{ fontSize: "0.6rem", color: "rgba(212,160,23,0.4)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "0.25rem" }}>Tryby Gry</div>
              <div className="font-bold text-lg" style={{ color: "#d4a017" }}>{modes.length || "?"}</div>
            </div>
            <div className="absolute bottom-4 right-0 rpg-border rounded-xl px-5 py-3 rpg-float" style={{ background: "rgba(20,12,4,0.9)", animationDelay: "1.5s" }}>
              <div style={{ fontSize: "0.6rem", color: "rgba(212,160,23,0.4)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "0.25rem" }}>W Grze</div>
              <div className="font-bold text-lg" style={{ color: "#d4a017" }}>{onlinePlayers !== null ? onlinePlayers : "–"}</div>
            </div>
          </div>
        </div>

        {/* Modes section */}
        <div id="kategorie" className="mb-24">
          <div className="flex items-center gap-8 mb-10">
            <div className="rpg-divider flex-1" />
            <h2 className="font-bold italic text-2xl rpg-glow whitespace-nowrap">✦ Komnaty Zbrojowni ✦</h2>
            <div className="rpg-divider flex-1" />
          </div>

          {modes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modes.map((modeName) => {
                const cleanMode = modeName.replace("mc.", "").toLowerCase();
                return (
                  <Link href={`/rpg/shop/${cleanMode}`} key={modeName}>
                    <div className="rpg-border rpg-card rounded-2xl p-8 group cursor-pointer transition-all" style={{ background: "rgba(20,12,4,0.7)" }}>
                      <div style={{ fontSize: "0.6rem", color: "rgba(212,160,23,0.35)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "0.75rem" }}>
                        ✦ Komnata
                      </div>
                      <h3 className="font-bold italic text-2xl mb-4 capitalize transition-all group-hover:text-amber-400" style={{ color: "#e8d5a3" }}>
                        {modeName}
                      </h3>
                      <div className="rpg-divider mb-4" />
                      <div className="flex items-center justify-between" style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                        <span style={{ color: "rgba(212,160,23,0.35)" }}>Kliknij by wejść</span>
                        <span style={{ color: "#d4a017" }} className="group-hover:translate-x-1 transition-transform inline-block">⚔ →</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rpg-border rounded-2xl p-12 text-center" style={{ background: "rgba(20,12,4,0.5)", color: "rgba(212,160,23,0.3)", fontStyle: "italic" }}>
              Kroniki trybów są ładowane... Prosimy o cierpliwość.
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mb-20">
          <div className="flex items-center gap-8 mb-10">
            <div className="rpg-divider flex-1" />
            <h2 className="font-bold italic text-xl whitespace-nowrap" style={{ color: "rgba(212,160,23,0.8)" }}>✦ Kodeks Kupców ✦</h2>
            <div className="rpg-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "📜", title: "Wybierz Komnatę", desc: "Każda komnata to inny tryb gry. Wybierz ten, na którym pragniesz walczyć." },
              { icon: "⚔", title: "Podaj Swe Imię", desc: "Wpisz swój nick z Minecraft — przedmioty trafią prosto do Twojego ekwipunku." },
              { icon: "🏆", title: "Zbieraj Chwałę", desc: "Za każdy zakup otrzymujesz Punkty Chwały. Wymień je na nagrody w grze!" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rpg-border rounded-2xl p-8 text-center" style={{ background: "rgba(20,12,4,0.6)" }}>
                <div className="text-5xl mb-5" style={{ filter: "drop-shadow(0 0 16px rgba(212,160,23,0.3))" }}>{icon}</div>
                <div className="rpg-divider mb-4" />
                <h4 className="font-bold italic text-lg mb-3" style={{ color: "#d4a017" }}>{title}</h4>
                <p style={{ color: "rgba(232,213,163,0.45)", fontSize: "0.85rem", lineHeight: 1.7, fontStyle: "italic" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Points info */}
        <div className="rpg-border rounded-2xl p-8 mb-16" style={{ background: "rgba(212,160,23,0.04)" }}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="text-6xl rpg-float" style={{ filter: "drop-shadow(0 0 20px rgba(212,160,23,0.4))" }}>💎</div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-bold italic text-2xl mb-2" style={{ color: "#d4a017" }}>System Punktów Chwały</h3>
              <p style={{ color: "rgba(232,213,163,0.5)", fontStyle: "italic", fontSize: "0.9rem", lineHeight: 1.7 }}>
                Za każdy wydany złoty otrzymujesz <strong style={{ color: "#d4a017" }}>10 Punktów Chwały</strong>. Sprawdź swój stan w grze komendą{" "}
                <strong style={{ color: "#e8d5a3" }}>/punkty</strong> i wymieniaj punkty na wyjątkowe nagrody.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8" style={{ borderTop: "1px solid rgba(212,160,23,0.1)", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(212,160,23,0.25)" }}>
          <div>
            <p className="mb-1">© 2026 {serverName} — Wszelkie Prawa Zastrzeżone</p>
            <p style={{ color: "rgba(212,160,23,0.15)", fontStyle: "italic" }}>Serwer nie jest powiązany z Mojang AB.</p>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/regulamin" className="hover:text-amber-500 transition-colors">Regulamin</Link>
            <Link href="/docs" className="hover:text-amber-500 transition-colors">Pomoc</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
