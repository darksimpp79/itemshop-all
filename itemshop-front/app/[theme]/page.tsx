"use client";

import { useState, useEffect, use } from "react";
import { getServerNameFromLocation } from "@/lib/domain";

// 1. IMPORTUJEMY CUSTOMOWE MOTYWY Z OSOBNYCH PLIKÓW
import RpgTheme from "@/components/themes/RpgThemes";
import RetroTheme from "@/components/themes/RetroThemes";
import DefaultTheme from "@/components/themes/DefaultTheme"; // Upewnij się, że masz ten plik!

// =====================================================================
// GŁÓWNY SWITCHER - Rozdziela ruch na podstawie parametru z proxy
// =====================================================================
interface ThemeParams {
  theme: string;
}

export default function ThemeSwitcherPage({ params }: { params: Promise<ThemeParams> }) {
  // 1. ODPARKOWUJEMY PARAMS
  const resolvedParams = use(params); 
  const theme = resolvedParams.theme;

  const [serverName, setServerName] = useState<string | "">("");

  useEffect(() => {
    const detected = getServerNameFromLocation();
    if (detected) setServerName(detected);
  }, []);

  if (!serverName) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        <span className="animate-spin text-4xl mr-4">⏳</span>
        <span className="font-black uppercase tracking-widest text-blue-500">Wczytywanie Twierdzy...</span>
      </div>
    );
  }

  // 🚀 Zwraca odpowiedni komponent z zaimportowanych plików
  switch (theme) {
    case 'rpg':
        return <RpgTheme serverName={serverName} />;
    case 'retro':
        return <RetroTheme serverName={serverName} />;
    case 'cyber':
        return <div className="min-h-screen flex items-center justify-center text-white bg-purple-900">Motyw Cyber...</div>;
    default:
        // Ładuje Twój nowy, dopracowany DefaultTheme z folderu components!
        return <DefaultTheme serverName={serverName} />;
    }
}