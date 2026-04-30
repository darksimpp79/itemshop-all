"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getServerNameFromLocation } from "@/lib/domain";
import { apiClient } from "@/lib/api/client";

const DEFAULT_TERMS = `§1. Postanowienia Ogólne
Niniejszy regulamin określa zasady korzystania z serwera Minecraft oraz wbudowanego sklepu.
Nieznajomość regulaminu nie zwalnia z jego przestrzegania.
Administracja zastrzega sobie prawo do zmiany regulaminu w dowolnym momencie.

§2. Zasady Rozgrywki
Zabrania się używania modyfikacji ułatwiających grę (cheaty, x-ray, makro, auto-clicker).
Zakazane jest wykorzystywanie błędów serwera (bugi) oraz duplikowanie przedmiotów.
Szanuj innych graczy — zakaz wyzywania, dyskryminacji i spamowania na czacie.
Reklamowanie innych serwerów skutkuje natychmiastowym banem.

§3. Sklep i Płatności
Kupując w sklepie ItemShop wspierasz rozwój serwera. Płatności są dobrowolne.
Wirtualne przedmioty są przypisane do nicku z gry. Zmiana nicku nie uprawnia do przeniesienia usług.
Próby oszustwa (chargeback) skutkują permanentną blokadą.

§4. Kary i Odwołania
Złamanie regulaminu może skutkować ostrzeżeniem, kickiem, tempbanem lub banem.
Od każdej decyzji można odwołać się na serwerze Discord w ciągu 7 dni.`;

export default function RegulaminPage() {
  const [serverName, setServerName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [termsContent, setTermsContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detected = getServerNameFromLocation();
    if (!detected) { setIsLoading(false); return; }
    setServerName(detected);

    apiClient.get(`/storefront/${detected}/info`)
      .then(res => {
        if (res.ok && res.data) {
          const d = res.data as { serverName: string; termsContent?: string };
          setDisplayName(d.serverName);
          setTermsContent(d.termsContent || null);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#bbf028] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const content = termsContent || DEFAULT_TERMS;

  return (
    <main
      className="min-h-screen bg-[#111111] text-white font-sans pb-24 relative"
      style={{ backgroundImage: `url('/bgMain.png')`, backgroundRepeat: "repeat" }}
    >
      <div className="absolute inset-0 bg-[#111111]/88 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-16">
        <nav className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
          <span className="text-xl font-black text-[#bbf028] italic uppercase">{displayName || serverName}</span>
          <Link href="/" className="text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors">
            ◀ Wróć do sklepu
          </Link>
        </nav>

        <h1 className="text-5xl font-black mb-2 uppercase italic tracking-tighter">
          Regulamin <span className="text-[#bbf028]">Serwera</span>
        </h1>
        <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-10">
          Ostatnia aktualizacja: {new Date().toLocaleDateString("pl-PL", { year: "numeric", month: "long" })}
        </p>

        <div className="bg-[#1c1c1c] border border-white/5 p-8 md:p-12 rounded-[40px] shadow-2xl">
          {!termsContent && (
            <div className="mb-6 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-xs font-bold uppercase tracking-widest">
              ⚠ Właściciel nie ustawił jeszcze treści regulaminu — wyświetlam szablon domyślny.
            </div>
          )}
          <div className="whitespace-pre-wrap leading-relaxed text-gray-400 text-sm font-medium">
            {content}
          </div>
        </div>
      </div>
    </main>
  );
}
