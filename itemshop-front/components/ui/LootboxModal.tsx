"use client";

import { useState, useEffect } from "react";

interface LootboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverName: string;
  nick: string;
  mode: string;
  onLootboxOpened: (reward: string) => void;
  onPointsDeducted: (cost: number) => void;
  shopApi: any;
}

export function LootboxModal({
  isOpen,
  onClose,
  serverName,
  nick,
  mode,
  onLootboxOpened,
  onPointsDeducted,
  shopApi,
}: LootboxModalProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [reward, setReward] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Zablokuj scrollowanie gdy modal jest otwarty
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setReward(null);
      setError(null);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpen = async () => {
    setIsOpening(true);
    setError(null);
    setReward(null);

    try {
      const res = await shopApi.openLootbox(serverName, nick, mode);
      
      if (res.ok && res.data) {
        onPointsDeducted(500); // Zakładamy 500 pkt kosztu
        
        // Dodaj małe opóźnienie dla "budowania napięcia"
        setTimeout(() => {
          setReward(res.data.reward);
          onLootboxOpened(res.data.reward);
          setIsOpening(false);
        }, 1500);
      } else {
        setError(res.error || "Wystąpił błąd podczas otwierania skrzynki.");
        setIsOpening(false);
      }
    } catch (err) {
      setError("Błąd połączenia.");
      setIsOpening(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={() => !isOpening && onClose()}
      />
      
      <div className={`relative bg-[#111] border border-white/10 rounded-[32px] p-8 w-full max-w-md shadow-2xl transition-all ${reward ? 'scale-105 border-[#bbf028]/50 shadow-[0_0_50px_rgba(187,240,40,0.2)]' : 'scale-100'}`}>
        
        {/* Zamknij przycisk */}
        {!isOpening && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}

        <div className="text-center">
          <h2 className="text-2xl font-black uppercase italic mb-2 tracking-tighter text-white">
            Magiczna Skrzynka
          </h2>
          <p className="text-gray-400 text-sm mb-8 font-medium">
            Koszt otwarcia: <span className="text-[#bbf028] font-black">500 PKT</span>
          </p>

          <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
            {/* Tło skrzynki (poświata) */}
            <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 ${isOpening ? 'bg-white animate-pulse' : reward ? 'bg-[#bbf028] opacity-50' : 'bg-purple-500'}`} />
            
            {/* Animacja skrzynki */}
            <div className={`relative z-10 text-8xl transition-all duration-500 ${isOpening ? 'animate-bounce scale-110 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]' : reward ? 'scale-125' : 'hover:scale-110 hover:-rotate-3 cursor-pointer drop-shadow-2xl'}`}
                 onClick={() => !isOpening && !reward && handleOpen()}>
              {reward ? '🎁' : '📦'}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold py-3 px-4 rounded-xl mb-6">
              {error}
            </div>
          )}

          {reward ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-gray-400 uppercase tracking-widest text-[10px] font-black mb-1">
                Wylosowałeś:
              </p>
              <h3 className="text-3xl font-black text-[#bbf028] mb-6 italic tracking-tighter drop-shadow-[0_0_15px_rgba(187,240,40,0.5)]">
                {reward}
              </h3>
              <button
                onClick={onClose}
                className="w-full bg-[#bbf028] text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:brightness-110 transition-all active:scale-95 text-xs shadow-[0_0_20px_rgba(187,240,40,0.3)]"
              >
                Odbierz w /magazyn
              </button>
            </div>
          ) : (
            <button
              onClick={handleOpen}
              disabled={isOpening}
              className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${
                isOpening 
                  ? 'bg-white/10 text-white/50 cursor-not-allowed' 
                  : 'bg-white text-black hover:bg-[#bbf028] active:scale-95 shadow-xl'
              }`}
            >
              {isOpening ? 'Otwieranie...' : 'Otwórz Skrzynkę'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
