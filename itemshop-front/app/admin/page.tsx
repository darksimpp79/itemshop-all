"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Server, UserCircle, CreditCard, LogOut, Gem, ShieldCheck, Mail, Smartphone, Menu, X } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface ToastItem { id: number; message: string; type: "success" | "error" | "info"; }
interface Shop { id: number; serverName: string; customDomain?: string; theme?: string; serverIp?: string; }
interface Profile {
  email: string;
  subscriptionPlan: string;
  subscriptionExpiresAt?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorMethod?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toast = useCallback((message: string, type: ToastItem["type"] = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, toast };
}

function Toasts({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium pointer-events-auto flex items-center gap-2.5 backdrop-blur-xl animate-in slide-in-from-right-2
          ${t.type === "success" ? "bg-emerald-950/80 border-emerald-800/60 text-emerald-300" :
            t.type === "error"   ? "bg-red-950/80 border-red-800/60 text-red-300" :
                                   "bg-blue-950/80 border-blue-800/60 text-blue-300"}`}>
          <span className="text-base">{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "i"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"creds" | "verify" | "2fa" | "reset" | "reset-verify">("creds");
  const [tempToken, setTempToken] = useState("");
  const [twoFaMethod, setTwoFaMethod] = useState<"EMAIL" | "TOTP">("EMAIL");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { toasts, toast } = useToast();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (step === "verify") {
        const r = await fetch("/api/auth/register/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
        if (r.ok) { toast("Konto potwierdzone! Zaloguj sie.", "success"); setStep("creds"); setIsLogin(true); setCode(""); }
        else toast(await r.text() || "Bledny kod.", "error");
        return;
      }
      if (step === "2fa") {
        const r = await fetch("/api/auth/login/verify-2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tempToken, code }) });
        if (r.ok) { const d = await r.json(); onLogin(d.token); }
        else toast(await r.text() || "Bledny kod 2FA.", "error");
        return;
      }
      if (step === "reset") {
        const r = await fetch("/api/auth/reset-password/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        if (r.ok) { setStep("reset-verify"); setCooldown(60); toast("Jesli konto istnieje - kod wyslany.", "info"); }
        else toast(await r.text() || "Blad.", "error");
        return;
      }
      if (step === "reset-verify") {
        if (newPassword.length < 8) { toast("Haslo musi miec co najmniej 8 znakow.", "error"); return; }
        const r = await fetch("/api/auth/reset-password/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code, newPassword }) });
        if (r.ok) { toast("Haslo zmienione. Zaloguj sie.", "success"); setStep("creds"); setIsLogin(true); setCode(""); setNewPassword(""); }
        else toast(await r.text() || "Bledny kod.", "error");
        return;
      }
      const r = await fetch(`/api/auth/${isLogin ? "login" : "register"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (r.ok) {
        if (isLogin) {
          const d = await r.json();
          if (d?.requires2fa) {
            const method: "EMAIL" | "TOTP" = d.twoFactorMethod === "TOTP" ? "TOTP" : "EMAIL";
            setStep("2fa"); setTempToken(d.tempToken || ""); setTwoFaMethod(method);
            if (method === "EMAIL") { setCooldown(60); toast("Kod 2FA wyslany na email.", "info"); }
          }
          else { onLogin(d.token); }
        } else {
          setStep("verify"); setCooldown(60); toast("Sprawdz email - kod weryfikacyjny wyslany.", "info");
        }
      } else toast(await r.text() || "Blad.", "error");
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      if (step === "verify") {
        const r = await fetch("/api/auth/register/resend-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const msg = await r.text();
        if (r.ok) { setCooldown(60); toast("Nowy kod wyslany.", "info"); }
        else { const s = msg.match(/(\d+)s/)?.[1]; if (s) setCooldown(Number(s)); toast(msg || "Blad.", "error"); }
      } else if (step === "2fa") {
        const r = await fetch("/api/auth/login/resend-2fa-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tempToken }) });
        const msg = await r.text();
        if (r.ok) { setCooldown(60); toast("Nowy kod 2FA wyslany.", "info"); }
        else { const s = msg.match(/(\d+)s/)?.[1]; if (s) setCooldown(Number(s)); toast(msg || "Blad.", "error"); }
      } else if (step === "reset-verify") {
        const r = await fetch("/api/auth/reset-password/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        if (r.ok) { setCooldown(60); toast("Nowy kod wyslany.", "info"); }
        else toast(await r.text() || "Blad.", "error");
      }
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setLoading(false); }
  };

  const goBack = () => { setStep("creds"); setCode(""); setTempToken(""); setCooldown(0); setNewPassword(""); };

  const titles: Record<typeof step, { title: string; sub: string }> = {
    "creds":        { title: isLogin ? "Zaloguj sie" : "Zaloz konto", sub: isLogin ? "Panel zarzadzania sklepem" : "Zacznij sprzedawac juz dzis" },
    "verify":       { title: "Potwierdz email", sub: `Kod wyslany na ${email}` },
    "2fa":          { title: "Weryfikacja 2FA", sub: twoFaMethod === "TOTP" ? "Podaj kod z aplikacji uwierzytelniajace" : "Kod wyslany na Twoj adres email" },
    "reset":        { title: "Reset hasla", sub: "Podaj email powiazany z kontem" },
    "reset-verify": { title: "Nowe haslo", sub: `Kod wyslany na ${email}` },
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex font-sans">
      <Toasts toasts={toasts} />

      {/* Left decorative panel */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 bg-[#0C0C10] border-r border-white/[0.05] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="relative z-10 text-center">
          <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-700/40">
            <span className="text-2xl font-black italic text-white">Z</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-2">ItemShop</h1>
          <p className="text-sm text-slate-500 font-medium mb-10">Panel sprzedazy dla serwerow Minecraft</p>
          <div className="space-y-3 text-left">
            {["Nielimitowane sklepy i produkty", "Platnosci Stripe bez prowizji", "Plugin Minecraft gotowy do uzycia", "Analityka i historia zamowien"].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] text-blue-400 font-bold">✓</span>
                </div>
                <span className="text-sm text-slate-400 font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[360px]">
          <div className="mb-8">
            <div className="lg:hidden w-10 h-10 mb-5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-base font-black italic text-white">Z</span>
            </div>
            <h2 className="text-xl font-black tracking-tight">{titles[step].title}</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">{titles[step].sub}</p>
          </div>

          <div className="space-y-3">
            {step === "creds" && <>
              <input type="email" placeholder="Adres email" value={email}
                onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-medium outline-none focus:border-blue-500/60 focus:bg-white/[0.06] transition-all placeholder:text-slate-600"
              />
              <input type="password" placeholder="Haslo" value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()}
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-medium outline-none focus:border-blue-500/60 focus:bg-white/[0.06] transition-all placeholder:text-slate-600"
              />
            </>}

            {step === "reset" && (
              <input type="email" placeholder="Adres email" value={email}
                onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-medium outline-none focus:border-blue-500/60 focus:bg-white/[0.06] transition-all placeholder:text-slate-600"
              />
            )}

            {step === "reset-verify" && <>
              <input type="text" placeholder="Kod 6-cyfrowy" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-mono font-bold tracking-[0.4em] text-center outline-none focus:border-blue-500/60 transition-all placeholder:text-slate-600 placeholder:tracking-normal"
              />
              <input type="password" placeholder="Nowe haslo (min. 8 znakow)" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()}
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-medium outline-none focus:border-blue-500/60 focus:bg-white/[0.06] transition-all placeholder:text-slate-600"
              />
            </>}

            {(step === "verify" || step === "2fa") && (
              <input type="text" placeholder="000000" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={e => e.key === "Enter" && handleSubmit()} autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xl font-mono font-bold tracking-[0.5em] text-center outline-none focus:border-blue-500/60 transition-all placeholder:text-slate-700 placeholder:tracking-normal"
              />
            )}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 rounded-xl text-sm font-bold tracking-wide transition-all shadow-lg shadow-blue-700/20">
              {loading ? "Ladowanie..." : step === "creds" ? (isLogin ? "Zaloguj sie" : "Zaloz konto") :
               step === "verify" ? "Potwierdz konto" : step === "2fa" ? "Potwierdz 2FA" :
               step === "reset" ? "Wyslij kod" : "Zmien haslo"}
            </button>

            {step !== "creds" && (
              <div className="flex gap-2">
                {(step === "verify" || step === "reset-verify" || (step === "2fa" && twoFaMethod === "EMAIL")) && (
                  <button onClick={handleResend} disabled={loading || cooldown > 0}
                    className="flex-1 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-40 text-xs font-semibold text-slate-500 transition-all border border-white/[0.05]">
                    {cooldown > 0 ? `Wyslij ponownie (${cooldown}s)` : "Wyslij ponownie"}
                  </button>
                )}
                <button onClick={goBack}
                  className="px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-xs font-semibold text-slate-600 transition-all border border-white/[0.05]">
                  Wstecz
                </button>
              </div>
            )}

            {step === "creds" && (
              <div className="flex flex-col gap-1 pt-1">
                <button onClick={() => { setIsLogin(!isLogin); setCode(""); }}
                  className="w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors py-1 font-medium">
                  {isLogin ? "Nie masz konta? Zarejestruj sie" : "Masz konto? Zaloguj sie"}
                </button>
                {isLogin && (
                  <button onClick={() => { setStep("reset"); setCode(""); }}
                    className="w-full text-center text-xs text-slate-700 hover:text-slate-500 transition-colors py-0.5 font-medium">
                    Zapomnialem hasla
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ITEM ─────────────────────────────────────────────────────────────
function SidebarItem({ icon: Icon, label, active, onClick, badge }: {
  icon: React.ElementType; label: string; active: boolean; onClick: () => void; badge?: string;
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active ? "bg-blue-600 text-white shadow-lg shadow-blue-700/25"
               : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]"
      }`}>
      <Icon size={16} className="flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${active ? "bg-white/20 text-white" : "bg-blue-600/15 text-blue-400"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AdminHub() {
  const router = useRouter();
  const { toasts, toast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"shops" | "profile" | "billing">("shops");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Profile edit
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete account
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Subscription cancel
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // 2FA management
  type TwoFaSetupStep = "idle" | "totp-setup" | "email-pending";
  const [twoFaSetup, setTwoFaSetup] = useState<TwoFaSetupStep>("idle");
  const [totpQrUrl, setTotpQrUrl] = useState("");
  const [totpManualCode, setTotpManualCode] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  // New shop
  const [newShopName, setNewShopName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("auth_token");
    if (t) { loadData(t); setToken(t); }
    else { setLoading(false); }

    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") { toast("Platnosc zakonczona! Odswiezam plan...", "info"); params.delete("payment"); window.history.replaceState({}, "", window.location.pathname); }
    if (payment === "cancel")  { toast("Platnosc anulowana.", "info"); params.delete("payment"); window.history.replaceState({}, "", window.location.pathname); }
  }, []);

  const handleLogin = (t: string) => {
    localStorage.setItem("auth_token", t);
    setToken(t);
    loadData(t);
  };

  const loadData = async (t: string) => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch("/api/admin/user/profile", { headers: { Authorization: `Bearer ${t}` } }),
        fetch("/api/admin/moje-sklepy",  { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      if (pRes.status === 401) { doLogout(); return; }
      if (pRes.ok) {
        const p: Profile = await pRes.json();
        setProfile(p);
        setFirstName(p.firstName || "");
        setLastName(p.lastName || "");
        setPhone(p.phoneNumber || "");
      }
      if (sRes.ok) setShops(await sRes.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const doLogout = async () => {
    const t = localStorage.getItem("auth_token");
    if (t) fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
    localStorage.removeItem("auth_token");
    setToken(null); setProfile(null); setShops([]);
  };

  const handleCreateShop = async () => {
    if (!newShopName.trim() || !token) return;
    setCreating(true);
    try {
      const r = await fetch(`/api/admin/sklep?serverName=${encodeURIComponent(newShopName.trim())}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) { toast("Sklep stworzony!"); setNewShopName(""); loadData(token); }
      else toast(await r.text() || "Blad.", "error");
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setCreating(false); }
  };

  const startProCheckout = async () => {
    if (!token) return;
    try {
      const r = await fetch("/api/payment/create-checkout-session", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); if (d.url) window.location.href = d.url; }
      else toast("Błąd płatności.", "error");
    } catch { toast("Błąd połączenia.", "error"); }
  };

  const startStarterCheckout = async () => {
    if (!token) return;
    try {
      const r = await fetch("/api/payment/create-checkout-session-starter", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); if (d.url) window.location.href = d.url; }
      else toast("Błąd płatności.", "error");
    } catch { toast("Błąd połączenia.", "error"); }
  };

  const handleSaveProfile = async () => {
    if (!token) return;
    setSavingProfile(true);
    try {
      const r = await fetch("/api/admin/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName, lastName, phoneNumber: phone }),
      });
      if (r.ok) { toast("Profil zapisany."); loadData(token); }
      else toast("Blad zapisu.", "error");
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setSavingProfile(false); }
  };

  const handleChangePassword = async () => {
    if (!token) return;
    if (cpNew.length < 8) { toast("Nowe haslo musi miec co najmniej 8 znakow.", "error"); return; }
    if (cpNew !== cpConfirm) { toast("Nowe hasla nie sa zgodne.", "error"); return; }
    setSavingPassword(true);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: cpCurrent, newPassword: cpNew }),
      });
      if (r.ok) { toast("Haslo zmienione."); setCpCurrent(""); setCpNew(""); setCpConfirm(""); }
      else toast(await r.text() || "Blad zmiany hasla.", "error");
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setSavingPassword(false); }
  };

  const handleDeleteAccount = async () => {
    if (!token || !deletePassword) return;
    setDeleting(true);
    try {
      const r = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (r.ok) {
        localStorage.removeItem("auth_token");
        setToken(null); setProfile(null); setShops([]);
      } else toast(await r.text() || "Blad usuwania konta.", "error");
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setDeleting(false); setDeleteConfirm(false); setDeletePassword(""); }
  };

  const startTotpSetup = async () => {
    if (!token) return;
    setTwoFaLoading(true);
    try {
      const r = await fetch("/api/auth/2fa/totp/setup", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { toast(await r.text() || "Blad.", "error"); return; }
      const d = await r.json();
      const qr = await QRCode.toDataURL(d.otpauthUri, { width: 200, margin: 2 });
      setTotpQrUrl(qr);
      setTotpManualCode(d.manualCode);
      setTwoFaCode("");
      setTwoFaSetup("totp-setup");
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setTwoFaLoading(false); }
  };

  const confirmTotpSetup = async () => {
    if (!token || !twoFaCode) return;
    setTwoFaLoading(true);
    try {
      const r = await fetch("/api/auth/2fa/totp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: twoFaCode }),
      });
      if (r.ok) { toast("TOTP aktywowane! Google Authenticator jest teraz wymagany."); setTwoFaSetup("idle"); setTwoFaCode(""); loadData(token); }
      else toast(await r.text() || "Bledny kod.", "error");
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setTwoFaLoading(false); }
  };

  const startEmailTwoFa = async () => {
    if (!token) return;
    setTwoFaLoading(true);
    try {
      const r = await fetch("/api/auth/2fa/enable/request", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { toast(await r.text() || "Blad.", "error"); return; }
      setTwoFaCode("");
      setTwoFaSetup("email-pending");
      toast("Kod 2FA wyslany na email.", "info");
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setTwoFaLoading(false); }
  };

  const confirmEmailTwoFa = async () => {
    if (!token || !twoFaCode) return;
    setTwoFaLoading(true);
    try {
      const r = await fetch("/api/auth/2fa/enable/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: twoFaCode }),
      });
      if (r.ok) { toast("Email 2FA wlaczone."); setTwoFaSetup("idle"); setTwoFaCode(""); loadData(token); }
      else toast(await r.text() || "Bledny kod.", "error");
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setTwoFaLoading(false); }
  };

  const disableTwoFa = async () => {
    if (!token) return;
    setTwoFaLoading(true);
    try {
      const r = await fetch("/api/auth/2fa/disable", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { toast("2FA wylaczone."); loadData(token); }
      else toast(await r.text() || "Blad.", "error");
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setTwoFaLoading(false); }
  };

  const cancelTwoFaSetup = () => { setTwoFaSetup("idle"); setTwoFaCode(""); setTotpQrUrl(""); setTotpManualCode(""); };

  const handleCancelSubscription = async () => {
    if (!token) return;
    setCancelling(true);
    try {
      const r = await fetch("/api/payment/cancel-subscription", {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const msg = await r.text();
      if (r.ok) { toast("Subskrypcja zostanie anulowana po wygasnieciu biezacego okresu."); setCancelConfirm(false); }
      else toast(msg || "Blad anulowania.", "error");
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setCancelling(false); }
  };

  if (!token) return <AuthScreen onLogin={handleLogin} />;

  if (loading) return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  const plan = profile?.subscriptionPlan || "FREE";
  const isPro = plan === "PRO";
  const isStarter = plan === "STARTER";
  const isPaid = isPro || isStarter;
  const shopLimit = isPro ? Infinity : isStarter ? 3 : 1;
  const canCreateShop = shops.length < shopLimit;
  const expiryStr = isPaid && profile?.subscriptionExpiresAt
    ? new Date(profile.subscriptionExpiresAt).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-[#09090B] text-white font-sans flex">
      <Toasts toasts={toasts} />

      {/* ── MOBILE DRAWER OVERLAY ── */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative w-64 bg-[#0C0C10] border-r border-white/[0.05] flex flex-col shadow-2xl">
            <div className="px-5 h-14 flex items-center justify-between border-b border-white/[0.05]">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-700/20 flex-shrink-0">
                  <span className="text-xs font-black italic">Z</span>
                </div>
                <span className="text-sm font-bold text-slate-100 tracking-tight">ItemShop</span>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="text-slate-600 hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-700 px-3 pt-3 pb-2">Nawigacja</p>
              <SidebarItem icon={Server} label="Serwery" active={tab === "shops"} onClick={() => { setTab("shops"); setMobileNavOpen(false); }} badge={shops.length > 0 ? String(shops.length) : undefined} />
              <SidebarItem icon={UserCircle} label="Profil i konto" active={tab === "profile"} onClick={() => { setTab("profile"); setMobileNavOpen(false); }} />
              <SidebarItem icon={CreditCard} label="Plan & Billing" active={tab === "billing"} onClick={() => { setTab("billing"); setMobileNavOpen(false); }} badge={isPro ? "PRO" : undefined} />
            </nav>
            <div className="p-3 border-t border-white/[0.05] space-y-2">
              <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <p className="text-[10px] text-slate-600 font-mono truncate">{profile?.email}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${isPro ? "bg-blue-600/20 text-blue-400" : "bg-white/[0.06] text-slate-600"}`}>{plan}</span>
                  {expiryStr && <span className="text-[8px] text-slate-700 font-medium">do {expiryStr}</span>}
                </div>
              </div>
              <button onClick={doLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-red-400 hover:bg-red-500/8 transition-all">
                <LogOut size={13} /> Wyloguj sie
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside className="w-56 flex-shrink-0 bg-[#0C0C10] border-r border-white/[0.05] hidden md:flex flex-col">
        {/* Brand */}
        <div className="px-5 h-14 flex items-center border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-700/20 flex-shrink-0">
              <span className="text-xs font-black italic">Z</span>
            </div>
            <span className="text-sm font-bold text-slate-100 tracking-tight">ItemShop</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-700 px-3 pt-3 pb-2">Nawigacja</p>
          <SidebarItem icon={Server} label="Serwery" active={tab === "shops"} onClick={() => setTab("shops")} badge={shops.length > 0 ? String(shops.length) : undefined} />
          <SidebarItem icon={UserCircle} label="Profil i konto" active={tab === "profile"} onClick={() => setTab("profile")} />
          <SidebarItem icon={CreditCard} label="Plan & Billing" active={tab === "billing"} onClick={() => setTab("billing")} badge={isPro ? "PRO" : undefined} />
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-white/[0.05] space-y-2">
          <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
            <p className="text-[10px] text-slate-600 font-mono truncate">{profile?.email}</p>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${isPro ? "bg-blue-600/20 text-blue-400" : "bg-white/[0.06] text-slate-600"}`}>{plan}</span>
              {expiryStr && <span className="text-[8px] text-slate-700 font-medium">do {expiryStr}</span>}
            </div>
          </div>
          <button onClick={doLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-red-400 hover:bg-red-500/8 transition-all">
            <LogOut size={13} /> Wyloguj sie
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-[#09090B] border-b border-white/[0.05] px-4 sm:px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="md:hidden text-slate-500 hover:text-slate-300 transition-colors p-1">
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-bold text-slate-200">
              {tab === "shops" ? "Twoje serwery" : tab === "profile" ? "Konto" : "Plan i subskrypcja"}
            </h1>
          </div>
          {tab === "shops" && (
            <div className="flex items-center gap-2">
              {!isPro && (
                <button onClick={startProCheckout}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-700/20">
                  <Gem size={13} /> Ulepsz do PRO
                </button>
              )}
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">

          {/* ── SHOPS TAB ── */}
          {tab === "shops" && (
            <div className="max-w-5xl space-y-6">
              {/* Shop grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shops.map(shop => (
                  <button
                    key={shop.id}
                    onClick={() => router.push(`/admin/shop/${shop.id}`)}
                    className="group relative bg-[#111116] border border-white/[0.06] hover:border-blue-500/30 p-6 rounded-2xl text-left transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/15 active:scale-[0.98]"
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-start justify-between mb-5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/[0.07] flex items-center justify-center text-xl shadow-inner">
                        🏰
                      </div>
                      <div className="flex items-center gap-2">
                        {shop.serverIp && <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_6px_rgba(52,211,153,0.6)]" />}
                        {shop.theme && shop.theme !== "default" && (
                          <span className="text-[8px] font-bold uppercase text-blue-400 bg-blue-500/10 border border-blue-500/15 px-1.5 py-0.5 rounded-md">PRO</span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-[15px] text-slate-100 mb-1">{shop.serverName}</h3>
                    <p className="text-[11px] text-slate-600 font-mono truncate">
                      {shop.customDomain || `${shop.serverName.toLowerCase()}.pumpking.club`}
                    </p>

                    <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Panel</span>
                      <span className="text-[10px] text-blue-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all">→</span>
                    </div>
                  </button>
                ))}

                {/* Create new shop */}
                {canCreateShop && (
                  <div className="bg-[#111116] border border-dashed border-white/[0.08] hover:border-blue-500/20 p-6 rounded-2xl flex flex-col gap-3 transition-all">
                    <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest mb-1">Nowy serwer</p>
                    <input
                      type="text" placeholder="Nazwa serwera..." value={newShopName}
                      onChange={e => setNewShopName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleCreateShop()}
                      className="w-full px-4 py-3 bg-[#09090B] border border-white/[0.06] rounded-xl text-sm font-medium text-center outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                    />
                    <button
                      onClick={handleCreateShop}
                      disabled={creating || !newShopName.trim()}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-40 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      {creating ? "Tworzenie..." : "Utworz sklep"}
                    </button>
                  </div>
                )}

                {/* Upgrade card (when maxed on free) */}
                {!isPro && shops.length >= 1 && (
                  <button
                    onClick={startProCheckout}
                    className="group bg-gradient-to-br from-blue-600/8 to-indigo-600/5 border border-blue-500/15 hover:border-blue-500/30 p-6 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all hover:-translate-y-0.5"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      💎
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-blue-400">Odblokuj PRO</p>
                      <p className="text-[11px] text-slate-600 mt-1">Wiecej serwerow, wlasna domena</p>
                    </div>
                  </button>
                )}
              </div>

              {/* PRO banner */}
              {!isPro && (
                <div className="bg-gradient-to-r from-blue-600/8 to-indigo-600/5 border border-blue-500/12 rounded-2xl p-6 flex items-center justify-between gap-6">
                  <div>
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">ItemShop PRO</p>
                    <p className="text-sm text-slate-500 leading-relaxed">Nielimitowane serwery · wlasna domena · wszystkie motywy · priorytetowy support</p>
                  </div>
                  <button
                    onClick={startProCheckout}
                    className="flex-shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-700/25 whitespace-nowrap"
                  >
                    29,99 PLN / mies. →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── PROFILE TAB ── */}
          {tab === "profile" && (
            <div className="max-w-xl space-y-5">
              {/* Status badge */}
              <div className="flex flex-wrap gap-2">
                <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border tracking-wider ${profile?.emailVerified ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" : "bg-red-500/10 text-red-400 border-red-500/15"}`}>
                  Email {profile?.emailVerified ? "✓ Potwierdzony" : "✗ Niepotwierdzony"}
                </span>
              </div>

              {/* Personal info */}
              <div className="bg-[#111116] border border-white/[0.06] rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-white/[0.05]">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/[0.06] flex items-center justify-center text-base font-bold text-slate-400 flex-shrink-0">
                    {(profile?.firstName?.[0] || profile?.email?.[0] || "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      {profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : "Brak nazwy"}
                    </p>
                    <p className="text-[11px] text-slate-600 font-mono">{profile?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest block mb-2">Imie</label>
                    <input type="text" placeholder="Jan" value={firstName} onChange={e => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#09090B] border border-white/[0.06] text-sm font-medium outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest block mb-2">Nazwisko</label>
                    <input type="text" placeholder="Kowalski" value={lastName} onChange={e => setLastName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#09090B] border border-white/[0.06] text-sm font-medium outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest block mb-2">Telefon</label>
                  <input type="tel" placeholder="+48 123 456 789" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#09090B] border border-white/[0.06] text-sm font-medium outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                  />
                </div>

                <button onClick={handleSaveProfile} disabled={savingProfile}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 rounded-xl text-sm font-bold tracking-wide transition-all">
                  {savingProfile ? "Zapisywanie..." : "Zapisz dane"}
                </button>
              </div>

              {/* ── 2FA MANAGEMENT ── */}
              <div className="bg-[#111116] border border-white/[0.06] rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={16} className="text-slate-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Weryfikacja dwuetapowa</h3>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border tracking-wider ${profile?.twoFactorEnabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" : "bg-white/[0.04] text-slate-600 border-white/[0.06]"}`}>
                    {profile?.twoFactorEnabled ? (profile.twoFactorMethod === "TOTP" ? "TOTP aktywne" : "Email aktywne") : "Wylaczone"}
                  </span>
                </div>

                {/* TOTP setup: QR code + confirm */}
                {twoFaSetup === "totp-setup" && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">Zeskanuj kod QR w <span className="text-slate-300 font-semibold">Google Authenticator</span>, Authy lub innej aplikacji TOTP.</p>
                    <div className="flex flex-col items-center gap-4">
                      {totpQrUrl && <img src={totpQrUrl} alt="QR kod TOTP" className="rounded-xl border border-white/[0.08] bg-white p-2" width={180} height={180} />}
                      <div className="w-full bg-[#09090B] border border-white/[0.06] rounded-xl px-4 py-3">
                        <p className="text-[10px] text-slate-600 uppercase font-semibold tracking-widest mb-1">Kod manualny</p>
                        <code className="text-xs text-blue-400 font-mono tracking-widest break-all">{totpManualCode}</code>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-600 uppercase font-semibold tracking-widest mb-2">Wpisz kod z aplikacji (weryfikacja)</p>
                      <input
                        type="text" inputMode="numeric" placeholder="000000" value={twoFaCode}
                        onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={e => e.key === "Enter" && twoFaCode.length === 6 && confirmTotpSetup()}
                        className="w-full px-4 py-3 rounded-xl bg-[#09090B] border border-white/[0.06] text-xl font-mono font-bold tracking-[0.5em] text-center outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 placeholder:tracking-normal"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={confirmTotpSetup} disabled={twoFaLoading || twoFaCode.length !== 6}
                        className="py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-40 rounded-xl text-sm font-bold transition-all">
                        {twoFaLoading ? "Weryfikacja..." : "Aktywuj TOTP"}
                      </button>
                      <button onClick={cancelTwoFaSetup} disabled={twoFaLoading}
                        className="py-3 bg-white/[0.04] hover:bg-white/[0.07] rounded-xl text-sm font-semibold text-slate-500 transition-all border border-white/[0.06]">
                        Anuluj
                      </button>
                    </div>
                  </div>
                )}

                {/* Email 2FA: waiting for code */}
                {twoFaSetup === "email-pending" && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">Wpisz kod wysłany na <span className="text-slate-300 font-semibold">{profile?.email}</span></p>
                    <input
                      type="text" inputMode="numeric" placeholder="000000" value={twoFaCode}
                      onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={e => e.key === "Enter" && twoFaCode.length === 6 && confirmEmailTwoFa()}
                      className="w-full px-4 py-3 rounded-xl bg-[#09090B] border border-white/[0.06] text-xl font-mono font-bold tracking-[0.5em] text-center outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 placeholder:tracking-normal"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={confirmEmailTwoFa} disabled={twoFaLoading || twoFaCode.length !== 6}
                        className="py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-40 rounded-xl text-sm font-bold transition-all">
                        {twoFaLoading ? "Weryfikacja..." : "Wlacz 2FA Email"}
                      </button>
                      <button onClick={cancelTwoFaSetup} disabled={twoFaLoading}
                        className="py-3 bg-white/[0.04] hover:bg-white/[0.07] rounded-xl text-sm font-semibold text-slate-500 transition-all border border-white/[0.06]">
                        Anuluj
                      </button>
                    </div>
                  </div>
                )}

                {/* Idle state — show options */}
                {twoFaSetup === "idle" && (
                  <>
                    {!profile?.twoFactorEnabled ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-600 leading-relaxed">Dodaj drugi składnik uwierzytelniania. Wybierz metodę:</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={startEmailTwoFa} disabled={twoFaLoading}
                            className="flex flex-col items-center gap-2 py-4 px-3 bg-[#09090B] hover:bg-white/[0.04] border border-white/[0.06] hover:border-blue-500/30 rounded-xl transition-all group disabled:opacity-40">
                            <Mail size={18} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                            <span className="text-[11px] font-semibold text-slate-500 group-hover:text-slate-300 transition-colors text-center">Kod Email</span>
                          </button>
                          <button onClick={startTotpSetup} disabled={twoFaLoading}
                            className="flex flex-col items-center gap-2 py-4 px-3 bg-[#09090B] hover:bg-white/[0.04] border border-white/[0.06] hover:border-blue-500/30 rounded-xl transition-all group disabled:opacity-40">
                            <Smartphone size={18} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                            <span className="text-[11px] font-semibold text-slate-500 group-hover:text-slate-300 transition-colors text-center">Authenticator</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 py-2">
                          {profile.twoFactorMethod === "TOTP"
                            ? <Smartphone size={16} className="text-emerald-400 flex-shrink-0" />
                            : <Mail size={16} className="text-emerald-400 flex-shrink-0" />}
                          <p className="text-xs text-slate-400">
                            {profile.twoFactorMethod === "TOTP"
                              ? "Używasz aplikacji Google Authenticator / Authy"
                              : "Używasz kodów email jako drugi składnik"}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {profile.twoFactorMethod !== "TOTP" ? (
                            <button onClick={startTotpSetup} disabled={twoFaLoading}
                              className="py-3 bg-white/[0.04] hover:bg-blue-600/10 hover:border-blue-500/30 border border-white/[0.06] rounded-xl text-xs font-semibold text-slate-500 hover:text-blue-400 transition-all flex items-center justify-center gap-2">
                              <Smartphone size={13} /> Przejdz na TOTP
                            </button>
                          ) : (
                            <button onClick={startEmailTwoFa} disabled={twoFaLoading}
                              className="py-3 bg-white/[0.04] hover:bg-blue-600/10 hover:border-blue-500/30 border border-white/[0.06] rounded-xl text-xs font-semibold text-slate-500 hover:text-blue-400 transition-all flex items-center justify-center gap-2">
                              <Mail size={13} /> Przejdz na Email
                            </button>
                          )}
                          <button onClick={disableTwoFa} disabled={twoFaLoading}
                            className="py-3 bg-white/[0.04] hover:bg-red-500/8 border border-white/[0.06] hover:border-red-500/20 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-400 transition-all">
                            {twoFaLoading ? "..." : "Wylacz 2FA"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Change password */}
              <div className="bg-[#111116] border border-white/[0.06] rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Zmiana hasla</h3>
                <input type="password" placeholder="Aktualne haslo" value={cpCurrent} onChange={e => setCpCurrent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#09090B] border border-white/[0.06] text-sm font-medium outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input type="password" placeholder="Nowe haslo" value={cpNew} onChange={e => setCpNew(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#09090B] border border-white/[0.06] text-sm font-medium outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                  />
                  <input type="password" placeholder="Powtorz haslo" value={cpConfirm} onChange={e => setCpConfirm(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleChangePassword()}
                    className="w-full px-4 py-3 rounded-xl bg-[#09090B] border border-white/[0.06] text-sm font-medium outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                  />
                </div>
                <button onClick={handleChangePassword} disabled={savingPassword || !cpCurrent || !cpNew || !cpConfirm}
                  className="w-full py-3 bg-white/[0.05] hover:bg-blue-600 active:scale-[0.98] disabled:opacity-40 rounded-xl text-sm font-semibold transition-all border border-white/[0.06] hover:border-transparent">
                  {savingPassword ? "Zapisywanie..." : "Zmien haslo"}
                </button>
              </div>

              {/* Danger zone */}
              <div className="bg-[#111116] border border-red-500/10 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-red-500/60">Strefa niebezpieczna</h3>
                <button onClick={doLogout}
                  className="w-full py-3 text-red-400/70 hover:text-red-400 hover:bg-red-500/8 rounded-xl text-sm font-semibold border border-red-500/10 hover:border-red-500/20 transition-all">
                  Wyloguj sie
                </button>
                {!deleteConfirm ? (
                  <button onClick={() => setDeleteConfirm(true)}
                    className="w-full py-3 text-red-600/50 hover:text-red-500/70 rounded-xl text-sm font-semibold border border-red-500/8 hover:border-red-500/15 transition-all">
                    Usun konto permanentnie
                  </button>
                ) : (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs text-red-400/80 font-medium leading-relaxed">
                      Nieodwracalne. Wszystkie sklepy, produkty i dane zostana usuniete. Wpisz haslo, aby potwierdzic.
                    </p>
                    <input type="password" placeholder="Potwierdz haslem" value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleDeleteAccount()}
                      className="w-full px-4 py-3 rounded-xl bg-[#09090B] border border-red-500/20 text-sm font-medium outline-none focus:border-red-500/40 transition-all placeholder:text-red-950"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleDeleteAccount} disabled={deleting || !deletePassword}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 active:scale-[0.98] disabled:opacity-40 rounded-xl text-sm font-bold transition-all">
                        {deleting ? "Usuwanie..." : "Potwierdz usuniecie"}
                      </button>
                      <button onClick={() => { setDeleteConfirm(false); setDeletePassword(""); }}
                        className="px-5 py-3 bg-white/[0.04] hover:bg-white/[0.07] rounded-xl text-sm font-semibold text-slate-500 transition-all">
                        Anuluj
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BILLING TAB ── */}
          {tab === "billing" && (
            <div className="max-w-3xl space-y-5">
              {/* Current plan banner */}
              <div className={`rounded-2xl p-5 flex items-center justify-between border ${
                isPro ? "bg-blue-600/8 border-blue-500/20" : isStarter ? "bg-violet-600/8 border-violet-500/20" : "bg-white/[0.02] border-white/[0.06]"
              }`}>
                <div>
                  <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest mb-1">Aktywny plan</p>
                  <h2 className={`text-2xl font-black ${isPro ? "text-blue-400" : isStarter ? "text-violet-400" : "text-slate-400"}`}>
                    {isPro ? "PRO" : isStarter ? "STARTER" : "FREE"}
                  </h2>
                  {expiryStr && <p className="text-xs text-slate-600 mt-1">Odnowi się {expiryStr}</p>}
                </div>
                <span className="text-3xl">{isPro ? "💎" : isStarter ? "⚡" : "🆓"}</span>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* FREE */}
                <div className={`bg-[#111116] border border-white/[0.06] rounded-2xl p-5 flex flex-col ${isPaid ? "opacity-50" : ""}`}>
                  <div className="mb-4">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mb-1">Darmowy</p>
                    <h3 className="text-lg font-black text-slate-300">FREE</h3>
                    <p className="text-xl font-black text-slate-400 mt-1">0 zł<span className="text-[10px] font-medium text-slate-600">/mc</span></p>
                  </div>
                  <ul className="space-y-2 text-[11px] text-slate-500 flex-1 mb-5">
                    {["1 sklep", "5 produktów", "1 tryb gry", "Motyw domyślny"].map(f => (
                      <li key={f} className="flex items-center gap-2"><span className="text-emerald-600 text-[10px]">✓</span>{f}</li>
                    ))}
                    {["Promo kody", "Lootbox", "Motywy PRO", "Custom domena"].map(f => (
                      <li key={f} className="flex items-center gap-2 opacity-40"><span className="text-[10px]">✕</span>{f}</li>
                    ))}
                  </ul>
                  <div className="py-2 rounded-xl border border-white/[0.06] text-center text-[9px] font-bold uppercase text-slate-600">
                    {plan === "FREE" ? "Aktywny" : "—"}
                  </div>
                </div>

                {/* STARTER */}
                <div className={`relative bg-[#111116] rounded-2xl p-5 flex flex-col overflow-hidden transition-all ${
                  isStarter ? "border border-violet-500/30" : isPro ? "border border-white/[0.06] opacity-60" : "border border-violet-500/20 hover:border-violet-500/40 cursor-pointer"
                }`} onClick={() => plan === "FREE" && startStarterCheckout()}>
                  {plan === "FREE" && (
                    <div className="absolute top-0 right-0 bg-violet-600 text-[8px] font-black px-3 py-1.5 rounded-bl-xl uppercase tracking-wider">
                      Popularny
                    </div>
                  )}
                  <div className="mb-4">
                    <p className="text-[9px] text-violet-500/60 font-bold uppercase tracking-widest mb-1">Dla małych serwerów</p>
                    <h3 className="text-lg font-black text-violet-400">STARTER</h3>
                    <p className="text-xl font-black text-violet-300 mt-1">19,99 zł<span className="text-[10px] font-medium text-violet-500/60">/mc</span></p>
                  </div>
                  <ul className="space-y-2 text-[11px] text-violet-200/60 flex-1 mb-5">
                    {["3 sklepy", "30 produktów", "3 tryby gry", "Motywy dark, forest", "Promo kody", "Lootbox"].map(f => (
                      <li key={f} className="flex items-center gap-2"><span className="text-violet-400 text-[10px]">✓</span>{f}</li>
                    ))}
                    {["Custom domena", "Discord webhook"].map(f => (
                      <li key={f} className="flex items-center gap-2 opacity-40"><span className="text-[10px]">✕</span>{f}</li>
                    ))}
                  </ul>
                  {isStarter
                    ? <div className="py-2 rounded-xl border border-violet-500/20 bg-violet-500/5 text-center text-[9px] font-bold uppercase text-violet-400">⚡ Aktywny STARTER</div>
                    : plan === "FREE"
                      ? <div className="py-2 rounded-xl bg-violet-600 text-center text-[9px] font-bold uppercase text-white shadow-lg shadow-violet-700/20">Wybierz STARTER →</div>
                      : <div className="py-2 rounded-xl border border-white/[0.06] text-center text-[9px] font-bold uppercase text-slate-600">—</div>
                  }
                </div>

                {/* PRO */}
                <div className={`relative bg-[#111116] rounded-2xl p-5 flex flex-col overflow-hidden transition-all ${
                  isPro ? "border border-blue-500/30" : "border border-blue-500/20 hover:border-blue-500/40 cursor-pointer"
                }`} onClick={() => !isPro && startProCheckout()}>
                  {!isPro && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-[8px] font-black px-3 py-1.5 rounded-bl-xl uppercase tracking-wider">
                      Najlepszy
                    </div>
                  )}
                  <div className="mb-4">
                    <p className="text-[9px] text-blue-500/60 font-bold uppercase tracking-widest mb-1">Dla dużych serwerów</p>
                    <h3 className="text-lg font-black text-blue-400">PRO</h3>
                    <p className="text-xl font-black text-blue-300 mt-1">49,99 zł<span className="text-[10px] font-medium text-blue-500/60">/mc</span></p>
                  </div>
                  <ul className="space-y-2 text-[11px] text-blue-200/60 flex-1 mb-5">
                    {["Nielimitowane sklepy", "Nielimitowane produkty", "Nielimitowane tryby", "Wszystkie motywy", "Promo kody", "Lootbox", "Discord webhook", "Custom domena"].map(f => (
                      <li key={f} className="flex items-center gap-2"><span className="text-blue-400 text-[10px]">✓</span>{f}</li>
                    ))}
                  </ul>
                  {isPro
                    ? <div className="py-2 rounded-xl border border-blue-500/20 bg-blue-500/5 text-center text-[9px] font-bold uppercase text-blue-400">💎 Aktywny PRO</div>
                    : <div className="py-2 rounded-xl bg-blue-600 text-center text-[9px] font-bold uppercase text-white shadow-lg shadow-blue-700/20">Wybierz PRO →</div>
                  }
                </div>
              </div>

              {/* Cancel subscription */}
              {isPaid && (
                <div className="bg-[#111116] border border-red-500/10 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-red-500/60">Zarządzanie subskrypcją</h3>
                  {!cancelConfirm ? (
                    <button onClick={() => setCancelConfirm(true)}
                      className="w-full py-3 text-red-600/50 hover:text-red-500/70 rounded-xl text-sm font-semibold border border-red-500/8 hover:border-red-500/15 transition-all">
                      Anuluj subskrypcję {plan}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-red-400/80 font-medium leading-relaxed">
                        Zachowasz dostęp do {expiryStr || "końca okresu"}, po czym konto wróci do FREE.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={handleCancelSubscription} disabled={cancelling}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-500 active:scale-[0.98] disabled:opacity-40 rounded-xl text-sm font-bold transition-all">
                          {cancelling ? "Anulowanie..." : "Potwierdź anulowanie"}
                        </button>
                        <button onClick={() => setCancelConfirm(false)}
                          className="px-5 py-3 bg-white/[0.04] hover:bg-white/[0.07] rounded-xl text-sm font-semibold text-slate-500 transition-all">
                          Wstecz
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
