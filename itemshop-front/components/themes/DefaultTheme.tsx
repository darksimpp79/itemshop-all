"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useShop } from "@/hooks/useShop";
import { getModeStyle } from "@/lib/utils";

interface DefaultThemeProps {
  serverName: string;
}

export default function DefaultTheme({ serverName }: DefaultThemeProps) {
  const [topDonators, setTopDonators] = useState<any[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);
  const [availableModes, setAvailableModes] = useState<string[]>([]);

  const { products, modes, serverInfo } = useShop(serverName);

  useEffect(() => {
    if (modes.length > 0) {
      setAvailableModes(modes);
    }
  }, [modes]);

  // Fetch top donators and recent purchases
  useEffect(() => {
    if (!serverName) return;

    const fetchExtra = async () => {
      try {
        const [infoRes, topRes, recentRes] = await Promise.all([
          fetch(`/api/storefront/${serverName.toLowerCase()}/info`),
          fetch(`/api/storefront/${serverName.toLowerCase()}/top-donatorzy`),
          fetch(`/api/storefront/${serverName.toLowerCase()}/ostatnie-zakupy`)
        ]);

        if (topRes.ok) {
          const rawTop = await topRes.json();
          const formattedTop = [
            rawTop[1] ? { ...rawTop[1], rank: 2 } : { nick: "???", amount: 0, rank: 2, isUnknown: true },
            rawTop[0] ? { ...rawTop[0], rank: 1 } : { nick: "Brak Króla", amount: 0, rank: 1, isUnknown: true },
            rawTop[2] ? { ...rawTop[2], rank: 3 } : { nick: "???", amount: 0, rank: 3, isUnknown: true }
          ];
          setTopDonators(formattedTop);
        }

        if (recentRes.ok) setRecentPurchases(await recentRes.json());

        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info.serverIp && info.serverIp.trim() !== "") {
            try {
              const statusRes = await fetch(`https://api.mcsrvstat.us/2/${info.serverIp}`);
              if (statusRes.ok) {
                const status = await statusRes.json();
                setOnlinePlayers(status.players ? status.players.online : 0);
              }
            } catch (err) { setOnlinePlayers(null); }
          } else { setOnlinePlayers(null); }
        }
      } catch (e) {
        console.error("Error fetching extras:", e);
        // Let error propagate - don't use mock data
      }
    };

    fetchExtra();
  }, [serverName]);

  return (
    <main className="min-h-screen bg-[#111111] text-white font-sans selection:bg-[#bbf028] selection:text-black pb-24 overflow-x-hidden relative"
          style={{ backgroundImage: `url('/bgMain.png')`, backgroundRepeat: 'repeat' }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-15px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        @keyframes float-slow { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        @keyframes marquee { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        .animate-marquee { display: inline-flex; white-space: nowrap; animation: marquee 30s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }
      `}} />

      <div className="absolute inset-0 bg-[#111111]/80 pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6">
        
        {/* --- NAVBAR --- */}
        <nav className="flex items-center justify-between py-8 mb-10">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1c1c1c] border border-white/10 rounded-full flex items-center justify-center">🌍</div>
              <div className="text-xl font-bold tracking-tight border-l border-white/10 pl-4 ml-2">
                <span className="text-[#bbf028] font-black uppercase italic">{serverName}</span>
              </div>
            </div>
            <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400 uppercase tracking-widest">
              <Link href="/" className="text-[#bbf028]">Strona główna</Link>
              <Link href="/regulamin" className="hover:text-white transition-colors">Regulamin</Link>
              <Link href="/bonus" className="hover:text-white transition-colors">Darmowy Bonus</Link>
              <Link href="/themes" className="hover:text-[#bbf028] transition-colors">Motywy</Link>
              <Link href="/docs" className="hover:text-white transition-colors">Pomoc</Link>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm bg-[#1c1c1c] border border-white/5 px-4 py-2 rounded-full shadow-lg">
            <div className={`w-2.5 h-2.5 rounded-full ${onlinePlayers !== null ? 'bg-[#bbf028] animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Online: <span className="text-white">{onlinePlayers !== null ? onlinePlayers : 'OFFLINE'}</span></span>
          </div>
        </nav>

        {/* --- HERO SECTION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-32">
          <div className="z-10">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-6 leading-[1.1] uppercase italic">
              Dołącz do świata <br />
              <span className="text-[#bbf028]">Sklepu</span> teraz
            </h1>
            <p className="text-gray-400 text-base md:text-lg mb-8 max-w-lg leading-relaxed font-medium">
              Zdobądź potężne przedmioty, wesprzyj rozwój serwera i zdominuj rozgrywkę. Każdy zakup pomaga nam tworzyć lepsze miejsce do gry.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-8">
              <a href="#kategorie" className="bg-[#bbf028] hover:bg-[#a6d623] text-black font-black px-8 py-4 rounded-2xl flex items-center gap-3 transition-all active:scale-95 shadow-[0_0_20px_rgba(187,240,40,0.2)] uppercase text-xs tracking-widest">
                Przeglądaj tryby
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <a href="#" className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black px-8 py-4 rounded-2xl flex items-center gap-3 transition-all uppercase text-xs tracking-widest">
                Dołącz do Discorda
              </a>
            </div>
          </div>

          <div className="relative h-[500px] w-full flex items-center justify-center hidden lg:flex">
            <div className="absolute left-0 top-20 bg-[#1c1c1c]/80 backdrop-blur-md border border-white/5 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 animate-float z-20">
              <span className="text-2xl">📦</span>
              <p className="text-sm text-gray-300 font-bold">Wszystko automatycznie w <span className="text-[#bbf028]">/magazyn</span></p>
            </div>
            <div className="absolute left-10 bottom-32 bg-[#1c1c1c]/80 backdrop-blur-md border border-white/5 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 animate-float-slow z-20">
              <div className="w-2.5 h-2.5 rounded-full bg-[#bbf028] animate-pulse ring-4 ring-[#bbf028]/20"></div>
              <p className="text-sm text-gray-300 font-bold">Sklep połączony <span className="text-[#bbf028]">na żywo</span></p>
            </div>
            <img src="/villager.png" alt="Villager" className="absolute right-0 h-[120%] object-contain drop-shadow-[0_0_50px_rgba(187,240,40,0.15)] z-10" />
          </div>
        </div>

        {/* --- SEKCJA TRYBÓW --- */}
        <div id="kategorie" className="mb-32">
          {availableModes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableModes.map((modeName) => {
                const cleanMode = modeName.replace('mc.', '').toLowerCase();
                const style = getModeStyle(modeName);
                return (
                  <Link href={`/shop/${cleanMode}`} key={modeName}>
                    <div className={`group cursor-pointer bg-[#1c1c1c] rounded-[40px] p-10 relative overflow-hidden transition-all duration-500 border border-white/5 hover:border-white/20 hover:scale-[1.02] ${style.glow}`}>
                      <div className="relative z-10">
                        <h3 className="text-3xl font-black text-white mb-8 truncate uppercase italic">{modeName}</h3>
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-colors">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors bg-white/5 group-hover:${style.color.replace('text', 'bg')}/10 group-hover:${style.color}`}>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                          </div>
                          <span className="text-gray-500 group-hover:text-white">Przejdź do sklepu</span>
                        </div>
                      </div>
                      <img src={style.glow ? "/survival.png" : "/survival.png"} className="absolute -right-8 top-1/2 -translate-y-1/2 w-48 h-48 object-contain transition-all duration-700 opacity-10 grayscale group-hover:grayscale-0 group-hover:opacity-40 group-hover:scale-125" alt="" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-700 font-black uppercase tracking-[0.3em] border-2 border-dashed border-white/5 rounded-[40px]">
              Oczekiwanie na tryby...
            </div>
          )}
        </div>

        {/* --- OSTATNIE ZAKUPY --- */}
        {recentPurchases.length > 0 && (
          <div className="bg-[#1c1c1c] border border-white/5 rounded-3xl overflow-hidden py-5 flex items-center relative mb-16 shadow-2xl">
            <div className="animate-marquee flex gap-16 items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
              {recentPurchases.map((purchase, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="text-[#bbf028] text-lg">⚡</span>
                  <p><span className="text-white italic">{purchase.nick}</span> kupił <span className="text-[#bbf028]">{purchase.item}</span></p>
                  <span className="bg-white/5 px-3 py-1 rounded-lg text-gray-600">{purchase.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TOP DONATORZY --- */}
        <div className="mb-24">
           <h2 className="text-xl font-black mb-10 flex items-center gap-6 text-white uppercase italic">
             Wspierający serwer <div className="h-px flex-1 bg-gradient-to-r from-[#bbf028]/50 to-transparent"></div>
           </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topDonators.map((donator) => (
              <div key={donator.rank} className={`flex flex-col bg-[#1c1c1c] p-8 rounded-[35px] border border-white/5 ${donator.rank === 1 && !donator.isUnknown ? `border-[#bbf028]/30 shadow-[0_0_40px_rgba(187,240,40,0.05)]` : ''} transition-all hover:border-white/10`}>
                <div className="flex items-center gap-5 mb-8">
                  <div className="relative">
                    <img src={donator.isUnknown ? "https://minotar.net/helm/MHF_Question/120.png" : `https://minotar.net/helm/${donator.nick}/120.png`} alt="" className={`rounded-2xl w-14 h-14 ${donator.isUnknown ? 'opacity-20 grayscale' : 'shadow-lg'}`} />
                    {donator.rank === 1 && <span className="absolute -top-2 -right-2 text-xl">👑</span>}
                  </div>
                  <div>
                    <h3 className={`font-black uppercase italic ${donator.isUnknown ? 'text-gray-700' : 'text-white'}`}>{donator.nick}</h3>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${donator.rank === 1 && !donator.isUnknown ? 'text-[#bbf028]' : 'text-gray-500'}`}>
                      {donator.isUnknown ? 'Miejsce wolne' : donator.rank === 1 ? 'Król Serwera' : `Top #${donator.rank}`}
                    </p>
                  </div>
                </div>
                <div className="bg-[#0a0a0a] py-4 px-6 rounded-2xl flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase text-gray-600 tracking-widest">Suma:</span>
                  <span className="text-white font-black tracking-tighter">
                    {!donator.isUnknown ? `${Number(donator.amount).toFixed(2)}` : '0.00'} <span className="text-[10px] text-gray-600">PLN</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- FOOTER --- */}
        <footer className="border-t border-white/5 pt-12 pb-16 flex flex-col md:flex-row justify-between items-center gap-10 text-[10px] font-black uppercase tracking-widest text-gray-600">
          <div className="text-center md:text-left">
            <p className="mb-3">© 2026 <span className="text-white italic">TwierdzaSaaS</span> – WSZELKIE PRAWA ZASTRZEŻONE</p>
            <p className="max-w-xl leading-loose opacity-40 italic">SERWER NIE JEST POWIĄZANY Z MOJANG AB. KAŻDY ZAKUP WSPIERA DZIAŁANIE PROJEKTU.</p>
          </div>
          <div className="flex items-center gap-10">
             <Link href="/regulamin" className="hover:text-[#bbf028] transition-colors">Regulamin</Link>
             <Link href="/docs" className="hover:text-[#bbf028] transition-colors">Pomoc / Wiki</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
