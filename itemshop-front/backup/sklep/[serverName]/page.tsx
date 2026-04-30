"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

// --- FUNKCJA POMOCNICZA: Style dla trybów ---
const getModeStyle = (modeName: string) => {
  const name = modeName.toLowerCase();
  if (name.includes("survival")) return { color: "text-emerald-400", border: "border-emerald-400/50", glow: "shadow-[0_0_30px_rgba(52,211,153,0.15)]", img: "/survival.png" };
  if (name.includes("boxpvp")) return { color: "text-orange-400", border: "border-orange-400/50", glow: "shadow-[0_0_30px_rgba(251,146,60,0.15)]", img: "/survival.png" }; // Zmień na /boxpvp.png jak będziesz mieć
  if (name.includes("oneblock")) return { color: "text-cyan-400", border: "border-cyan-400/50", glow: "shadow-[0_0_30px_rgba(34,211,238,0.15)]", img: "/survival.png" }; // Zmień na /oneblock.png
  
  // Domyślny / Niestandardowy tryb (np. MegaDrop)
  return { color: "text-[#bbf028]", border: "border-[#bbf028]/50", glow: "shadow-[0_0_30px_rgba(187,240,40,0.15)]", img: "/survival.png" };
};

export default function ShopPage() {
  const params = useParams();
  const serverName = params.serverName as string;

  // --- STAN APLIKACJI ---
  const [playerNick, setPlayerNick] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [topDonators, setTopDonators] = useState<any[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  // Zaznaczony tryb serwera
  const [activeMode, setActiveMode] = useState<string>("");

  // --- LOGIKA DYNAMICZNYCH TRYBÓW ---
  const availableModes = Array.from(new Set(products.map(p => p.mode || "Główny")));
  const displayedProducts = products.filter(p => (p.mode || "Główny") === activeMode);

  // --- POBIERANIE DANYCH ---
  useEffect(() => {
    if (!serverName) return;

    const fetchData = async () => {
      try {
        const [infoRes, prodRes, topRes, recentRes] = await Promise.all([
          fetch(`http://localhost:8080/api/storefront/${serverName}/info`),
          fetch(`http://localhost:8080/api/storefront/${serverName}/produkty`),
          fetch(`http://localhost:8080/api/storefront/${serverName}/top-donatorzy`),
          fetch(`http://localhost:8080/api/storefront/${serverName}/ostatnie-zakupy`)
        ]);

        if (prodRes.ok) {
          const prods = await prodRes.json();
          setProducts(prods);
          
          const modes = Array.from(new Set(prods.map((p: any) => p.mode || "Główny")));
          if (modes.length > 0) setActiveMode(modes[0] as string);
        }
        
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

        // POBIERANIE GRACZY ONLINE NA BAZIE IP Z BAZY
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info.serverIp && info.serverIp.trim() !== "") {
            try {
              const statusRes = await fetch(`https://api.mcsrvstat.us/2/${info.serverIp}`);
              if (statusRes.ok) {
                const status = await statusRes.json();
                setOnlinePlayers(status.players ? status.players.online : 0);
              }
            } catch (err) {
              setOnlinePlayers(null);
            }
          } else {
            setOnlinePlayers(null); 
          }
        }
      } catch (e) {
        console.error("Błąd pobierania danych:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [serverName]);

  // --- ZAKUP ---
  const handleBuy = async (productId: number, productName: string) => {
    if (!playerNick.trim()) {
      setMessage({ type: "error", text: "Podaj najpierw swój nick!" });
      return;
    }
    setMessage({ type: "loading", text: `Przetwarzanie...` });

    try {
      const res = await fetch(`http://localhost:8080/api/storefront/${serverName}/kup?productId=${productId}&nick=${playerNick}`, { method: "POST" });
      if (res.ok) {
        setMessage({ type: "success", text: `SUKCES! SPRAWDŹ /MAGAZYN` });
        const recentRes = await fetch(`http://localhost:8080/api/storefront/${serverName}/ostatnie-zakupy`);
        if (recentRes.ok) setRecentPurchases(await recentRes.json());
      } else {
        const err = await res.text();
        setMessage({ type: "error", text: `BŁĄD: ${err || "Odrzucono"}` });
      }
    } catch (error) {
      setMessage({ type: "error", text: "BRAK POŁĄCZENIA Z SERWEREM" });
    }
  };

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
                <span className="text-[#bbf028] font-black">{serverName}</span>
              </div>
            </div>
            <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
              <a href="#" className="text-[#bbf028]">Strona główna</a>
              <a href="#sklep" className="hover:text-white transition-colors">Sklep</a>
              <a href="#" className="hover:text-white transition-colors">Regulamin</a>
            </div>
          </div>
          
          {/* LICZNIK GRACZY ONLINE */}
          <div className="flex items-center gap-3 text-sm bg-[#1c1c1c] border border-white/5 px-4 py-2 rounded-full shadow-lg">
            <div className={`w-2.5 h-2.5 rounded-full ${onlinePlayers !== null ? 'bg-[#bbf028] animate-pulse ring-2 ring-[#bbf028]/20' : 'bg-red-500 ring-2 ring-red-500/20'}`}></div>
            <span className="text-gray-400">Online: <span className="font-bold text-white">{onlinePlayers !== null ? onlinePlayers : 'OFFLINE'}</span></span>
          </div>
        </nav>

        {/* --- HERO SECTION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-32">
          <div className="z-10">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
              Dołącz do świata <br />
              <span className={getModeStyle(activeMode).color}>{activeMode || "Serwera"}</span> teraz
            </h1>
            <p className="text-gray-400 text-base md:text-lg mb-10 max-w-lg leading-relaxed">
              Zdobądź potężne przedmioty, wesprzyj rozwój serwera i zdominuj rozgrywkę. Każdy zakup pomaga nam tworzyć lepsze miejsce do gry.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#sklep" className="bg-[#bbf028] hover:bg-[#a6d623] text-black font-semibold px-8 py-4 rounded-xl flex items-center gap-3 transition-all active:scale-95 shadow-[0_0_20px_rgba(187,240,40,0.2)]">
                Przeglądaj ofertę
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <a href="#" className="bg-[#1c1c1c] hover:bg-[#252525] text-white border border-white/5 font-semibold px-8 py-4 rounded-xl flex items-center gap-3 transition-all">
                Dołącz do Discorda
              </a>
            </div>
          </div>

          <div className="relative h-[500px] w-full flex items-center justify-center hidden lg:flex">
            <div className="absolute left-0 top-20 bg-[#1c1c1c]/80 backdrop-blur-md border border-white/5 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 animate-float z-20">
              <span className="text-2xl">📦</span>
              <p className="text-sm text-gray-300">Wszystko automatycznie w <span className="text-[#bbf028] font-bold">/magazyn</span></p>
            </div>
            <div className="absolute left-10 bottom-32 bg-[#1c1c1c]/80 backdrop-blur-md border border-white/5 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 animate-float-slow z-20">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-500/20"></div>
              <p className="text-sm text-gray-300">Sklep połączony <span className="text-[#bbf028] font-bold">na żywo</span> z grą.</p>
            </div>
            <img src="/villager.png" alt="Villager Render" className="absolute right-0 h-[120%] object-contain drop-shadow-[0_0_50px_rgba(187,240,40,0.15)] z-10" />
          </div>
        </div>

        {/* --- DYNAMICZNA SEKCJA TRYBÓW --- */}
        {availableModes.length > 1 && (
          <div className="mb-32">
            <div className="bg-[#151515] border border-white/5 rounded-[40px] p-6 lg:p-10 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {availableModes.map((modeName) => {
                  const style = getModeStyle(modeName as string);
                  const isActive = activeMode === modeName;

                  return (
                    <div 
                      key={modeName as string} 
                      onClick={() => setActiveMode(modeName as string)} 
                      className={`group cursor-pointer bg-[#1c1c1c] rounded-3xl p-8 relative overflow-hidden transition-all duration-300 border ${isActive ? `${style.border} ${style.glow} scale-[1.02]` : 'border-white/5 hover:border-white/10'}`}
                    >
                      <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-white mb-6 truncate">{modeName as string}</h3>
                        <div className="flex items-center gap-3 text-sm font-semibold transition-colors">
                          <svg className={`w-5 h-5 transition-colors ${isActive ? style.color : 'text-gray-500 group-hover:text-white'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                          <span className={isActive ? style.color : 'text-gray-500 group-hover:text-white'}>Przejdź do trybu</span>
                        </div>
                      </div>
                      <img src={style.img} className={`absolute -right-8 top-1/2 -translate-y-1/2 w-48 h-48 object-contain transition-transform duration-500 ${isActive ? 'opacity-90 scale-110 drop-shadow-2xl' : 'opacity-20 grayscale group-hover:grayscale-[50%] group-hover:scale-105'}`} alt={`${modeName} Icon`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- OSTATNIE ZAKUPY --- */}
        {recentPurchases.length > 0 && (
          <div className="bg-[#1c1c1c] border border-white/5 rounded-2xl overflow-hidden py-4 flex items-center relative mb-16 shadow-lg">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#1c1c1c] to-transparent z-10"></div>
            <div className="animate-marquee flex gap-12 items-center text-sm font-medium text-gray-400">
              {recentPurchases.map((purchase, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className={getModeStyle(activeMode).color}>⚡</span>
                  <p><span className="font-bold text-white">{purchase.nick}</span> kupił <span className="text-white">{purchase.item}</span></p>
                  <span className="text-xs text-gray-600 border border-white/10 px-2 py-0.5 rounded-md">{purchase.time}</span>
                </div>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#1c1c1c] to-transparent z-10"></div>
          </div>
        )}

        {/* --- OFERTA SKLEPU --- */}
        <div id="sklep" className="scroll-mt-12 mb-32">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-4">
            Oferta dla: <span className={getModeStyle(activeMode).color}>{activeMode || "Serwera"}</span> <div className="h-px flex-1 bg-white/5"></div>
          </h2>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="w-full lg:w-1/3 bg-[#1c1c1c] p-8 rounded-[32px] border border-white/5 sticky top-8 shadow-xl">
              <h3 className="text-lg font-bold mb-6 text-white">Weryfikacja gracza</h3>
              <div className={`bg-[#111111] p-2 rounded-2xl border border-white/5 flex items-center mb-6 focus-within:${getModeStyle(activeMode).border} transition-colors`}>
                <div className="p-3 text-gray-400"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
                <input type="text" placeholder="Twój nick z serwera" value={playerNick} onChange={(e) => setPlayerNick(e.target.value)} className="bg-transparent w-full px-2 outline-none text-white font-medium placeholder-gray-600" />
              </div>
              {message && (
                <div className={`p-4 rounded-xl mb-6 text-sm font-medium border ${message.type === 'success' ? 'bg-[#bbf028]/10 text-[#bbf028] border-[#bbf028]/20' : message.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse'}`}>
                  {message.text}
                </div>
              )}
              <p className="text-sm text-gray-500 leading-relaxed">
                Przed zakupem upewnij się, że wpisany nick jest poprawny. Przedmioty trafiają do schowka <code className="bg-white/5 px-1 py-0.5 rounded text-white">/magazyn</code>.
              </p>
            </div>

            <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
              {isLoading ? (
                [1, 2, 3, 4].map((i) => <div key={i} className="bg-[#1c1c1c] rounded-[32px] border border-white/5 p-6 h-48 animate-pulse"></div>)
              ) : displayedProducts.length === 0 ? (
                <div className="col-span-2 py-20 text-center text-gray-500 font-medium bg-[#1c1c1c] rounded-[32px] border border-dashed border-white/10">Brak ofert w tym trybie.</div>
              ) : (
                displayedProducts.map((p) => {
                  const style = getModeStyle(activeMode);
                  return (
                  <div key={p.id} className="bg-[#1c1c1c] rounded-[32px] border border-white/5 p-6 flex flex-col justify-between hover:border-white/10 transition-colors duration-300 relative overflow-hidden group shadow-lg">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-12 relative z-10">
                      <div>
                        <h4 className="text-2xl font-bold text-white mb-2">{p.name}</h4>
                        <p className="text-sm text-gray-400 font-medium">{p.price.toFixed(2)} PLN</p>
                      </div>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
                      ) : (
                        <div className="text-5xl drop-shadow-2xl group-hover:scale-110 transition-transform duration-500">{p.iconEmoji}</div>
                      )}
                    </div>
                    <div className="flex items-center justify-between relative z-10 border-t border-white/5 pt-6 mt-auto">
                      <p className="text-xs text-gray-500 line-clamp-1 max-w-[50%]">{p.description}</p>
                      <button onClick={() => handleBuy(p.id, p.name)} className={`flex items-center gap-2 ${style.color} font-bold text-sm hover:text-white transition-colors`}>
                        Wybieram <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </button>
                    </div>
                  </div>
                )})
              )}
            </div>
          </div>
        </div>

        {/* --- TOP DONATORZY --- */}
        <div className="mb-24">
           <h2 className="text-xl font-bold mb-8 flex items-center gap-4 text-white">
             Wspierający serwer <div className={`w-16 h-[2px] bg-current ${getModeStyle(activeMode).color}`}></div> <div className="h-px flex-1 bg-white/5"></div>
           </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoading ? (
              [1, 2, 3].map((rank) => <div key={rank} className="bg-[#1c1c1c] animate-pulse rounded-3xl border border-white/5 h-32"></div>)
            ) : (
              topDonators.map((donator) => (
                <div key={donator.rank} className={`flex flex-col bg-[#1c1c1c] p-6 rounded-3xl border border-white/5 ${donator.rank === 1 && !donator.isUnknown ? `ring-1 ${getModeStyle(activeMode).border}` : ''} shadow-lg`}>
                  <div className="flex items-center gap-4 mb-6">
                    <img src={donator.isUnknown ? "https://minotar.net/helm/MHF_Question/120.png" : `https://minotar.net/helm/${donator.nick}/120.png`} alt={donator.nick} className={`rounded-xl w-12 h-12 ${donator.isUnknown ? 'opacity-20 grayscale' : ''}`} />
                    <div>
                      <h3 className={`font-bold ${donator.isUnknown ? 'text-gray-600' : 'text-white'}`}>{donator.nick}</h3>
                      <p className={`text-xs ${donator.rank === 1 && !donator.isUnknown ? getModeStyle(activeMode).color : 'text-gray-500'}`}>
                        {donator.isUnknown ? 'Brak danych' : donator.rank === 1 ? 'Największy patron' : 'Wspierający'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#111111] border border-white/5 py-3 px-4 rounded-xl flex justify-between items-center text-sm">
                    <span className="text-gray-400">Wsparcie:</span>
                    <span className="text-white font-bold flex items-center gap-2">
                      {!donator.isUnknown ? `${Number(donator.amount).toFixed(2)} PLN` : '-'}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- FOOTER --- */}
        <footer className="border-t border-white/5 pt-8 pb-16 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-gray-500">
          <div>
            <p className="mb-2">Copyright 2026 - <span className={getModeStyle(activeMode).color}>CubeStore.pl</span></p>
            <p className="text-xs max-w-xl">Serwer {serverName} nie jest powiązany z firmą Mojang AB. Środki z zakupów pomagają w rozwoju i utrzymaniu projektu.</p>
          </div>
          <div className="flex items-center gap-8">
             <a href="#" className="hover:text-white transition-colors">Polityka prywatności</a>
             <a href="#" className="hover:text-white transition-colors">Regulamin</a>
          </div>
        </footer>

      </div>
    </main>
  );
}