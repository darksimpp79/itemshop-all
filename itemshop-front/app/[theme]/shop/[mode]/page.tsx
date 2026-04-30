"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { shopApi } from "@/lib/api/client";
import { useShop } from "@/hooks/useShop";
import { useRewardCooldown } from "@/hooks/useRewardCooldown";
import {
  getModeStyle,
  detectServerName,
  getPaymentStatusFromUrl,
} from "@/lib/utils";
import { validatePlayerNick } from "@/lib/validation";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Product, ShopPageProps } from "@/types/shop";

interface ModeParams {
  theme: string;
  mode: string;
}

export default function ShopModeSwitcher({
  params,
}: {
  params: Promise<ModeParams>;
}) {
  const resolvedParams = use(params);
  const theme = resolvedParams.theme;
  const currentMode = resolvedParams.mode.toLowerCase();

  const [serverName, setServerName] = useState<string>("");
  const [paymentToast, setPaymentToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detected = detectServerName();
    if (detected) setServerName(detected);
  }, []);

  useEffect(() => {
    const status = getPaymentStatusFromUrl();
    if (status) {
      setPaymentToast(status);
      if (status.ok) {
        const pts = sessionStorage.getItem("pending_points");
        if (pts) {
          setPointsEarned(parseInt(pts, 10));
          sessionStorage.removeItem("pending_points");
        }
      }
    }
  }, []);

  const { products, modes, serverInfo, onlinePlayers, isLoading, error: shopError } = useShop(serverName, currentMode);

  useEffect(() => {
    if (shopError) setError(shopError);
  }, [shopError]);

  const executeBuy = async (productId: number, nick: string, promoCode?: string) => {
    const res = await shopApi.checkout(serverName, productId, nick, currentMode, promoCode);
    if (res.ok && res.data) return new Response(JSON.stringify(res.data), { status: 200 });
    return new Response(JSON.stringify({ error: res.error }), { status: res.status || 500 });
  };

  const executeReward = async (nick: string) => {
    const res = await shopApi.claimReward(serverName, nick, currentMode);
    return new Response(JSON.stringify(res), { status: res.status || 500 });
  };

  if (!serverName) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center text-white">
        <LoadingSpinner message="Wczytywanie twierdzy..." />
      </div>
    );
  }

  const sharedProps = {
    serverName: serverInfo?.serverName || serverName,
    currentMode,
    products,
    availableModes: modes,
    onlinePlayers,
    isLoading,
    executeBuy: executeBuy as any,
    executeReward,
    paymentToast,
    clearPaymentToast: () => setPaymentToast(null),
  };

  return (
    <>
      {pointsEarned !== null && (
        <PointsCelebration points={pointsEarned} onClose={() => setPointsEarned(null)} />
      )}
      {theme === "rpg" ? (
        <RpgShopMode {...sharedProps} />
      ) : theme === "retro" ? (
        <RetroShopMode {...sharedProps} />
      ) : (
        <DefaultShopMode {...sharedProps} error={error} setError={setError} />
      )}
    </>
  );
}

// ─── Points Celebration Popup ────────────────────────────────────────────────

