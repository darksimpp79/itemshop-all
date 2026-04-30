"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getServerNameFromLocation } from "@/lib/domain";
import { apiClient } from "@/lib/api/client";
import { validatePlayerNick } from "@/lib/validation";

export default function BonusPage() {
  const [serverName, setServerName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [modes, setModes] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState("");
  const [nick, setNick] = useState("");
  const [nickError, setNickError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ success: boolean; text: string; cooldown?: string } | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detected = getServerNameFromLocation();
    if (!detected) { setIsLoading(false); return; }
    setServerName(detected);

    Promise.all([
      apiClient.get(`/storefront/${detected}/info`),
      apiClient.get(`/storefront/${detected}/tryby`),
    ]).then(([infoRes, modesRes]) => {
      if (infoRes.ok && infoRes.data) {
        const d = infoRes.data as { serverName: string };
        setDisplayName(d.serverName);
      }
      if (modesRes.ok && modesRes.data) {
        const raw = modesRes.data as Array<{ name: string } | string>;
        const list = raw.map(m => typeof m === "string" ? m : m.name);
        setModes(list);
        if (list.length > 0) setSelectedMode(list[0].replace("mc.", "").toLowerCase());
      }
    }).finally(() => setIsLoading(false));
  }, []);

  const handleClaim = async () => {
    const trimmed = nick.trim();
    const err = validatePlayerNick(trimmed);
    if (err) { setNickError(err.message); return; }
    if (!selectedMode) { setStatus({ success: false, text: "Wybierz tryb gry!" }); return; }

    setNickError(null);
    setIsClaiming(true);
    setStatus(null);

    try {
      const res = await apiClient.post(
        `/storefront/${serverName}/daily/${encodeURIComponent(trimmed)}?mode=${selectedMode}`
      );

      if (res.ok) {
        setStatus({ success: true, text: "Nagroda wysłana do /magazyn!" });
        setNick("");
      } else if (res.status === 429) {
        const msg = (res.error as string) || "";
        const timeOnly = msg.includes(":") ? msg.split(": ").pop() : undefined;
        setStatus({ success: false, text: "Już odebrano! Wróć za:", cooldown: timeOnly });
      } else if (res.status === 404) {
        setStatus({ success: false, text: "Sklep nie ma skonfigurowanej darmowej nagrody." });
      } else {
        setStatus({ success: false, text: res.error || "Wystąpił błąd. Spróbuj ponownie." });
      }
    } catch {
      setStatus({ success: false, text: "Błąd połączenia z serwerem." });
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#bbf028] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <main
      className="min-h-screen bg-[#111111] text-white font-sans flex flex-col items-center justify-center p-6 relative"
      style={{ backgroundImage: `url('/bgMain.png')`, backgroundRepeat: "repeat" }}
    >
      <div className="absolute inset-0 bg-[#111111]/85 pointer-events-none" />

      {/* Back nav */}
      <div className="absolute top-8 left-0 right-0 max-w-7xl mx-auto px-6 flex justify-between items-center z-10">
        <span className="text-xl font-black text-[#bbf028] italic uppercase">{displayName || serverName}</span>
        <Link href="/" className="text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors">
          ◀ Wróć do sklepu
        </Link>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#1c1c1c]/80 backdrop-blur-xl border border-white/5 p-10 rounded-[40px] shadow-2xl text-center">
          <div className="text-7xl mb-6 animate-bounce inline-block">🎁</div>

          <h1 className="text-4xl font-black mb-2 uppercase italic tracking-tighter">
            Darmowy <span className="text-[#bbf028]">Bonus</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium mb-8 leading-relaxed">
            Odbieraj nagrodę co 24 godziny! Trafi prosto do Twojego{" "}
            <span className="text-[#bbf028]">/magazyn</span> w grze.
          </p>

          <div className="flex flex-col gap-4">
            {/* Mode selector */}
            {modes.length > 1 && (
              <div className="flex gap-2 flex-wrap justify-center">
                {modes.map(m => {
                  const clean = m.replace("mc.", "").toLowerCase();
                  return (
                    <button
                      key={m}
                      onClick={() => setSelectedMode(clean)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        selectedMode === clean
                          ? "bg-[#bbf028] text-black border-[#bbf028]"
                          : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Nick input */}
            {nickError && (
              <div className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                {nickError}
              </div>
            )}
            <input
              type="text"
              placeholder="TWÓJ NICK W MINECRAFT..."
              value={nick}
              onChange={e => { setNick(e.target.value); setNickError(null); setStatus(null); }}
              onKeyDown={e => e.key === "Enter" && handleClaim()}
              disabled={isClaiming}
              className="w-full bg-[#0a0a0a] border border-white/5 focus:border-[#bbf028] px-6 py-5 rounded-2xl outline-none transition-all text-white font-black text-center placeholder:text-gray-600 uppercase tracking-wider disabled:opacity-50"
            />

            <button
              onClick={handleClaim}
              disabled={isClaiming || !nick.trim()}
              className="w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl bg-white text-black hover:bg-[#bbf028] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isClaiming ? "Wysyłanie..." : "ODBIERZ NAGRODĘ"}
            </button>
          </div>

          {/* Status */}
          {status && (
            <div className={`mt-6 p-5 rounded-2xl border font-medium text-sm leading-relaxed ${
              status.success
                ? "bg-green-500/10 text-green-300 border-green-500/20"
                : "bg-red-500/10 text-red-300 border-red-500/20"
            }`}>
              <div className="font-black uppercase text-[10px] tracking-widest mb-1">
                {status.success ? "✓ Gotowe!" : "✕ Nie tym razem"}
              </div>
              {status.text}
              {status.cooldown && (
                <div className="mt-3 text-xl font-black font-mono text-[#bbf028]">{status.cooldown}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-center text-gray-700 text-[10px] font-bold uppercase tracking-widest mt-6">
          Bonus odebrany? Wejdź na serwer i wpisz <span className="text-gray-500">/magazyn</span>
        </p>
      </div>
    </main>
  );
}
