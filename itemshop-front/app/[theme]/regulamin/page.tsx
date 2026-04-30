"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getServerNameFromLocation } from "@/lib/domain";
import { apiClient } from "@/lib/api/client";

export default function RegulaminPage() {
  const [serverName, setServerName] = useState<string | "">("");
  const [termsContent, setTermsContent] = useState<string>("Ładowanie regulaminu...");
  const [isLoading, setIsLoading] = useState(true);

  // 1. Wykrywanie nazwy sklepu (z localhost lub domeny)
  useEffect(() => {
    const detected = getServerNameFromLocation();
    if (detected) setServerName(detected);
  }, []);

  // 2. Pobieranie danych sklepu (w tym regulaminu) z backendu
  useEffect(() => {
    if (!serverName) return;

    const fetchInfo = async () => {
      try {
        const res = await apiClient.get(`/storefront/${serverName.toLowerCase()}/info`);
        if (res.ok && res.data) {
          const data = res.data as any;
          // Ustawiamy treść regulaminu z bazy (lub tekst domyślny)
          if (data.termsContent) {
            setTermsContent(data.termsContent);
          } else {
            setTermsContent("Właściciel serwera nie ustawił jeszcze regulaminu.");
          }
        } else {
          setTermsContent("Błąd pobierania regulaminu.");
        }
      } catch (e) {
        console.error(e);
        setTermsContent("Błąd połączenia z serwerem.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInfo();
  }, [serverName]);

  // Ekran ładowania zanim wykryjemy sklep
  if (!serverName) {
    return <div className="min-h-screen bg-[#111111] flex items-center justify-center text-white"><span className="animate-spin text-4xl">⏳</span></div>;
  }

  return (
    <main className="min-h-screen bg-[#111111] text-white pt-24 pb-32 relative" style={{ backgroundImage: `url('/bgMain.png')`, backgroundRepeat: 'repeat' }}>
      <div className="absolute inset-0 bg-[#111111]/90 z-0 pointer-events-none"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-6">
        {/* Nawigacja powrotna */}
        <Link href="/" className="text-[#bbf028] font-black uppercase tracking-widest text-xs hover:text-[#a6d623] transition-colors mb-12 flex items-center gap-2 w-fit">
          <span>◀</span> Powrót do sklepu
        </Link>
        
        <h1 className="text-5xl font-black uppercase italic mb-8 tracking-tighter">
          Regulamin <span className="text-[#bbf028]">{serverName}</span>
        </h1>
        
        {/* Karta z regulaminem */}
        <div className="bg-[#1c1c1c] border border-white/5 p-10 rounded-[40px] text-gray-400 space-y-6 shadow-2xl">
          {isLoading ? (
            <div className="flex justify-center py-10">
               <span className="animate-spin text-4xl">⏳</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap leading-relaxed font-medium text-sm md:text-base">
              {termsContent}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}