function PointsCelebration({ points, onClose }: { points: number; onClose: () => void }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    const interval = setInterval(() => setProgress((p) => Math.max(0, p - 2)), 100);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-4 sm:p-8 pointer-events-none">
      <div
        className="pointer-events-auto relative w-full max-w-sm bg-[#111111] border border-[#bbf028]/40 rounded-[32px] overflow-hidden shadow-2xl"
        style={{ boxShadow: "0 0 80px rgba(187,240,40,0.12), 0 20px 60px rgba(0,0,0,0.8)" }}
      >
        <div className="absolute top-0 left-0 h-[2px] bg-[#bbf028]/30 w-full">
          <div
            className="h-full bg-[#bbf028] transition-all"
            style={{ width: `${progress}%`, transitionDuration: "100ms" }}
          />
        </div>

        <div className="p-8 pt-10 text-center">
          <div className="text-6xl mb-4 animate-bounce inline-block">🎉</div>
          <div
            className="font-black tracking-tighter mb-1"
            style={{ fontSize: "3.5rem", lineHeight: 1, color: "#bbf028", textShadow: "0 0 40px rgba(187,240,40,0.4)" }}
          >
            +{points} PKT
          </div>
          <p className="text-gray-400 text-sm font-medium mt-3 mb-2">
            Twoje konto zostało zasilone punktami!
          </p>
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-6">
            Sprawdź stan w grze: /punkty
          </p>
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-[#bbf028] text-black font-black rounded-2xl uppercase text-xs tracking-widest hover:brightness-110 active:scale-95 transition-all"
          >
            Super!
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Default Shop Mode ────────────────────────────────────────────────────────

interface DefaultShopModeProps extends ShopPageProps {
  error?: string | null;
  setError?: (error: string | null) => void;
  executeReward?: (nick: string) => Promise<Response>;
}

function DefaultShopMode({
  serverName, currentMode, products, availableModes, onlinePlayers,
  isLoading, executeBuy, executeReward, paymentToast, clearPaymentToast, error, setError,
}: DefaultShopModeProps) {
  const [playerNick, setPlayerNick] = useState("");
  const [nickError, setNickError] = useState<string | null>(null);
  
  // Reward state
  const [status, setStatus] = useState<{ success: boolean; text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { cooldown, setCooldown } = useRewardCooldown();

  // Promo Code state
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const style = getModeStyle(currentMode);

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await shopApi.validatePromo(serverName, code);
      if (res.ok && res.data) {
        setPromoApplied({ code: res.data.code, discountPercent: res.data.discountPercent });
        setPromoError(null);
      } else {
        setPromoApplied(null);
        setPromoError((res.status ?? 0) >= 500 ? "Błąd serwera. Spróbuj ponownie." : "Nieprawidłowy kod.");
      }
    } catch {
      setPromoError("Błąd połączenia.");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleClaimReward = async () => {
    const nick = playerNick.trim();
    const validationError = validatePlayerNick(nick);
    if (validationError) {
      setNickError(validationError.message);
      return;
    }

    setNickError(null);
    setIsProcessing(true);

    try {
      if (!executeReward) throw new Error("executeReward is not defined");
      const res = await executeReward(nick);

      if (res.ok) {
        setStatus({ success: true, text: "NAGRODA WYSŁANA!" });
        setCooldown(null);
      } else if (res.status === 429) {
        const text = await res.text();
        const timeOnly = text.split(": ").pop();
        if (timeOnly) setCooldown(timeOnly);
        setStatus({ success: false, text: "JUŻ ODEBRANO!" });
      } else {
        setStatus({ success: false, text: "BŁĄD SERWERA" });
      }
    } catch (error) {
      console.error("Reward claim error:", error);
      setStatus({ success: false, text: "BŁĄD POŁĄCZENIA" });
    } finally {
      setIsProcessing(false);
      setShowModal(true);
    }
  };

  const handleBuy = async (product: Product) => {
    const nick = playerNick.trim();
    const validationError = validatePlayerNick(nick);
    if (validationError) { setNickError(validationError.message); return; }
    setNickError(null);
    setIsProcessing(true);
    
    try {
      const res = await executeBuy(product.id, nick, promoApplied?.code);
      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          const finalPrice = promoApplied
            ? (product.price ?? 0) * (1 - promoApplied.discountPercent / 100)
            : (product.price ?? 0);
          sessionStorage.setItem("pending_points", String(Math.round(finalPrice * 10)));
          window.location.href = data.url;
        } else {
          setError?.("Błąd płatności: brak URL.");
        }
      } else {
        setError?.("Błąd zakupu");
      }
    } catch {
      setError?.("Błąd połączenia");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main
      className="min-h-screen bg-[#111111] text-white font-sans pb-24 relative"
      style={{ backgroundImage: `url('/bgMain.png')`, backgroundRepeat: "repeat" }}
    >
      <div className="absolute inset-0 bg-[#111111]/85 z-0 pointer-events-none" />
      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6">
        {error && <ErrorAlert error={error} onDismiss={() => setError?.(null)} />}

        {paymentToast && (
          <div className={`mt-8 mb-4 border rounded-2xl px-6 py-4 flex items-center justify-between gap-4 ${
            paymentToast.ok ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}>
            <div className="font-black uppercase text-[10px] tracking-widest">
              {paymentToast.ok ? "✓ PŁATNOŚĆ" : "✕ PŁATNOŚĆ"}
            </div>
            <div className="text-sm font-bold text-right flex-1">{paymentToast.text}</div>
            <button onClick={clearPaymentToast} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-black uppercase text-[10px] tracking-widest">OK</button>
          </div>
        )}

        <nav className="flex items-center justify-between py-8 mb-10 border-b border-white/5">
          <div className="flex items-center gap-6">
            <span className="text-xl font-black text-[#bbf028] italic uppercase">{serverName}</span>
            <Link href="/" className="text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all">
              ◀ Hub Serwerowy
            </Link>
          </div>
          <div className="text-xs font-bold bg-[#1c1c1c] px-5 py-2.5 rounded-full border border-white/5 flex items-center gap-3">
            <div className="w-2 h-2 bg-[#bbf028] rounded-full animate-pulse shadow-[0_0_8px_#bbf028]" />
            ONLINE: {onlinePlayers !== null ? onlinePlayers : 0}
          </div>
        </nav>

        <h1 className="text-3xl sm:text-5xl font-black mb-10 uppercase italic tracking-tighter">
          Sklep <span className={style.color}>{currentMode}</span>
        </h1>

        <div className="flex gap-3 overflow-x-auto pb-6 mb-12 scrollbar-hide">
          {availableModes.map((m: string) => (
            <Link key={m} href={`/default/shop/${m.replace("mc.", "").toLowerCase()}`}>
              <button className={`px-4 py-2.5 sm:px-7 sm:py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border ${
                m.toLowerCase().includes(currentMode)
                  ? `bg-[#bbf028] text-black border-[#bbf028] ${style.glow}`
                  : "bg-[#1c1c1c] border-white/5 text-gray-500 hover:text-white"
              }`}>
                {m}
              </button>
            </Link>
          ))}
        </div>

        {/* GŁÓWNY BOKS (Nick + Bonus) */}
        <div className="bg-[#1c1c1c]/50 backdrop-blur-md border border-white/5 p-6 md:p-10 rounded-[32px] mb-8 flex flex-col xl:flex-row justify-between items-center gap-10">
          <div className="w-full text-center xl:text-left shrink-0 xl:max-w-md">
            <h3 className="text-2xl md:text-3xl font-black mb-2 uppercase italic">Witaj, Wojowniku!</h3>
            <p className="text-gray-400 text-sm font-medium">
              Podaj swój nick z Minecraft, aby odebrać darmowy bonus na trybie{" "}
              <span className={style.color}>{currentMode}</span>.
            </p>
          </div>
          
          <div className="flex flex-col gap-4 w-full xl:w-auto">
            {nickError && (
              <div className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
                {nickError}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 xl:justify-end">
              <input
                type="text"
                placeholder="TWÓJ NICK..."
                value={playerNick}
                onChange={(e) => { setPlayerNick(e.target.value); setNickError(null); }}
                disabled={isProcessing}
                className="bg-[#0a0a0a] border border-white/5 px-6 py-4 rounded-2xl outline-none focus:border-white/20 transition-all text-white font-black text-center sm:text-left w-full sm:w-[300px] disabled:opacity-50"
              />
              <button
                onClick={handleClaimReward}
                disabled={isProcessing}
                className="bg-[#dcdcdc] hover:bg-white text-black font-black px-8 py-4 rounded-2xl transition-all uppercase text-xs tracking-widest shadow-xl active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isProcessing ? "..." : "BONUS"}
              </button>
            </div>
          </div>
        </div>

        {/* POLE KODU PROMOCYJNEGO (Pod głównym boksem) */}
        <div className="flex flex-col gap-2 mb-12 px-2">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="KOD PROMO..."
              value={promoInput}
              onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
              onKeyDown={e => e.key === "Enter" && handleApplyPromo()}
              className="bg-[#1c1c1c]/40 border border-white/5 px-5 py-3 rounded-2xl outline-none focus:border-white/20 transition-all text-gray-300 font-mono text-xs w-full sm:w-48"
            />
            <button
              onClick={handleApplyPromo}
              disabled={promoLoading || !promoInput.trim()}
              className="bg-[#1c1c1c]/40 border border-white/5 hover:bg-white/5 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all disabled:opacity-40 text-gray-400 hover:text-white"
            >
              {promoLoading ? "..." : "ZASTOSUJ"}
            </button>
            {promoApplied && (
              <div className="flex items-center gap-2 bg-[#bbf028]/10 border border-[#bbf028]/20 px-4 py-3 rounded-2xl text-xs font-black text-[#bbf028]">
                ✓ -{promoApplied.discountPercent}%
                <button
                  onClick={() => { setPromoApplied(null); setPromoInput(""); }}
                  className="text-[#bbf028]/40 hover:text-[#bbf028] transition-colors ml-2"
                >✕</button>
              </div>
            )}
          </div>
          {promoError && <p className="text-xs text-red-400 font-bold ml-2">{promoError}</p>}
        </div>

        {/* LISTA PRODUKTÓW */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner message="Wczytywanie produktów..." />
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <span className="font-black uppercase tracking-widest text-gray-400">Brak produktów na tym trybie</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {products.map((p: Product) => (
              <div key={p.id} className="bg-[#1c1c1c] border border-white/5 p-4 sm:p-8 rounded-[24px] sm:rounded-[40px] flex flex-col hover:border-[#bbf028]/20 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#bbf028]/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="bg-[#0a0a0a] w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-8 shadow-inner group-hover:scale-110 transition-transform">
                  {p.imageUrl ? <img src={p.imageUrl} className="w-12 h-12 object-contain" alt={p.name} /> : (p.iconEmoji || "📦")}
                </div>
                <h4 className="text-xl font-black mb-2 uppercase italic">{p.name}</h4>
                <p className="text-gray-500 text-[11px] mb-8 font-medium leading-relaxed">{p.description}</p>
                <div className="mt-auto flex items-center justify-between">
                  <div>
                    {promoApplied ? (
                      <>
                        <span className="text-xs text-gray-600 line-through mr-2">{p.price.toFixed(2)} PLN</span>
                        <span className="text-2xl font-black tracking-tighter text-[#bbf028]">
                          {(p.price * (1 - promoApplied.discountPercent / 100)).toFixed(2)} <span className="text-[10px]">PLN</span>
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-black tracking-tighter">
                        {p.price.toFixed(2)} <span className="text-[10px] text-gray-600">PLN</span>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleBuy(p)}
                    disabled={isProcessing || !playerNick}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-black font-bold transition-all shadow-lg active:scale-90 disabled:opacity-50 ${style.bg} hover:brightness-110`}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setShowModal(false)}
            ></div>
            <div
              className={`relative bg-[#1c1c1c] border border-white/10 p-6 sm:p-12 rounded-[24px] sm:rounded-[40px] max-w-sm w-full text-center shadow-2xl ${style.glow}`}
            >
              <div className="text-7xl mb-6">
                {status?.success ? "🎉" : "⏳"}
              </div>
              <h3 className="text-3xl font-black uppercase italic mb-4 tracking-tighter text-white">
                {status?.success ? "Gratulacje!" : "Cierpliwości!"}
              </h3>
              <p className="text-gray-400 text-sm font-medium mb-8 leading-relaxed">
                {status?.success
                  ? "Twoja nagroda została wysłana do magazynu. Możesz ją odebrać w grze komendą /magazyn."
                  : "Wykorzystałeś już swój darmowy bonus na tym trybie. Wróć do nas, gdy czas dobiegnie końca!"}
              </p>
              {!status?.success && cooldown && (
                <div className="bg-[#0a0a0a] rounded-2xl py-6 mb-8 border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-2">
                    Następny odbiór za:
                  </p>
                  <p className={`text-4xl font-black font-mono tracking-tighter ${style.color}`}>
                    {cooldown}
                  </p>
                </div>
              )}
              <button
                onClick={() => setShowModal(false)}
                className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${style.bg} text-black hover:brightness-110 active:scale-95`}
              >
                Zrozumiałem
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ─── RPG Shop Mode ────────────────────────────────────────────────────────────

function RpgShopMode({ serverName, currentMode, products, availableModes, onlinePlayers, isLoading, executeBuy, paymentToast, clearPaymentToast }: ShopPageProps) {
  const [playerNick, setPlayerNick] = useState("");
  const [nickError, setNickError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await shopApi.validatePromo(serverName, code);
      if (res.ok && res.data) {
        setPromoApplied({ code: res.data.code, discountPercent: res.data.discountPercent });
      } else {
        setPromoApplied(null);
        setPromoError((res.status ?? 0) >= 500 ? "Błąd serwera." : "Nieprawidłowy kod.");
      }
    } catch {
      setPromoError("Błąd połączenia.");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleBuy = async (product: Product) => {
    const nick = playerNick.trim();
    const validationError = validatePlayerNick(nick);
    if (validationError) { setNickError(validationError.message); return; }
    setNickError(null);
    setIsProcessing(true);
    try {
      const res = await executeBuy(product.id, nick, promoApplied?.code);
      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          const finalPrice = promoApplied
            ? (product.price ?? 0) * (1 - promoApplied.discountPercent / 100)
            : (product.price ?? 0);
          sessionStorage.setItem("pending_points", String(Math.round(finalPrice * 10)));
          window.location.href = data.url;
        } else {
          setError("Błąd portalu płatności.");
        }
      } else {
        setError("Zakup nie powiódł się.");
      }
    } catch {
      setError("Zerwane połączenie z tawerną.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main
      className="min-h-screen text-amber-100 pb-24 relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #130a04 0%, #0d0804 40%, #120c04 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flicker { 0%,100%{opacity:1} 92%{opacity:0.97} 94%{opacity:0.92} 96%{opacity:0.98} }
        .rpg-flicker { animation: flicker 4s infinite; }
        .rpg-border { border-image: linear-gradient(135deg, #d4a017, #92650a, #d4a017) 1; }
        @keyframes rpg-glow { 0%,100%{text-shadow:0 0 20px rgba(212,160,23,0.4)} 50%{text-shadow:0 0 35px rgba(212,160,23,0.7)} }
        .rpg-title-glow { animation: rpg-glow 3s ease-in-out infinite; }
      ` }} />

      {/* Ambient light effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,160,23,0.05) 0%, transparent 70%)" }} />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,0,0,0.08) 0%, transparent 70%)" }} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6">

        {/* Notification */}
        {paymentToast && (
          <div className={`mt-8 mb-4 rounded-xl px-6 py-4 flex items-center justify-between gap-4 border ${
            paymentToast.ok ? "border-amber-500/40 bg-amber-900/20 text-amber-200" : "border-red-800/40 bg-red-900/20 text-red-300"
          }`}>
            <span className="italic text-sm">{paymentToast.text}</span>
            <button onClick={clearPaymentToast} className="px-4 py-1.5 rounded-lg border border-amber-700/30 text-amber-600 hover:text-amber-400 text-xs uppercase tracking-widest transition-colors">OK</button>
          </div>
        )}
        {error && (
          <div className="mt-8 mb-4 rounded-xl px-6 py-4 flex items-center justify-between gap-4 border border-red-800/40 bg-red-900/20 text-red-300">
            <span className="italic text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 text-xs uppercase tracking-widest">Zamknij</button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex items-center justify-between py-8 mb-10" style={{ borderBottom: "1px solid rgba(212,160,23,0.15)" }}>
          <div className="flex items-center gap-6">
            <span className="text-xl font-bold italic rpg-title-glow" style={{ color: "#d4a017" }}>⚔ {serverName}</span>
            <Link href="/" className="text-amber-900 hover:text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors">
              ◀ Powrót do Krainy
            </Link>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold" style={{ background: "rgba(212,160,23,0.05)", border: "1px solid rgba(212,160,23,0.2)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
            <span style={{ color: "#d4a017" }}>ONLINE: {onlinePlayers !== null ? onlinePlayers : 0}</span>
          </div>
        </nav>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-bold mb-10 italic tracking-wide rpg-title-glow" style={{ color: "#d4a017" }}>
          ⚜ Zbrojownia — <span className="capitalize">{currentMode}</span>
        </h1>

        {/* Mode tabs */}
        <div className="flex gap-3 overflow-x-auto pb-6 mb-12">
          {availableModes.map((m: string) => (
            <Link key={m} href={`/rpg/shop/${m.replace("mc.", "").toLowerCase()}`}>
              <button className={`px-3 py-2 sm:px-6 sm:py-3 rounded-lg font-bold uppercase text-xs tracking-widest transition-all border ${
                m.toLowerCase().includes(currentMode)
                  ? "text-black"
                  : "text-amber-700 hover:text-amber-400"
              }`} style={m.toLowerCase().includes(currentMode) ? {
                background: "#d4a017",
                border: "1px solid #d4a017",
              } : {
                background: "rgba(212,160,23,0.05)",
                border: "1px solid rgba(212,160,23,0.2)",
              }}>
                {m}
              </button>
            </Link>
          ))}
        </div>

        {/* Nick input card */}
        <div className="rounded-2xl p-8 mb-6" style={{ background: "rgba(20,12,4,0.8)", border: "1px solid rgba(212,160,23,0.2)" }}>
          <h3 className="text-xl font-bold italic mb-2" style={{ color: "#d4a017" }}>✦ Podaj swe imię, wędrowcze</h3>
          <p className="text-amber-900 text-sm mb-6 italic">
            Nick z Minecraft wymagany do zakupu na trybie <span className="text-amber-400">{currentMode}</span>.
          </p>
          {nickError && (
            <div className="mb-4 text-xs text-red-400 italic bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-2">{nickError}</div>
          )}
          <input
            type="text"
            placeholder="Twoje imię w Minecraft..."
            value={playerNick}
            onChange={(e) => { setPlayerNick(e.target.value); setNickError(null); }}
            disabled={isProcessing}
            className="w-full px-6 py-4 rounded-xl outline-none font-bold italic disabled:opacity-50 placeholder:text-amber-900/50"
            style={{ background: "rgba(10,6,2,0.9)", border: "1px solid rgba(212,160,23,0.25)", color: "#e8d5a3" }}
          />
        </div>

        {/* Promo code */}
        <div className="rounded-2xl p-5 mb-12" style={{ background: "rgba(20,12,4,0.6)", border: "1px solid rgba(212,160,23,0.12)" }}>
          <p className="text-[10px] uppercase tracking-widest italic mb-3" style={{ color: "rgba(212,160,23,0.45)" }}>✦ Kod promocyjny (opcjonalne)</p>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="KOD..."
              value={promoInput}
              onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
              onKeyDown={e => e.key === "Enter" && handleApplyPromo()}
              className="px-4 py-2.5 rounded-xl outline-none font-mono text-sm"
              style={{ background: "rgba(10,6,2,0.9)", border: "1px solid rgba(212,160,23,0.18)", color: "#e8d5a3", width: "160px" }}
            />
            <button
              onClick={handleApplyPromo}
              disabled={promoLoading || !promoInput.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold italic tracking-widest transition-all disabled:opacity-40 hover:brightness-125"
              style={{ background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.25)", color: "#d4a017" }}
            >
              {promoLoading ? "..." : "Zastosuj →"}
            </button>
            {promoApplied && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold italic" style={{ background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.3)", color: "#d4a017" }}>
                ✦ -{promoApplied.discountPercent}%
                <button onClick={() => { setPromoApplied(null); setPromoInput(""); }} style={{ color: "rgba(212,160,23,0.4)" }} className="hover:opacity-100 transition-opacity ml-1">✕</button>
              </div>
            )}
          </div>
          {promoError && <p className="text-xs text-red-400 italic mt-2">{promoError}</p>}
        </div>

        {/* Products */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-amber-700 italic animate-pulse">Otwieranie skrzyni ze skarbami...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <span className="italic text-amber-900">Skrzynia skarbów jest pusta na tym trybie.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p: Product) => (
              <div key={p.id} className="flex flex-col rounded-2xl overflow-hidden group transition-all hover:scale-[1.02]"
                style={{ background: "rgba(20,12,4,0.9)", border: "1px solid rgba(212,160,23,0.15)" }}>
                {/* Icon area */}
                <div className="flex items-center justify-center h-32 relative" style={{ background: "rgba(10,6,2,0.8)", borderBottom: "1px solid rgba(212,160,23,0.1)" }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "radial-gradient(circle, rgba(212,160,23,0.08) 0%, transparent 70%)" }} />
                  {p.imageUrl
                    ? <img src={p.imageUrl} className="w-16 h-16 object-contain relative z-10 group-hover:scale-110 transition-transform" alt={p.name} />
                    : <span className="text-5xl relative z-10 group-hover:scale-110 transition-transform">{p.iconEmoji || "⚔"}</span>
                  }
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h4 className="font-bold italic text-lg mb-2" style={{ color: "#e8d5a3" }}>{p.name}</h4>
                  <p className="text-sm italic mb-6 flex-1" style={{ color: "rgba(180,130,60,0.7)" }}>{p.description}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div>
                      {promoApplied ? (
                        <>
                          <span className="text-xs line-through block" style={{ color: "rgba(212,160,23,0.4)" }}>{p.price.toFixed(2)} PLN</span>
                          <span className="font-bold text-xl" style={{ color: "#d4a017" }}>
                            {(p.price * (1 - promoApplied.discountPercent / 100)).toFixed(2)}
                            <span className="text-xs ml-1" style={{ color: "rgba(212,160,23,0.5)" }}>PLN</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-xl" style={{ color: "#d4a017" }}>{p.price.toFixed(2)}</span>
                          <span className="text-xs ml-1" style={{ color: "rgba(212,160,23,0.5)" }}>PLN</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => handleBuy(p)}
                      disabled={isProcessing || !playerNick}
                      className="px-5 py-2.5 rounded-xl font-bold uppercase text-xs tracking-widest transition-all hover:brightness-125 active:scale-95 disabled:opacity-40"
                      style={{ background: "rgba(212,160,23,0.2)", border: "1px solid rgba(212,160,23,0.5)", color: "#d4a017" }}
                    >
                      Kup →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}

// ─── Retro Shop Mode ──────────────────────────────────────────────────────────

function RetroShopMode({ serverName, currentMode, products, availableModes, onlinePlayers, isLoading, executeBuy, paymentToast, clearPaymentToast }: ShopPageProps) {
  const [playerNick, setPlayerNick] = useState("");
  const [nickError, setNickError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await shopApi.validatePromo(serverName, code);
      if (res.ok && res.data) {
        setPromoApplied({ code: res.data.code, discountPercent: res.data.discountPercent });
      } else {
        setPromoApplied(null);
        setPromoError((res.status ?? 0) >= 500 ? "ERR: SERVER_ERROR" : "ERR: INVALID_CODE");
      }
    } catch {
      setPromoError("ERR: CONNECTION_REFUSED");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleBuy = async (product: Product) => {
    const nick = playerNick.trim();
    const validationError = validatePlayerNick(nick);
    if (validationError) { setNickError(validationError.message); return; }
    setNickError(null);
    setIsProcessing(true);
    try {
      const res = await executeBuy(product.id, nick, promoApplied?.code);
      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          const finalPrice = promoApplied
            ? (product.price ?? 0) * (1 - promoApplied.discountPercent / 100)
            : (product.price ?? 0);
          sessionStorage.setItem("pending_points", String(Math.round(finalPrice * 10)));
          window.location.href = data.url;
        } else {
          setError("ERR: PAYMENT_URL_MISSING");
        }
      } else {
        setError("ERR: PURCHASE_FAILED");
      }
    } catch {
      setError("ERR: CONNECTION_REFUSED");
    } finally {
      setIsProcessing(false);
    }
  };

  const itemId = (idx: number) => `ITEM_${String(idx + 1).padStart(3, "0")}`;

  return (
    <main className="min-h-screen bg-[#000000] text-[#00ff41] font-mono pb-24 relative overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        .scanlines { position: relative; }
        .scanlines::before {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,255,65,0.015) 3px, rgba(0,255,65,0.015) 4px);
          pointer-events: none;
          z-index: 9999;
        }
        @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .cursor-blink { animation: cursor-blink 1s infinite; }
        @keyframes retro-scan { 0%{top:-10%} 100%{top:110%} }
        .retro-scan-line {
          position: fixed;
          left: 0; right: 0;
          height: 2px;
          background: rgba(0,255,65,0.07);
          animation: retro-scan 6s linear infinite;
          pointer-events: none;
          z-index: 9998;
        }
        .retro-glow { text-shadow: 0 0 8px rgba(0,255,65,0.6), 0 0 20px rgba(0,255,65,0.3); }
        .retro-box { border: 1px solid #00ff41; box-shadow: 0 0 8px rgba(0,255,65,0.08), inset 0 0 8px rgba(0,255,65,0.03); }
        .retro-btn:hover { background: rgba(0,255,65,0.1); box-shadow: 0 0 16px rgba(0,255,65,0.2); }
      ` }} />

      <div className="retro-scan-line" />

      <div className="scanlines relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6">

        {/* System boot header */}
        <div className="py-6 mb-2 text-[10px] uppercase tracking-widest opacity-50">
          SYSTEM::ITEMSHOP_v2.0 | KERNEL::READY | PID::1337
        </div>

        {/* Notifications */}
        {paymentToast && (
          <div className={`mb-4 retro-box px-5 py-3 flex items-center justify-between gap-4 text-xs ${paymentToast.ok ? "border-green-400 text-green-400" : "border-red-500 text-red-500"}`}>
            <span>&gt; {paymentToast.ok ? "PAYMENT_OK //" : "PAYMENT_FAIL //"} {paymentToast.text}</span>
            <button onClick={clearPaymentToast} className="retro-btn px-3 py-1 border border-current text-[10px] transition-all">[OK]</button>
          </div>
        )}
        {error && (
          <div className="mb-4 retro-box border-red-500 px-5 py-3 flex items-center justify-between gap-4 text-xs text-red-500">
            <span>&gt; {error}</span>
            <button onClick={() => setError(null)} className="retro-btn px-3 py-1 border border-red-500 text-[10px] transition-all">[X]</button>
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between py-5 mb-8 retro-box px-3 sm:px-6">
          <div className="flex items-center gap-6">
            <span className="retro-glow font-bold text-lg tracking-widest">
              {serverName.toUpperCase()}<span className="cursor-blink ml-1">█</span>
            </span>
            <Link href="/" className="text-[#00ff41]/40 hover:text-[#00ff41] text-[10px] uppercase tracking-[0.2em] transition-colors">
              [&lt;&lt;BACK]
            </Link>
          </div>
          <div className="text-[10px] uppercase tracking-widest flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[#00ff41] rounded-full inline-block animate-pulse retro-glow" />
            ONLINE:{onlinePlayers !== null ? onlinePlayers : 0}
          </div>
        </div>

        {/* Title */}
        <div className="mb-10">
          <div className="text-[10px] text-[#00ff41]/40 mb-1 uppercase tracking-widest">&gt; LOADING MODULE: SHOP_{currentMode.toUpperCase()}</div>
          <h1 className="text-2xl sm:text-4xl font-bold uppercase tracking-widest retro-glow">
            [{serverName.toUpperCase()}]::{currentMode.toUpperCase()}
          </h1>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-10">
          {availableModes.map((m: string) => (
            <Link key={m} href={`/retro/shop/${m.replace("mc.", "").toLowerCase()}`}>
              <button className={`px-3 py-2 sm:px-5 sm:py-2.5 text-[10px] uppercase tracking-widest transition-all retro-btn border ${
                m.toLowerCase().includes(currentMode) ? "border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41] retro-glow" : "border-[#00ff41]/20 text-[#00ff41]/40 hover:text-[#00ff41]"
              }`}>
                [{m.toUpperCase()}]
              </button>
            </Link>
          ))}
        </div>

        {/* Input terminal */}
        <div className="retro-box p-6 mb-4">
          <div className="text-[10px] text-[#00ff41]/40 uppercase tracking-widest mb-4">
            &gt; IDENTIFY_USER :: ENTER_MINECRAFT_NICK
          </div>
          {nickError && (
            <div className="mb-4 text-xs text-red-400 border border-red-500/30 px-4 py-2">
              ERR: {nickError.toUpperCase()}
            </div>
          )}
          <div className="flex items-center retro-box px-4 py-3 gap-2">
            <span className="text-[#00ff41]/50 text-xs">root@shop:~$</span>
            <input
              type="text"
              placeholder="nick_gracza"
              value={playerNick}
              onChange={(e) => { setPlayerNick(e.target.value); setNickError(null); }}
              disabled={isProcessing}
              className="flex-1 bg-transparent outline-none text-[#00ff41] font-mono placeholder:text-[#00ff41]/20 text-sm disabled:opacity-50"
            />
            {playerNick && <span className="cursor-blink text-[#00ff41]/60">█</span>}
          </div>
        </div>

        {/* Promo code terminal */}
        <div className="retro-box p-5 mb-10">
          <div className="text-[10px] text-[#00ff41]/40 uppercase tracking-widest mb-3">
            &gt; PROMO_CODE :: OPTIONAL
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center retro-box px-3 py-2 gap-2" style={{ minWidth: "180px" }}>
              <span className="text-[#00ff41]/50 text-[11px]">$</span>
              <input
                type="text"
                placeholder="PROMO_CODE"
                value={promoInput}
                onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                onKeyDown={e => e.key === "Enter" && handleApplyPromo()}
                className="flex-1 bg-transparent outline-none text-[#00ff41] font-mono placeholder:text-[#00ff41]/20 text-xs"
              />
            </div>
            <button
              onClick={handleApplyPromo}
              disabled={promoLoading || !promoInput.trim()}
              className="retro-btn border border-[#00ff41]/50 px-4 py-2 text-[10px] uppercase tracking-widest transition-all disabled:opacity-30 font-bold"
            >
              {promoLoading ? "[...]" : "[APPLY]"}
            </button>
            {promoApplied && (
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase retro-glow">
                OK: -{promoApplied.discountPercent}%
                <button onClick={() => { setPromoApplied(null); setPromoInput(""); }} className="text-[#00ff41]/40 hover:text-[#00ff41] transition-colors text-xs">[X]</button>
              </div>
            )}
          </div>
          {promoError && <div className="text-[10px] text-red-400 mt-2">&gt; {promoError}</div>}
        </div>

        {/* Products */}
        {isLoading ? (
          <div className="py-20 text-center text-[#00ff41]/40 text-sm animate-pulse">
            &gt; FETCHING_DATA... PLEASE_WAIT█
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center text-[#00ff41]/30 text-sm">
            &gt; NO_ITEMS_FOUND :: MODE={currentMode.toUpperCase()}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((p: Product, idx: number) => (
              <div key={p.id} className="retro-box flex flex-col group hover:bg-[#00ff41]/3 transition-all">
                {/* Header */}
                <div className="px-5 py-3 border-b border-[#00ff41]/20 flex items-center justify-between">
                  <span className="text-[10px] text-[#00ff41]/40">{itemId(idx)}</span>
                  <div className="text-right">
                    {promoApplied ? (
                      <>
                        <span className="text-[10px] line-through text-[#00ff41]/30 block">{p.price.toFixed(2)} PLN</span>
                        <span className="text-[10px] text-[#00ff41] font-bold retro-glow">{(p.price * (1 - promoApplied.discountPercent / 100)).toFixed(2)} PLN</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-[#00ff41]/60 font-bold">{p.price.toFixed(2)} PLN</span>
                    )}
                  </div>
                </div>
                {/* Icon */}
                <div className="flex items-center justify-center h-24 border-b border-[#00ff41]/10" style={{ background: "rgba(0,255,65,0.02)" }}>
                  {p.imageUrl
                    ? <img src={p.imageUrl} className="w-12 h-12 object-contain opacity-80 group-hover:opacity-100 transition-opacity" alt={p.name} style={{ filter: "sepia(100%) saturate(300%) hue-rotate(60deg)" }} />
                    : <span className="text-4xl opacity-70 group-hover:opacity-100 transition-opacity" style={{ filter: "sepia(100%) saturate(300%) hue-rotate(60deg)" }}>{p.iconEmoji || "📦"}</span>
                  }
                </div>
                {/* Info */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="text-sm font-bold uppercase tracking-widest mb-2 retro-glow">{p.name}</div>
                  <div className="text-[11px] text-[#00ff41]/50 mb-5 leading-relaxed flex-1">{p.description}</div>
                  <button
                    onClick={() => handleBuy(p)}
                    disabled={isProcessing || !playerNick}
                    className="retro-btn w-full border border-[#00ff41]/50 py-2.5 text-[10px] uppercase tracking-widest transition-all disabled:opacity-30 font-bold hover:retro-glow"
                  >
                    {isProcessing ? "[PROCESSING]" : "[EXECUTE_BUY]"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-6 text-[10px] text-[#00ff41]/20 uppercase tracking-widest flex justify-between items-center border-t border-[#00ff41]/10">
          <span>ITEMSHOP_SYSTEM :: UPTIME_OK</span>
          <Link href="/" className="hover:text-[#00ff41]/50 transition-colors">[ROOT]</Link>
        </div>
      </div>
    </main>
  );
}