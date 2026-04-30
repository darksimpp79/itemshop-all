"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function RPGTheme() {
  const params = useParams();
  const serverName = (params.serverName as string)?.toLowerCase();

  const [products, setProducts] = useState<any[]>([]);
  const [playerNick, setPlayerNick] = useState("");
  const [status, setStatus] = useState<{ type: string; text: string } | null>(null);
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [topDonators, setTopDonators] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [rewardTimer, setRewardTimer] = useState<number | null>(null);

  useEffect(() => {
  // Jeśli serverName nie przyszedł z params, spróbujmy go wyciągnąć z hosta jako fallback
  const effectiveServerName = serverName || window.location.hostname.split('.')[0];
  
  if (!effectiveServerName) return;

  const fetchData = async () => {
    try {
      // Używamy 127.0.0.1 zamiast localhost, żeby ominąć błędy sieciowe na Fedorze
      const baseUrl = `http://127.0.0.1:8080/api/storefront/${effectiveServerName.toLowerCase()}`;
      
      console.log("Twierdza pobiera dane z:", baseUrl);

      const [prodRes, recentRes, topRes] = await Promise.all([
        fetch(`${baseUrl}/produkty`),
        fetch(`${baseUrl}/ostatnie-zakupy`),
        fetch(`${baseUrl}/top-donatorzy`)
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
        console.log(products)
        console.log("Produkty załadowane:", prodData.length);
      }
      
      if (recentRes.ok) setRecentPurchases(await recentRes.json());
      if (topRes.ok) setTopDonators(await topRes.json());
      
    } catch (e) { 
      console.error("Błąd krytyczny komunikacji z API:", e); 
    }
  };

  fetchData();
}, [serverName]);

  return (
    <main className="font-sans selection:bg-blue-600 pb-24 text-white bg-[#0a0a0a] min-h-screen">
      {/* HERO SECTION - PRZYWRÓCONE STYLE */}
      <div className="relative py-32 overflow-hidden border-b border-white/5 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10 text-center lg:text-left">
            <h2 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter leading-none uppercase italic">
              ZDOBĄDŹ <br/> <span className="text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">PRZEWAGĘ</span>
            </h2>
            <p className="text-gray-400 text-xl max-w-lg mb-10 mx-auto lg:mx-0 font-medium">
              Wesprzyj rozwój serwera <span className="text-white font-black uppercase tracking-widest">{serverName}</span> i odbierz unikalne bonusy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
               <input 
                  type="text" value={playerNick} onChange={(e) => setPlayerNick(e.target.value)}
                  placeholder="TWÓJ NICK..." 
                  className="bg-[#141414] border border-white/10 px-8 py-5 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-xl shadow-2xl text-center" 
               />
               <button onClick={() => {/* Daily Reward */}} className="bg-orange-600 hover:bg-orange-500 px-8 py-5 rounded-2xl font-black uppercase text-sm tracking-tighter transition-all shadow-lg active:scale-95">
                  🎁 ODBIERZ BONUS
               </button>
            </div>
          </div>
          <div className="hidden lg:flex justify-end"><img src="/villager.png" className="w-[500px] drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]" alt="" /></div>
        </div>
      </div>

      {/* STATS SECTION - LEPSZE KAFELKI */}
      <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-20 space-y-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-[#121212] border border-white/5 rounded-[40px] p-10 shadow-2xl">
            <h3 className="text-blue-500 font-black uppercase tracking-widest mb-8 flex items-center gap-3">
              <span className="w-8 h-1 bg-blue-500 rounded-full"></span> NAJWIĘKSI DARCZYŃCY
            </h3>
            <div className="grid grid-cols-3 gap-6">
                {topDonators.length > 0 ? topDonators.map((d, i) => (
                    <div key={i} className="flex flex-col items-center p-6 bg-white/[0.03] rounded-3xl border border-white/5 hover:border-blue-500/40 transition-all">
                        <img src={`https://minotar.net/helm/${d.nick}/64.png`} className="w-14 h-14 rounded-2xl mb-4 shadow-xl" alt="" />
                        <span className="font-bold text-base">{d.nick}</span>
                        <span className="text-blue-400 font-black mt-1">{d.amount.toFixed(2)} PLN</span>
                    </div>
                )) : <div className="col-span-3 text-center text-gray-700 py-10 italic">Czekamy na pierwszych bohaterów...</div>}
            </div>
          </div>
          <div className="bg-[#121212] border border-white/5 rounded-[40px] p-10 shadow-2xl">
            <h3 className="text-green-500 font-black uppercase tracking-widest mb-8">OSTATNIE ZAKUPY</h3>
            <div className="space-y-6">
                {recentPurchases.length > 0 ? recentPurchases.map((p, i) => (
                    <div key={i} className="flex items-center p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                        <img src={`https://minotar.net/avatar/${p.nick}/40.png`} className="w-10 h-10 rounded-full border-2 border-white/10" alt="" />
                        <div className="ml-5"><span className="block font-bold">{p.nick}</span><span className="text-[10px] text-gray-500 font-black uppercase">{p.item}</span></div>
                    </div>
                )) : <div className="text-center text-gray-700 py-10 italic">Brak zakupów...</div>}
            </div>
          </div>
        </div>

        {/* PRODUKTY - POPRAWIONY GRID */}
        <div>
          <h3 className="text-3xl font-black uppercase italic mb-12 flex items-center gap-4">
             <span className="w-2 h-10 bg-blue-500 rounded-full"></span> Pakiety Premium
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((p) => (
              <div key={p.id} className="bg-[#121212] border border-white/5 rounded-[40px] p-10 flex flex-col group hover:bg-[#161616] transition-all">
                <div className="flex flex-col items-center text-center">
                  <div className="w-28 h-28 mb-8 bg-white/[0.03] rounded-[32px] flex items-center justify-center text-6xl group-hover:scale-110 transition-transform">
                    {p.imageUrl ? <img src={p.imageUrl} className="w-20 h-20 object-contain" alt="" /> : (p.iconEmoji || "⚔️")}
                  </div>
                  <h4 className="text-2xl font-black mb-3 uppercase italic tracking-tight">{p.name}</h4>
                  <p className="text-gray-500 text-sm mb-6 leading-relaxed">{p.description}</p>
                </div>
                <div className="mt-auto flex flex-col items-center">
                  <p className="text-3xl font-black mb-8 text-white">{p.price.toFixed(2)} <span className="text-sm text-gray-600">PLN</span></p>
                  <button onClick={() => setSelectedProduct(p)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest transition-all shadow-[0_10px_20px_rgba(59,130,246,0.3)]">Wybieram</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}