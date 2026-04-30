"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function RegulationsPage() {
  // Pobieramy nazwę serwera z adresu URL (np. AlicjaCraft)
  const params = useParams();
  const serverName = params.serverName as string;

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white py-24 px-6">
      <div className="max-w-4xl mx-auto bg-[#141414] border border-white/5 rounded-[40px] p-12 shadow-2xl">
        <h1 className="text-4xl font-black mb-8 text-center uppercase tracking-tighter">Regulamin Sklepu</h1>
        
        {/* ... treść regulaminu ... */}

        <div className="mt-12 pt-8 border-t border-white/5 flex justify-center">
            {/* POPRAWIONY LINK: Teraz prowadzi do /sklep/AlicjaCraft zamiast samego /sklep/ */}
            <Link 
              href={`/sklep/${serverName}`} 
              className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-600/20"
            >
              Powrót do sklepu
            </Link>
        </div>
      </div>
    </main>
  );
}