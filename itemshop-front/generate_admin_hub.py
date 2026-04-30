import os

new_page_content = """
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_51QejBIRJXI1w7MPPq1zD2q2P2S2m05u4v4Vn1F6iYJ3L0gW6bN5xJ3tYh6X1zI1tT2T9W9C5M9B8zD5J9K6C9D1T00aXQ12rZ9'); // Placeholder, will be replaced if needed

export default function AdminAccountHub() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  
  // States
  const [shops, setShops] = useState<any[]>([]);
  const [userPlan, setUserPlan] = useState<string>("FREE");
  const [emailVerified, setEmailVerified] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [newShopName, setNewShopName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/admin/login"); return; }
    setToken(t);
    fetchData(t);
  }, [router]);

  const fetchData = async (t: string) => {
    try {
      const [shopsRes, authRes] = await Promise.all([
        fetch("/api/admin/sklep", { headers: { Authorization: `Bearer ${t}` } }),
        fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
      ]);

      if (shopsRes.ok) {
        const data = await shopsRes.json();
        setShops(data);
        if (data.length > 0) {
           setUserPlan(data[0].owner?.subscriptionPlan || "FREE");
        }
      }

      if (authRes.ok) {
        const authData = await authRes.json();
        setEmailVerified(authData.emailVerified);
        setTwoFactorEnabled(authData.twoFactorEnabled);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateShop = async () => {
    if (!newShopName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch(`/api/admin/sklep?serverName=${encodeURIComponent(newShopName)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNewShopName("");
        fetchData(token!);
      } else {
        alert("Błąd tworzenia sklepu!");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const startProCheckout = async () => {
    if(!token) return;
    try {
      const res = await fetch("/api/payment/checkout/pro", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[#03040B] text-white flex items-center justify-center font-bold">Ładowanie...</div>;

  return (
    <main className="min-h-screen bg-[#03040B] text-white p-8 font-sans selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
              <span>ItemShop</span>
              <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs tracking-widest uppercase border border-blue-500/20">
                Wersja 2.0
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-2 font-medium">Zarządzaj swoim kontem i serwerami</p>
          </div>
          <button onClick={() => { localStorage.removeItem("token"); router.push("/admin/login"); }} className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold transition-all text-xs uppercase tracking-widest">
            Wyloguj się
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COL: SERVERS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-widest text-white">🎮 Twoje Serwery</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {shops.map(shop => (
                <div key={shop.id} onClick={() => router.push(`/admin/shop/${shop.id}`)} className="bg-[#0C0E16] border border-white/5 hover:border-blue-500/50 p-6 rounded-3xl cursor-pointer transition-all group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <h3 className="text-lg font-black text-white">{shop.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">ID: {shop.id}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-1 bg-white/5 rounded-md text-gray-400 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                      Zarządzaj →
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="bg-[#0C0E16] border border-dashed border-white/10 hover:border-white/30 p-6 rounded-3xl transition-all flex flex-col justify-center items-center text-center space-y-4">
                <input 
                  type="text" 
                  placeholder="Nazwa nowego serwera..." 
                  value={newShopName}
                  onChange={e => setNewShopName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#08090D] border border-white/5 rounded-xl text-sm font-bold text-center outline-none focus:border-blue-500"
                />
                <button 
                  onClick={handleCreateShop}
                  disabled={isCreating || !newShopName.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  {isCreating ? "Tworzenie..." : "➕ Utwórz Serwer"}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COL: ACCOUNT & BILLING */}
          <div className="space-y-6">
            
            <div className="bg-[#0C0E16] p-8 rounded-[32px] border border-white/[0.06] space-y-5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">🔐 Bezpieczeństwo Konta</h3>
              <div className="flex items-center justify-between bg-[#08090D] border border-white/5 rounded-xl px-5 py-4">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Email</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${emailVerified ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {emailVerified ? "Potwierdzony" : "Brak weryfikacji"}
                </span>
              </div>
              <div className="flex items-center justify-between bg-[#08090D] border border-white/5 rounded-xl px-5 py-4">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">2FA OTP</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${twoFactorEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-700/30 text-gray-400"}`}>
                  {twoFactorEnabled ? "Włączone" : "Wyłączone"}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#0C0E16] to-[#08090D] p-8 rounded-[32px] border border-white/[0.06] relative overflow-hidden">
              {userPlan !== "PRO" && <div className="absolute top-0 right-0 bg-blue-600 text-[8px] font-black px-4 py-1.5 rounded-bl-2xl uppercase">Rekomendowany 🔥</div>}
              <h4 className="font-black uppercase italic text-xl mb-6 text-blue-400">Twój Plan: {userPlan}</h4>
              <ul className="space-y-3 text-[11px] font-bold text-blue-200/70 mb-8">
                {["Nielimitowane instancje", "Własna domena .pl", "Brak prowizji"].map(f => <li key={f} className="flex items-center gap-2"><span className="text-blue-500">✨</span>{f}</li>)}
              </ul>
              <button onClick={startProCheckout} className={`w-full py-5 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${userPlan === "PRO" ? "bg-blue-600/20 text-blue-400 cursor-default" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"}`}>
                {userPlan === "PRO" ? "💎 Posiadasz PRO" : "Aktywuj PRO →"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
"""

with open("app/admin/page.tsx", "w") as f:
    f.write(new_page_content.strip() + "\\n")
