"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getServerNameFromLocation } from "@/lib/domain";

const THEMES = [
  {
    id: "default",
    name: "Osadnik",
    badge: "FREE",
    badgeStyle: "border border-[#bbf028]/40 text-[#bbf028] bg-[#bbf028]/10",
    tagline: "Zawsze darmowy",
    desc: "Neonowy minimalista. Ciemne tło, soczysty zielony akcent. Zero ozdobników, maksimum czytelności.",
    color: "#bbf028",
    bg: "linear-gradient(135deg, #111111 0%, #181c0e 100%)",
    border: "rgba(187,240,40,0.2)",
    hoverBorder: "#bbf028",
    href: "/",
    available: true,
    emoji: "🌿",
    perks: ["Nelimitowane produkty", "Tryby gry", "Top donatorzy", "Darmowy bonus"],
    previewItems: [
      { label: "SKLEP", color: "#bbf028" },
      { label: "REGULAMIN", color: "rgba(187,240,40,0.4)" },
      { label: "MOTYWY", color: "rgba(187,240,40,0.4)" },
    ],
  },
  {
    id: "rpg",
    name: "RPG Fantasy",
    badge: "PRO",
    badgeStyle: "border border-amber-500/40 text-amber-400 bg-amber-500/10",
    tagline: "Plan PRO",
    desc: "Karczma i zbrojownia. Złoty amber, ciemna skóra, klimat śródziemnego fantasy. Twoi gracze poczują się jak w przygodzie.",
    color: "#d4a017",
    bg: "linear-gradient(135deg, #0f0804 0%, #1a0f06 100%)",
    border: "rgba(212,160,23,0.2)",
    hoverBorder: "#d4a017",
    href: "/rpg",
    available: true,
    emoji: "⚔️",
    perks: ["Złoty motyw", "Efekty świetlne", "Klimat RPG", "Serif font"],
    previewItems: [
      { label: "ZBROJOWNIA", color: "#d4a017" },
      { label: "REGULAMIN", color: "rgba(212,160,23,0.4)" },
      { label: "MOTYWY", color: "rgba(212,160,23,0.4)" },
    ],
  },
  {
    id: "retro",
    name: "Terminal",
    badge: "PRO",
    badgeStyle: "border border-[#00ff41]/40 text-[#00ff41] bg-[#00ff41]/10",
    tagline: "Plan PRO",
    desc: "Zielony fosfor na czarnym monitorze. Boot sequence, skanujące linie, retro-hacker klimat. Dla serwerów z charakterem.",
    color: "#00ff41",
    bg: "linear-gradient(135deg, #000000 0%, #001a08 100%)",
    border: "rgba(0,255,65,0.15)",
    hoverBorder: "#00ff41",
    href: "/retro",
    available: true,
    emoji: "💻",
    perks: ["Boot sequence", "Scanlines efekt", "Matrix style", "Mono font"],
    previewItems: [
      { label: "[SHOP]", color: "#00ff41" },
      { label: "[REGULAMIN]", color: "rgba(0,255,65,0.4)" },
      { label: "[MOTYWY]", color: "rgba(0,255,65,0.4)" },
    ],
  },
  {
    id: "cyber",
    name: "Cyberpunk",
    badge: "WKRÓTCE",
    badgeStyle: "border border-fuchsia-500/40 text-fuchsia-400 bg-fuchsia-500/10",
    tagline: "W produkcji",
    desc: "Fioletowy neon, futuryzm i chaos przyszłości. Trwa produkcja — zapowiada się kosmicznie.",
    color: "#e879f9",
    bg: "linear-gradient(135deg, #090014 0%, #130020 100%)",
    border: "rgba(232,121,249,0.15)",
    hoverBorder: "#e879f9",
    href: null,
    available: false,
    emoji: "🤖",
    perks: ["Neon violet", "Cyber estetyka", "Futurystyczny", "Wkrótce"],
    previewItems: [
      { label: "//SKLEP", color: "#e879f9" },
      { label: "//REGULAMIN", color: "rgba(232,121,249,0.4)" },
      { label: "//MOTYWY", color: "rgba(232,121,249,0.4)" },
    ],
  },
];

