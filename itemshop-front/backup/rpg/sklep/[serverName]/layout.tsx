"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function RPGLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const serverName = params.serverName as string;
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);

  useEffect(() => {
    fetch(`http://localhost:8080/api/storefront/${serverName}/info`)
      .then(res => res.json())
      .then(info => {
        fetch(`https://api.mcsrvstat.us/2/${info.serverIp}`)
          .then(res => res.json())
          .then(mcData => setOnlinePlayers(mcData.players?.online ?? 0));
      }).catch(() => {});
  }, [serverName]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans selection:bg-blue-600">
      {/* NAVBAR STYLE SPACEIS */}
      <nav className="border-b border-white/5 bg-[#141414]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold tracking-tight lowercase">{serverName}.pl</h1>
            <div className="hidden md:flex gap-6 text-sm font-medium text-gray-400">
              <a href={`/sklep/${serverName}`} className="text-white">Sklep</a>
              <a href={`/sklep/${serverName}/regulamin`} className="hover:text-white transition-colors">Regulamin</a>
              <a href="#" className="hover:text-white transition-colors">Discord</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2.5 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20">
                <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-green-500">
                  Online: {onlinePlayers ?? 0}
                </span>
             </div>
          </div>
        </div>
      </nav>

      {children}

      <footer className="border-t border-white/5 py-12 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-gray-600 text-xs font-bold uppercase tracking-[0.3em]">
          <p>&copy; 2026 {serverName}.pl - Wszelkie prawa zastrzeżone</p>
          <div className="flex gap-4 items-center">
            <span className="opacity-50">Powered by</span>
            <span className="bg-white/5 px-4 py-2 rounded-lg text-white border border-white/10 tracking-tighter">CubeStore</span>
          </div>
        </div>
      </footer>
    </div>
  );
}