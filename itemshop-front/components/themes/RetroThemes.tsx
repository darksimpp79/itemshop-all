"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useShop } from "@/hooks/useShop";

interface RetroThemeProps {
  serverName: string;
}

export default function RetroTheme({ serverName }: RetroThemeProps) {
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const { modes, serverInfo } = useShop(serverName);

  const BOOT_SEQUENCE = [
    "BIOS v2.4.1 -- ITEMSHOP SYSTEMS",
    "Checking memory... OK",
    `Loading kernel: shop_core_${serverName.toLowerCase()}.bin`,
    "Mounting filesystems... OK",
    "Starting network interface... OK",
    `Server "${serverName.toUpperCase()}" :: CONNECTED`,
    "All systems nominal. Welcome.",
  ];

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_SEQUENCE.length) {
        setBootLines((prev) => [...prev, BOOT_SEQUENCE[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverName]);

  useEffect(() => {
    if (!serverName || !serverInfo?.serverIp) return;
    fetch(`https://api.mcsrvstat.us/2/${serverInfo.serverIp}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setOnlinePlayers(d.players?.online ?? 0); })
      .catch(() => setOnlinePlayers(null));
  }, [serverName, serverInfo]);

  return (
    <main className="min-h-screen bg-[#000000] text-[#00ff41] font-mono overflow-x-hidden relative">
      <style dangerouslySetInnerHTML={{ __html: `
        .rt-scanlines::before {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,255,65,0.012) 3px, rgba(0,255,65,0.012) 4px);
          pointer-events: none;
          z-index: 9999;
        }
        @keyframes rt-scan { 0%{top:-5%} 100%{top:105%} }
        .rt-scan-line { position: fixed; left:0; right:0; height:3px; background:rgba(0,255,65,0.06); animation:rt-scan 7s linear infinite; pointer-events:none; z-index:9998; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .rt-cursor { animation: blink 1s step-end infinite; }
        .rt-glow { text-shadow: 0 0 8px rgba(0,255,65,0.7), 0 0 20px rgba(0,255,65,0.3); }
        .rt-box { border: 1px solid rgba(0,255,65,0.25); box-shadow: 0 0 12px rgba(0,255,65,0.05), inset 0 0 8px rgba(0,255,65,0.02); }
        .rt-btn { transition: all 0.15s; }
        .rt-btn:hover { background: rgba(0,255,65,0.1); box-shadow: 0 0 20px rgba(0,255,65,0.15); }
        @keyframes rt-marquee { 0%{transform:translateX(100vw)} 100%{transform:translateX(-100%)} }
        .rt-marquee { display: inline-flex; white-space: nowrap; animation: rt-marquee 20s linear infinite; }
        @keyframes rt-fade-in { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
        .rt-fade { animation: rt-fade-in 0.3s ease-out forwards; }
      ` }} />

      <div className="rt-scan-line" />

      <div className="rt-scanlines relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 pb-20">

        {/* Status ticker */}
        <div className="overflow-hidden text-[10px] py-2 border-b border-[#00ff41]/10 text-[#00ff41]/30">
          <span className="rt-marquee">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="mx-16">
                SYSTEM::{serverName.toUpperCase()} &nbsp;▌&nbsp; UPTIME::OK &nbsp;▌&nbsp; SHOP::ONLINE &nbsp;▌&nbsp; MODES::{modes.length} &nbsp;▌&nbsp; PLAYERS::{onlinePlayers ?? "?"} &nbsp;▌&nbsp;
              </span>
            ))}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center justify-between py-6 mb-10">
          <div className="flex items-center gap-3">
            <span className="rt-glow font-bold text-xl tracking-widest">
              {serverName.toUpperCase()}<span className="rt-cursor">█</span>
            </span>
          </div>
          <div className="flex items-center gap-6 text-[10px] uppercase tracking-widest text-[#00ff41]/40">
            <a href="#kategorie" className="rt-btn hover:text-[#00ff41] transition-colors">[SHOP]</a>
            <Link href="/regulamin" className="rt-btn hover:text-[#00ff41] transition-colors">[REGULAMIN]</Link>
            <Link href="/docs" className="rt-btn hover:text-[#00ff41] transition-colors">[POMOC]</Link>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#00ff41] rounded-full animate-pulse rt-glow" />
              <span className="text-[#00ff41]/60">ONLINE:{onlinePlayers !== null ? onlinePlayers : "?"}</span>
            </div>
          </div>
        </nav>

        {/* Boot sequence */}
        <div className="rt-box p-6 mb-12 min-h-[200px]">
          <div className="text-[10px] text-[#00ff41]/30 mb-4 uppercase tracking-widest">
            // SYSTEM_BOOT_LOG:
          </div>
          {bootLines.map((line, i) => (
            <div key={i} className="text-sm mb-1 rt-fade" style={{ color: i === bootLines.length - 1 ? "#00ff41" : "rgba(0,255,65,0.5)" }}>
              <span className="text-[#00ff41]/20 mr-3 text-xs">[{String(i).padStart(2, "0")}]</span>
              {line}
              {i === bootLines.length - 1 && <span className="rt-cursor ml-1">█</span>}
            </div>
          ))}
          {bootLines.length === BOOT_SEQUENCE.length && (
            <div className="mt-4 rt-fade">
              <a
                href="#kategorie"
                className="rt-btn rt-box inline-block px-6 py-3 text-[10px] uppercase tracking-widest font-bold rt-glow hover:bg-[#00ff41]/10 transition-all"
              >
                [ENTER_SHOP]
              </a>
            </div>
          )}
        </div>

        {/* Hero stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { label: "STATUS", value: "ONLINE", ok: true },
            { label: "TRYBY", value: String(modes.length || "?"), ok: null },
            { label: "GRACZE", value: onlinePlayers !== null ? String(onlinePlayers) : "N/A", ok: onlinePlayers !== null },
            { label: "SYSTEM", value: "v2.0", ok: null },
          ].map(({ label, value, ok }) => (
            <div key={label} className="rt-box p-5 text-center">
              <div className="text-[10px] text-[#00ff41]/30 uppercase tracking-widest mb-2">{label}</div>
              <div className={`text-xl font-bold tracking-wider ${ok === true ? "rt-glow text-[#00ff41]" : ok === false ? "text-red-500" : "text-[#00ff41]/70"}`}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Modes */}
        <div id="kategorie" className="mb-16">
          <div className="flex items-center gap-6 mb-8">
            <span className="text-[10px] text-[#00ff41]/40 uppercase tracking-[0.3em]">// AVAILABLE_MODULES</span>
            <div className="flex-1 border-t border-[#00ff41]/10" />
          </div>

          {modes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modes.map((modeName, idx) => {
                const cleanMode = modeName.replace("mc.", "").toLowerCase();
                return (
                  <Link href={`/retro/shop/${cleanMode}`} key={modeName}>
                    <div className="rt-box rt-btn p-6 group cursor-pointer hover:bg-[#00ff41]/3 transition-all">
                      <div className="text-[10px] text-[#00ff41]/25 mb-3 uppercase tracking-widest">
                        MODULE_{String(idx + 1).padStart(2, "0")}
                      </div>
                      <h3 className="text-xl font-bold uppercase tracking-widest mb-3 group-hover:rt-glow transition-all">
                        {modeName.toUpperCase()}
                      </h3>
                      <div className="flex items-center justify-between text-[10px] text-[#00ff41]/30 uppercase tracking-widest">
                        <span>STATUS::READY</span>
                        <span className="group-hover:text-[#00ff41] transition-colors">[ACCESS] →</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rt-box p-8 text-center text-[#00ff41]/25 text-sm animate-pulse">
              &gt; LOADING_MODULES... PLEASE_WAIT
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="rt-box p-8 mb-12">
          <div className="text-[10px] text-[#00ff41]/30 mb-6 uppercase tracking-widest">// SYSTEM_INFO</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-[#00ff41]/50 mb-3 uppercase text-xs tracking-widest">Jak kupić?</div>
              {[
                "1. Wybierz moduł (tryb gry)",
                "2. Podaj swój nick z Minecraft",
                "3. Kliknij [EXECUTE_BUY]",
                "4. Sfinalizuj płatność przez Stripe",
                "5. Odbierz w grze: /magazyn",
              ].map((line) => (
                <div key={line} className="text-[#00ff41]/40 mb-1.5">&gt; {line}</div>
              ))}
            </div>
            <div>
              <div className="text-[#00ff41]/50 mb-3 uppercase text-xs tracking-widest">System punktów</div>
              {[
                "10 PKT za każdy 1 PLN zakupu",
                "Sprawdź saldo: /punkty",
                "Wymień punkty na nagrody w grze",
                "Darmowy bonus każdego dnia",
              ].map((line) => (
                <div key={line} className="text-[#00ff41]/40 mb-1.5">&gt; {line}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-[#00ff41]/10 text-[10px] text-[#00ff41]/20 uppercase tracking-widest">
          <span>© 2026 {serverName.toUpperCase()} — ALL_RIGHTS_RESERVED</span>
          <div className="flex gap-8">
            <Link href="/regulamin" className="hover:text-[#00ff41]/50 transition-colors">[REGULAMIN]</Link>
            <Link href="/docs" className="hover:text-[#00ff41]/50 transition-colors">[POMOC]</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