export default function ThemesPage() {
  const [serverName, setServerName] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    setServerName(getServerNameFromLocation() || "demo");
  }, []);

  return (
    <main
      className="min-h-screen text-white pb-24 relative overflow-x-hidden"
      style={{ background: "#0a0a0f", fontFamily: "'system-ui', sans-serif" }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes theme-glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .theme-glow { animation: theme-glow 3s ease-in-out infinite; }
        @keyframes scan-line { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        .scan { animation: scan-line 8s linear infinite; }
        .card-theme { transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s; }
        .card-theme:hover { transform: translateY(-8px) scale(1.01); }
      ` }} />

      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-12">

        {/* Back nav */}
        <nav className="flex items-center justify-between mb-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-all">
              <span className="text-sm">←</span>
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">
              Wróć do sklepu
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              {serverName || "demo"}
            </span>
          </div>
        </nav>

        {/* Header */}
        <div className="mb-16 max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-4">Wygląd sklepu</p>
          <h1 className="text-[clamp(48px,8vw,96px)] font-black uppercase italic leading-[0.85] tracking-tighter mb-6">
            Wybierz<br />
            <span className="text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.15)" }}>swój</span>
            <br />motyw
          </h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-lg">
            Każdy motyw to kompletne doświadczenie — inne kolory, fonty, animacje i klimat. Zmiana w jednym kliknięciu w panelu admina.
          </p>
        </div>

        {/* Theme cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {THEMES.map((theme) => (
            <div
              key={theme.id}
              className="card-theme relative overflow-hidden rounded-[36px] cursor-pointer"
              style={{
                background: theme.bg,
                border: `1px solid ${hovered === theme.id ? theme.hoverBorder : theme.border}`,
                boxShadow: hovered === theme.id ? `0 20px 60px ${theme.color}18` : "none",
              }}
              onMouseEnter={() => setHovered(theme.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Background emoji */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[140px] opacity-[0.04] select-none pointer-events-none">
                {theme.emoji}
              </div>

              {/* Retro scanline effect only for terminal */}
              {theme.id === "retro" && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[36px]">
                  <div className="scan absolute left-0 right-0 h-[2px]" style={{ background: "rgba(0,255,65,0.05)", top: 0 }} />
                </div>
              )}

              <div className="relative z-10 p-10">
                {/* Mini navbar preview */}
                <div
                  className="flex items-center gap-4 mb-8 pb-4 text-[9px] font-black uppercase tracking-widest"
                  style={{ borderBottom: `1px solid ${theme.border}` }}
                >
                  <span style={{ color: theme.color, fontFamily: theme.id === "rpg" ? "Georgia, serif" : theme.id === "retro" ? "monospace" : "inherit" }}>
                    {theme.id === "rpg" ? `⚔ ${serverName || "DEMO"}` : theme.id === "retro" ? `${(serverName || "demo").toUpperCase()}█` : (serverName || "DEMO").toUpperCase()}
                  </span>
                  <div className="flex gap-4 ml-4">
                    {theme.previewItems.map((item, i) => (
                      <span key={i} style={{ color: item.color }}>{item.label}</span>
                    ))}
                  </div>
                </div>

                {/* Badge + Name */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2
                      className="text-3xl font-black uppercase italic tracking-tight mb-1"
                      style={{
                        color: theme.color,
                        fontFamily: theme.id === "rpg" ? "Georgia, 'Times New Roman', serif" : theme.id === "retro" ? "'Courier New', monospace" : "inherit",
                        textShadow: theme.id === "retro" ? `0 0 12px ${theme.color}80` : "none",
                      }}
                    >
                      {theme.name}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${theme.color}60` }}>
                      {theme.tagline}
                    </p>
                  </div>
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${theme.badgeStyle}`}>
                    {theme.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {theme.desc}
                </p>

                {/* Perks */}
                <div className="flex flex-wrap gap-2 mb-10">
                  {theme.perks.map((perk, i) => (
                    <span
                      key={i}
                      className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg"
                      style={{ background: `${theme.color}0f`, color: `${theme.color}80`, border: `1px solid ${theme.color}20` }}
                    >
                      {perk}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                {theme.available && theme.href ? (
                  <Link href={theme.href}>
                    <button
                      className="w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all"
                      style={{
                        background: hovered === theme.id ? theme.color : "transparent",
                        color: hovered === theme.id ? "#000" : theme.color,
                        border: `1px solid ${theme.color}40`,
                      }}
                    >
                      {theme.id === "default" ? "Podgląd → (aktywny)" : "Demo na żywo →"}
                    </button>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest opacity-40 cursor-not-allowed"
                    style={{ border: `1px solid ${theme.color}30`, color: `${theme.color}60` }}
                  >
                    Wkrótce...
                  </button>
                )}
              </div>

              {/* Bottom accent bar */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.color}, transparent)`,
                  opacity: hovered === theme.id ? 1 : 0,
                }}
              />
            </div>
          ))}
        </div>

        {/* Info strip */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[24px] p-8 flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div>
            <p className="font-black uppercase text-sm tracking-wide mb-1">Jesteś właścicielem serwera?</p>
            <p className="text-gray-600 text-xs">Motywy PRO dostępne w panelu admina po aktywacji planu Pro.</p>
          </div>
          <Link href="https://pumpking.club" target="_blank">
            <button className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap">
              Załóż sklep →
            </button>
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/[0.04] pt-8 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-700">
          <span>© 2026 ZiutekShop</span>
          <Link href="/" className="hover:text-white transition-colors">← Wróć do sklepu</Link>
        </footer>
      </div>
    </main>
  );
}
