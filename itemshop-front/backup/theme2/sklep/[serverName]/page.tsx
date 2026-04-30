"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function Theme2Storefront() {
  const params = useParams();
  const serverName = params.serverName as string;

  const [products, setProducts] = useState<any[]>([]);
  const [playerNick, setPlayerNick] = useState("");
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);
  const [status, setStatus] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, infoRes] = await Promise.all([
          fetch(`http://localhost:8080/api/storefront/${serverName}/produkty`),
          fetch(`http://localhost:8080/api/storefront/${serverName}/info`)
        ]);

        if (prodRes.ok) setProducts(await prodRes.json());
        if (infoRes.ok) {
          const info = await infoRes.json();
          const mcRes = await fetch(`https://api.mcsrvstat.us/2/${info.serverIp}`);
          if (mcRes.ok) {
            const mcData = await mcRes.json();
            setOnlinePlayers(mcData.players?.online ?? 0);
          }
        }
      } catch (e) { console.error("Błąd pobierania danych"); }
    };
    fetchData();
  }, [serverName]);

  const handleBuy = async (productId: number) => {
    if (!playerNick) {
      setStatus({ type: "error", text: "Wpisz swój nick!" });
      return;
    }
    setStatus({ type: "loading", text: "Przetwarzanie..." });
    try {
      const res = await fetch(`http://localhost:8080/api/storefront/${serverName}/kup?productId=${productId}&nick=${playerNick}`, { method: "POST" });
      if (res.ok) setStatus({ type: "success", text: "Odbierz przedmiot w grze: /magazyn" });
      else setStatus({ type: "error", text: "Błąd zakupu." });
    } catch (e) { setStatus({ type: "error", text: "Serwer offline." }); }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500">
      {/* BACKGROUND DECORATION */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* NAV / LOGO */}
        <nav className="flex justify-between items-center mb-24">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              M
            </div>
            <h1 className="text-2xl font-black tracking-tighter italic">
              mc.<span className="text-purple-500">{serverName}</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2 rounded-2xl">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
              {/* TUTAJ BYŁ BŁĄD - TERAZ JEST POPRAWNE ZAMKNIĘCIE </span> */}
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                Online: <span className="text-white">{onlinePlayers ?? "..."}</span>
              </span> 
            </div>
          </div>
        </nav>

        {/* HERO SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
          <div className="animate-in fade-in slide-in-from-left-8 duration-700">
            <span className="bg-purple-600/20 text-purple-400 text-[10px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full border border-purple-600/30">
              Oficjalny Sklep Sieci
            </span>
            <h2 className="text-7xl font-black mt-6 mb-8 leading-[0.9] tracking-tighter">
              ZDOBĄDŹ <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">PRZEWAGĘ</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-md mb-10 leading-relaxed">
              Wspieraj rozwój serwera <span className="text-white font-bold">{serverName}</span> i odbieraj unikalne przedmioty bezpośrednio w grze komendą <span className="text-purple-400 font-mono">/magazyn</span>.
            </p>
            <div className="flex gap-4">
              <a href="#produkty" className="bg-white text-black px-10 py-5 rounded-2xl font-black uppercase text-sm hover:bg-purple-500 hover:text-white transition-all shadow-xl active:scale-95">
                Przeglądaj Sklep
              </a>
              <button className="bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl font-black uppercase text-sm hover:bg-white/10 transition-all">
                Discord
              </button>
            </div>
          </div>
          <div className="relative group animate-in fade-in zoom-in-95 duration-1000">
            <div className="absolute inset-0 bg-purple-600/20 blur-[100px] rounded-full group-hover:bg-purple-600/30 transition-all"></div>
            <img src="/villager.png" alt="Minecraft" className="relative z-10 w-full drop-shadow-2xl motion-safe:animate-[float_6s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* NICKNAME BOX */}
        <div className="max-w-2xl mx-auto mb-24 text-center">
            <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-[40px] shadow-3xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-6">Podaj swój nick, aby kupować</h3>
                <div className="flex gap-3">
                    <input 
                        type="text" 
                        value={playerNick}
                        onChange={(e) => setPlayerNick(e.target.value)}
                        placeholder="Twój nick z Minecraft..." 
                        className="flex-1 bg-white/5 border border-white/10 px-6 py-5 rounded-2xl outline-none focus:border-purple-500 transition-all font-bold text-center text-xl" 
                    />
                </div>
                {status && (
                    <div className={`mt-4 p-4 rounded-xl text-xs font-black uppercase border ${status.type === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        {status.text}
                    </div>
                )}
            </div>
        </div>

        {/* PRODUCTS GRID */}
        <div id="produkty" className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.map((p) => (
            <div key={p.id} className="bg-gradient-to-b from-white/5 to-transparent border border-white/5 p-2 rounded-[48px] hover:border-purple-500/30 transition-all group">
              <div className="bg-[#0A0A0A] rounded-[40px] p-8 h-full flex flex-col">
                <div className="mb-8 relative h-48 flex items-center justify-center bg-white/[0.02] rounded-3xl overflow-hidden shadow-inner">
                    {p.imageUrl ? (
                        <img src={p.imageUrl} className="w-32 h-32 object-contain group-hover:scale-110 transition-transform duration-500" alt={p.name} />
                    ) : (
                        <span className="text-7xl">{p.iconEmoji || "📦"}</span>
                    )}
                    <div className="absolute top-4 right-4 bg-purple-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
                        {p.mode || "Global"}
                    </div>
                </div>
                <h4 className="text-2xl font-black mb-2 group-hover:text-purple-400 transition-colors">{p.name}</h4>
                <p className="text-gray-500 text-sm mb-8 line-clamp-2">{p.description}</p>
                <div className="mt-auto flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Cena</p>
                        <p className="text-xl font-black text-purple-400">{p.price.toFixed(2)} <span className="text-xs">PLN</span></p>
                    </div>
                    <button onClick={() => handleBuy(p.id)} className="bg-purple-600 hover:bg-purple-500 p-4 rounded-2xl transition-all active:scale-90 shadow-lg shadow-purple-600/20">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <footer className="mt-48 pt-12 border-t border-white/5 flex justify-between items-center text-gray-600">
            <p className="text-xs font-bold uppercase tracking-widest">mc.{serverName} &copy; 2026</p>
            <div className="flex gap-8 text-[10px] font-black uppercase">
                <a href="#" className="hover:text-white transition-colors">Regulamin</a>
                <a href="#" className="hover:text-white transition-colors">Kontakt</a>
            </div>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </main>
  );
}