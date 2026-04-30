"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function SpaceIsTheme() {
  const params = useParams();
  const serverName = params.serverName as string;

  // --- STANY APLIKACJI (ZINTEGROWANE Z API) ---
  const [products, setProducts] = useState<any[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);
  
  // Logika zakupowa z poprzedniego sklepu
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [playerNick, setPlayerNick] = useState("");
  const [status, setStatus] = useState<{ type: string; text: string } | null>(null);

  // Wyciągamy unikalne tryby
  const availableModes = Array.from(new Set(products.map(p => p.mode || "Survival")));
  // Filtrujemy produkty dla klikniętego trybu
  const displayedProducts = products.filter(p => (p.mode || "Survival") === activeMode);

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

  // --- FUNKCJA KUPONANIA (BACKEND) ---
  const handleBuy = async (productId: number) => {
    if (!playerNick.trim()) {
      setStatus({ type: "error", text: "Podaj nick przed zakupem!" });
      document.getElementById('nickInput')?.focus();
      return;
    }
    setStatus({ type: "loading", text: "Przetwarzanie..." });
    try {
      const res = await fetch(`http://localhost:8080/api/storefront/${serverName}/kup?productId=${productId}&nick=${playerNick}`, { method: "POST" });
      if (res.ok) {
        setStatus({ type: "success", text: "Płatność udana! Odbierz w grze." });
      } else {
        const err = await res.text();
        setStatus({ type: "error", text: `Błąd: ${err || "Odrzucono"}` });
      }
    } catch (e) { setStatus({ type: "error", text: "Brak połączenia z API." }); }
  };

  const getModeImage = (mode: string) => {
    const name = mode.toLowerCase();
    if (name.includes('boxpvp')) return '/boxpvp.png';
    if (name.includes('oneblock')) return '/oneblock.png';
    if (name.includes('pvp')) return '/sword.png';
    return '/survival.png';
  };

  return (
    <main className="min-h-screen bg-[#141414] text-white font-sans selection:bg-[#218c53]">
      
      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-5 bg-[#111111] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#218c53] rounded-full shadow-[0_0_10px_#218c53]"></div>
          <span className="text-sm font-bold text-gray-300 tracking-wide">
            Graczy online: <span className="text-white">{onlinePlayers ?? 0}</span>
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-300">
          <a href="#" className="text-[#218c53]">Sklep</a>
          <a href="#" className="hover:text-white transition-colors">Regulamin</a>
          <a href="#" className="hover:text-white transition-colors">Dzienna nagroda</a>
          <a href="#" className="hover:text-white transition-colors">Voucher</a>
          
          <div className="flex gap-4 ml-4">
            <span className="cursor-pointer hover:text-white transition-colors">FB</span>
            <span className="cursor-pointer hover:text-white transition-colors">YT</span>
            <span className="cursor-pointer hover:text-white transition-colors">DC</span>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div 
        className="relative w-full h-[350px] md:h-[400px] flex items-center bg-[#1a1a1a]" 
        style={{ 
          backgroundImage: "url('/bedrock.png')", 
          backgroundRepeat: 'repeat', 
          backgroundSize: '256px' 
        }}
      >
         <div className="absolute inset-0 bg-black/60"></div>
         <div className="relative z-10 px-6 md:px-24 max-w-7xl w-full">
            <h1 className="text-5xl md:text-6xl font-bold mb-3 tracking-tight">{serverName}.pl</h1>
            <p className="text-gray-400 mb-10 text-lg">
              Sklep oparty na silniku CubeStore. Przeglądaj ofertę poniżej.
            </p>
            <a href="#kategorie" className="inline-block bg-[#218c53] hover:bg-[#1a7042] text-white px-8 py-3.5 font-bold text-sm transition-colors shadow-lg shadow-[#218c53]/20">
              PRZEJDŹ DO SKLEPU
            </a>
         </div>
      </div>

      {/* KATEGORIE / TRYBY */}
      <div id="kategorie" className={`max-w-[1400px] mx-auto px-6 pt-20 ${!activeMode ? 'pb-20' : 'pb-10'}`}>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {availableModes.map((mode, index) => (
              <div 
                key={index} 
                onClick={() => {
                  setActiveMode(mode as string);
                  setTimeout(() => document.getElementById('oferta')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                className={`bg-[#1c1c1c] p-10 flex flex-col items-center justify-center group transition-colors cursor-pointer border ${activeMode === mode ? 'border-[#218c53]' : 'border-transparent hover:border-white/5 hover:bg-[#202020]'}`}
              >
                 <div className="relative w-32 h-32 mb-8 animate-float">
                    <img 
                      src={getModeImage(mode as string)} 
                      alt={mode as string} 
                      className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.25)] group-hover:drop-shadow-[0_0_35px_rgba(255,255,255,0.4)] transition-all duration-500" 
                    />
                 </div>
                 <h3 className="text-2xl font-bold mb-6 tracking-tight">{mode as string}</h3>
                 <button className={`${activeMode === mode ? 'bg-[#1a7042]' : 'bg-[#218c53] group-hover:bg-[#1a7042]'} text-white w-full py-3.5 font-bold text-sm transition-colors shadow-lg`}>
                    {activeMode === mode ? 'WYBRANO' : 'WYBIERAM'}
                 </button>
              </div>
            ))}

            {availableModes.length === 0 && (
                <div className="col-span-4 text-center py-20 text-gray-600 font-bold uppercase tracking-widest">
                    Brak skonfigurowanych trybów w panelu admina.
                </div>
            )}
         </div>
      </div>

      {/* OFERTA DLA WYBRANEGO TRYBU (Pokazuje się po kliknięciu) */}
      {activeMode && (
        <div id="oferta" className="max-w-[1400px] mx-auto px-6 pb-20 animate-in fade-in duration-500 scroll-mt-10">
            
            {/* Formularz wpisywania nicku */}
            <div className="bg-[#1c1c1c] p-8 mb-10 flex flex-col md:flex-row justify-between items-center gap-6 border-l-4 border-[#218c53]">
               <div>
                  <h2 className="text-2xl font-bold mb-1">Oferta dla: <span className="text-[#218c53]">{activeMode}</span></h2>
                  <p className="text-gray-400 text-sm">Podaj swój nick z gry, aby móc dodawać przedmioty do koszyka.</p>
               </div>
               <div className="w-full md:w-auto flex flex-col items-end">
                  <input 
                     id="nickInput"
                     type="text" 
                     value={playerNick}
                     onChange={(e) => setPlayerNick(e.target.value)}
                     placeholder="Twój nick w grze..." 
                     className="w-full md:w-72 bg-[#141414] border border-white/5 focus:border-[#218c53] outline-none text-white px-5 py-3 text-center font-bold transition-colors"
                  />
                  {status && (
                     <p className={`mt-2 text-xs font-bold text-center w-full md:w-72 ${status.type === 'success' ? 'text-green-500' : status.type === 'error' ? 'text-red-500' : 'text-yellow-500'}`}>
                        {status.text}
                     </p>
                  )}
               </div>
            </div>

            {/* Siatka produktów */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               {displayedProducts.map((p) => (
                 <div key={p.id} className="bg-[#1c1c1c] p-8 flex flex-col items-center justify-between text-center group border border-transparent hover:border-white/5 transition-colors">
                    <div className="w-24 h-24 mb-6 relative">
                       {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                       ) : (
                          <span className="text-6xl">{p.iconEmoji}</span>
                       )}
                    </div>
                    <h4 className="text-xl font-bold mb-2">{p.name}</h4>
                    <p className="text-gray-500 text-sm mb-6 line-clamp-3">{p.description}</p>
                    
                    <div className="w-full mt-auto">
                       <p className="text-lg font-bold text-[#218c53] mb-4">{p.price.toFixed(2)} PLN</p>
                       <button 
                          onClick={() => handleBuy(p.id)}
                          className="bg-[#218c53] hover:bg-[#1a7042] text-white w-full py-3 font-bold text-sm transition-colors shadow-lg shadow-[#218c53]/20"
                       >
                          KUP TERAZ
                       </button>
                    </div>
                 </div>
               ))}
            </div>
        </div>
      )}
      
      {/* FOOTER */}
      <footer className="mt-10 border-t border-white/5 bg-[#111111]">
          <div className="max-w-[1400px] mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                  <p className="text-sm font-bold text-gray-300 mb-1">COPYRIGHT 2024-2026 - {serverName}.pl</p>
                  <p className="text-xs text-gray-600">Serwer {serverName}.pl nie jest w żaden sposób powiązany z Mojang AB.</p>
              </div>
              <div className="flex items-center gap-4 text-gray-500 text-sm font-bold">
                  Sklep zasila <span className="text-white border border-white/10 px-3 py-1 rounded bg-white/5">CubeStore</span>
              </div>
          </div>
      </footer>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}