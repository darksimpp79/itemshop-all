"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  LayoutDashboard, Gamepad2, Package, ShoppingCart,
  Gift, Dices, Settings, KeyRound, CreditCard,
  ArrowLeft, ExternalLink, RefreshCw, Copy, Download,
  Check, Trash2, Pencil, Plus, Search, ChevronRight,
  Gem, Mail, Smartphone, ShieldOff, Eye, EyeOff, QrCode, Tag, ToggleLeft, ToggleRight
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Toast { id: number; message: string; type: "success" | "error" | "info"; }
interface ConfirmState { open: boolean; message: string; onConfirm: () => void; }
interface CodeModalState { open: boolean; title: string; label: string; onConfirm: (code: string) => Promise<void>; }

interface Shop {
  id: number; serverName: string; serverIp?: string; customDomain?: string;
  apiKey: string; api_key?: string; theme?: string;
  dailyRewardName?: string; dailyRewardCommand?: string;
  discordLink?: string; bannerText?: string;
}
interface Product {
  id: number; name: string; description: string; iconEmoji: string;
  imageUrl?: string; price: number; mode: string; commands: string[];
}
interface ShopMode { id: number; name: string; description: string; imageUrl?: string; }
interface Order { id: number; playerName: string; itemName: string; claimed: boolean; }
interface Stats { totalOrders: number; claimedOrders: number; totalRevenue: number; uniquePlayers: number; }
interface ChartPoint { date: string; revenue: number; orders: number; }
interface LootboxReward { id: number; name: string; command: string; weight: number; }
interface PromoCode { id: number; code: string; discountPercent: number; maxUses: number | null; currentUses: number; active: boolean; expiresAt: string | null; createdAt: string; }

// ─── TOAST ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((msg: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, toast };
}

function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium pointer-events-auto backdrop-blur-xl
          ${t.type==="success" ? "bg-emerald-950/80 border-emerald-800/60 text-emerald-300"
          : t.type==="error"  ? "bg-red-950/80 border-red-800/60 text-red-300"
                               : "bg-blue-950/80 border-blue-800/60 text-blue-300"}`}>
          <span>{t.type==="success"?"✓":t.type==="error"?"✕":"i"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
function ConfirmModal({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111116] border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <p className="text-center font-semibold text-slate-200 mb-7 leading-relaxed">{state.message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-sm font-semibold text-slate-400 transition-all">Anuluj</button>
          <button onClick={() => { state.onConfirm(); onClose(); }} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold transition-all">Usun</button>
        </div>
      </div>
    </div>
  );
}

// ─── CODE MODAL ───────────────────────────────────────────────────────────────
function CodeModal({ state, onClose }: { state: CodeModalState; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (!state.open) { setCode(""); setLoading(false); } }, [state.open]);
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-[9991] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111116] border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <p className="text-center font-semibold text-slate-200 mb-5 leading-relaxed">{state.title}</p>
        <input
          type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
          placeholder="000000" autoFocus
          className="w-full px-4 py-4 rounded-xl bg-[#09090B] border border-white/[0.07] font-mono font-bold tracking-[0.5em] text-center text-xl outline-none focus:border-blue-500/50 transition-all mb-5 placeholder:text-slate-800 placeholder:tracking-normal"
        />
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-sm font-semibold text-slate-400 transition-all disabled:opacity-50">Anuluj</button>
          <button
            onClick={async () => { if (code.length<6) return; setLoading(true); try { await state.onConfirm(code); onClose(); } finally { setLoading(false); } }}
            disabled={loading || code.length < 6}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold transition-all disabled:opacity-50"
          >
            {loading ? "..." : state.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CHART ────────────────────────────────────────────────────────────────────
function MiniChart({ data }: { data: ChartPoint[] }) {
  if (!data.length) return (
    <div className="h-32 flex items-center justify-center">
      <p className="text-xs text-slate-700 font-semibold uppercase tracking-widest">Brak danych</p>
    </div>
  );
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div className="flex items-end gap-1.5 h-32 pt-6">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
          <div className="w-full flex items-end justify-center" style={{ height: "90px" }}>
            <div
              className="w-full rounded-t-lg bg-blue-500/20 group-hover:bg-blue-500/40 transition-all duration-300 relative cursor-default"
              style={{ height: `${Math.max((d.revenue / max) * 100, 4)}%` }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#111116] border border-white/10 text-[9px] font-bold text-blue-400 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-xl z-10">
                {d.revenue.toFixed(0)} PLN
              </div>
            </div>
          </div>
          <p className="text-[8px] font-bold text-slate-700 uppercase tracking-wide">{d.date}</p>
        </div>
      ))}
    </div>
  );
}

// ─── DRAGGABLE PRODUCTS ───────────────────────────────────────────────────────
function DraggableProducts({ products, onReorder, onEdit, onDelete }: {
  products: Product[]; onReorder: (p: Product[]) => void;
  onEdit: (p: Product) => void; onDelete: (id: number) => void;
}) {
  const dragIdx = useRef<number | null>(null);
  const overIdx = useRef<number | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {products.map((p, i) => (
        <div key={p.id} draggable
          onDragStart={() => { dragIdx.current = i; }}
          onDragEnter={() => { overIdx.current = i; }}
          onDragEnd={() => {
            if (dragIdx.current === null || overIdx.current === null) return;
            const arr = [...products];
            const [item] = arr.splice(dragIdx.current, 1);
            arr.splice(overIdx.current, 0, item);
            dragIdx.current = null; overIdx.current = null;
            onReorder(arr);
          }}
          onDragOver={e => e.preventDefault()}
          className="group relative bg-[#111116] border border-white/[0.06] hover:border-blue-500/25 p-5 rounded-2xl cursor-grab active:cursor-grabbing active:scale-[0.97] active:opacity-60 transition-all"
        >
          {/* Drag handle hint */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 group-hover:opacity-30 transition-opacity">
            {[0,1,2,3,4,5].map(i => <div key={i} className="w-0.5 h-0.5 bg-slate-400 rounded-full" />)}
          </div>

          <div className="absolute top-3.5 right-3.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button onClick={() => onEdit(p)} className="w-7 h-7 bg-[#09090B] hover:bg-blue-600 text-slate-500 hover:text-white rounded-lg transition-all text-xs flex items-center justify-center border border-white/[0.06]">✏</button>
            <button onClick={() => onDelete(p.id)} className="w-7 h-7 bg-[#09090B] hover:bg-red-600 text-slate-500 hover:text-white rounded-lg transition-all text-xs flex items-center justify-center border border-white/[0.06]">✕</button>
          </div>

          <div className="h-14 flex items-center mb-4">
            {p.imageUrl
              ? <img src={p.imageUrl} className="h-full object-contain drop-shadow-lg" alt="" />
              : <span className="text-4xl">{p.iconEmoji || "📦"}</span>
            }
          </div>

          <h4 className="font-bold text-[14px] mb-1 truncate text-slate-100">{p.name}</h4>
          <span className="inline-block text-[9px] text-blue-500/70 font-bold uppercase tracking-widest bg-blue-500/8 border border-blue-500/12 px-2 py-0.5 rounded-md mb-3">{p.mode}</span>
          <p className="text-xl font-black text-slate-100">{p.price.toFixed(2)} <span className="text-[10px] text-slate-600 font-medium">PLN</span></p>
        </div>
      ))}
    </div>
  );
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const inp  = "w-full px-4 py-3 rounded-xl bg-[#09090B] border border-white/[0.07] text-sm font-medium outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700";
const mono = "w-full px-4 py-3 rounded-xl bg-[#09090B] border border-white/[0.07] text-sm font-mono text-blue-300 outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700";
const card = "bg-[#111116] border border-white/[0.06] rounded-2xl p-6";
const btn  = "px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-40 rounded-xl text-xs font-bold uppercase tracking-wide transition-all";
const btnG = "px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] rounded-xl text-xs font-semibold text-slate-400 transition-all border border-white/[0.06]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">{label}</label>
      {children}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }: { label: string; value: string | number; sub?: string; color: string; icon: string }) {
  return (
    <div className={`${card} flex flex-col`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">{label}</p>
        <span className={`text-xl ${color} opacity-60`}>{icon}</span>
      </div>
      <p className={`text-2xl font-black ${color} leading-none`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 font-medium mt-1.5">{sub}</p>}
    </div>
  );
}

// ─── ROUTE WRAPPER ────────────────────────────────────────────────────────────
export default function ShopPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params);
  return <ShopPanel shopId={parseInt(shopId)} />;
}

// ─── MAIN PANEL ───────────────────────────────────────────────────────────────
function ShopPanel({ shopId }: { shopId: number }) {
  const router = useRouter();
  const { toasts, toast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [modes, setModes] = useState<ShopMode[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, claimedOrders: 0, totalRevenue: 0, uniquePlayers: 0 });
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [lootbox, setLootbox] = useState<LootboxReward[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [plan, setPlan] = useState("FREE");
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [tab, setTab] = useState("dashboard");
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, message: "", onConfirm: () => {} });
  const [codeModal, setCodeModal] = useState<CodeModalState>({ open: false, title: "", label: "Potwierdz", onConfirm: async () => {} });
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Product form
  const [prodId, setProdId] = useState<number|null>(null);
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodEmoji, setProdEmoji] = useState("📦");
  const [prodImg, setProdImg] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodMode, setProdMode] = useState("");
  const [prodCmd, setProdCmd] = useState("");
  const [prodUploading, setProdUploading] = useState(false);

  // Mode form
  const [modeId, setModeId] = useState<number|null>(null);
  const [modeName, setModeName] = useState("");
  const [modeDesc, setModeDesc] = useState("");
  const [modeImg, setModeImg] = useState("");
  const [modeUploading, setModeUploading] = useState(false);

  // Settings
  const [serverIp, setServerIp] = useState("");
  const [theme, setTheme] = useState("default");
  const [customDomain, setCustomDomain] = useState("");
  const [domainError, setDomainError] = useState<string|null>(null);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [rewardName, setRewardName] = useState("");
  const [rewardCmd, setRewardCmd] = useState("");
  const [discordLink, setDiscordLink] = useState("");
  const [bannerText, setBannerText] = useState("");
  const [termsContent, setTermsContent] = useState("");

  // Lootbox
  const [lootName, setLootName] = useState("");
  const [lootCmd, setLootCmd] = useState("");
  const [lootWeight, setLootWeight] = useState("1");

  // Promo codes
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState("10");
  const [promoMaxUses, setPromoMaxUses] = useState("");
  const [promoExpiresAt, setPromoExpiresAt] = useState("");

  // Orders
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState<"all"|"claimed"|"pending">("all");

  // Onboarding
  const [onboarding, setOnboarding] = useState({ modes: false, products: false, ip: false, plugin: false });

  useEffect(() => {
    const t = localStorage.getItem("auth_token");
    if (!t) { router.push("/admin"); return; }
    setToken(t);

    const ob = localStorage.getItem("onboarding_status");
    if (ob) setOnboarding(JSON.parse(ob));

    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") { toast("Platnosc zakonczona! Plan zaktualizowany.", "success"); params.delete("payment"); window.history.replaceState({}, "", window.location.pathname); }
    if (payment === "cancel")  { toast("Platnosc anulowana.", "info"); params.delete("payment"); window.history.replaceState({}, "", window.location.pathname); }

    loadAll(t);
  }, []);

  const loadAll = async (tok?: string) => {
    const t = tok || token;
    if (!t) return;
    setLoadingData(true);
    try {
      const pRes = await fetch("/api/admin/user/profile", { headers: { Authorization: `Bearer ${t}` } });
      if (pRes.status === 401) { router.push("/admin"); return; }
      if (pRes.ok) { const p = await pRes.json(); setPlan(p.subscriptionPlan || "FREE"); setSubscriptionExpiresAt(p.subscriptionExpiresAt || null); }

      const sRes = await fetch("/api/admin/moje-sklepy", { headers: { Authorization: `Bearer ${t}` } });
      if (!sRes.ok) return;
      const shops: Shop[] = await sRes.json();
      const found = shops.find(s => s.id === shopId);
      if (!found) { router.push("/admin"); return; }

      setShop(found);
      const key = found.apiKey || found.api_key || "";
      setServerIp(found.serverIp || "");
      setTheme(found.theme || "default");
      setCustomDomain(found.customDomain || "");
      setRewardName(found.dailyRewardName || "");
      setRewardCmd(found.dailyRewardCommand || "");
      setDiscordLink(found.discordLink || "");
      setBannerText(found.bannerText || "");
      setTermsContent((found as { termsContent?: string }).termsContent || "");

      await Promise.all([
        fetchProducts(key, t),
        fetchModes(key, t),
        fetchOrders(key, t),
        fetchStats(key, t),
        fetchChart(key, t),
        fetchLootbox(key, t),
        fetchPromoCodes(key, t),
      ]);
    } finally { setLoadingData(false); }
  };

  const apiKey = shop?.apiKey || shop?.api_key || "";

  const fetchProducts = async (key: string, t: string) => {
    const r = await fetch("/api/admin/produkty", { headers: { Authorization: `Bearer ${t}`, "X-API-Key": key } });
    if (r.ok) setProducts(await r.json());
  };
  const fetchModes = async (key: string, t: string) => {
    const r = await fetch("/api/admin/tryby", { headers: { Authorization: `Bearer ${t}`, "X-API-Key": key } });
    if (r.ok) setModes(await r.json());
  };
  const fetchOrders = async (key: string, t: string) => {
    const r = await fetch("/api/admin/zamowienia", { headers: { Authorization: `Bearer ${t}`, "X-API-Key": key } });
    if (r.ok) { const d = await r.json(); setOrders(d.content || d || []); }
  };
  const fetchStats = async (key: string, t: string) => {
    const r = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${t}`, "X-API-Key": key } });
    if (r.ok) { const d = await r.json(); setStats({ totalOrders: d.totalOrders||0, claimedOrders: d.claimedOrders||0, totalRevenue: d.totalRevenue||0, uniquePlayers: d.uniquePlayers||0 }); }
  };
  const fetchChart = async (key: string, t: string) => {
    const r = await fetch("/api/admin/stats/chart", { headers: { Authorization: `Bearer ${t}`, "X-API-Key": key } });
    if (r.ok) setChart(await r.json());
  };
  const fetchLootbox = async (key: string, t: string) => {
    const r = await fetch("/api/admin/lootbox", { headers: { Authorization: `Bearer ${t}`, "X-API-Key": key } });
    if (r.ok) setLootbox(await r.json());
  };
  const fetchPromoCodes = async (key: string, t: string) => {
    const r = await fetch("/api/admin/kody-promo", { headers: { Authorization: `Bearer ${t}`, "X-API-Key": key } });
    if (r.ok) setPromoCodes(await r.json());
  };

  const uploadImage = async (file: File, setUrl: (u:string)=>void, setLoading: (b:boolean)=>void) => {
    if (!token) return;
    setLoading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await fetch("/api/files/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (r.ok) { const d = await r.json(); setUrl(d.url); }
      else toast("Blad uploadu.", "error");
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setLoading(false); }
  };

  const resetProd = () => { setProdId(null); setProdName(""); setProdDesc(""); setProdEmoji("📦"); setProdImg(""); setProdPrice(""); setProdMode(""); setProdCmd(""); };

  const handleSaveProd = async () => {
    if (!prodName || !prodMode) { toast("Uzupelnij nazwe i tryb.", "error"); return; }
    const body = { id: prodId, name: prodName, description: prodDesc, iconEmoji: prodEmoji, imageUrl: prodImg, price: parseFloat(prodPrice)||0, requiredSlots: 1, mode: prodMode, commands: prodCmd.split("\n").filter(l => l.trim()) };
    const r = await fetch("/api/admin/produkt", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-API-Key": apiKey }, body: JSON.stringify(body) });
    if (r.ok) { resetProd(); fetchProducts(apiKey, token!); toast(prodId ? "Produkt zaktualizowany." : "Produkt opublikowany!"); }
    else toast(await r.text() || "Blad.", "error");
  };

  const handleDeleteProd = (id: number) => setConfirm({ open: true, message: "Na pewno usunac produkt?", onConfirm: async () => {
    const r = await fetch(`/api/admin/produkt/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { fetchProducts(apiKey, token!); toast("Produkt usuniety."); }
    else toast("Blad usuwania.", "error");
  }});

  const handleReorder = async (reordered: Product[]) => {
    setProducts(reordered);
    await fetch("/api/admin/produkty/kolejnosc", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-API-Key": apiKey }, body: JSON.stringify(reordered.map((p, i) => ({ id: p.id, position: i }))) });
  };

  const resetMode = () => { setModeId(null); setModeName(""); setModeDesc(""); setModeImg(""); };

  const handleSaveMode = async () => {
    if (!modeName) { toast("Podaj nazwe trybu.", "error"); return; }
    if (!modeId && plan === "FREE" && modes.length >= 1) { toast("Plan FREE - max 1 tryb. Odblokuj PRO.", "error"); return; }
    const r = await fetch("/api/admin/tryb", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-API-Key": apiKey }, body: JSON.stringify({ id: modeId, name: modeName, description: modeDesc, imageUrl: modeImg }) });
    if (r.ok) { resetMode(); fetchModes(apiKey, token!); toast(modeId ? "Tryb zaktualizowany." : "Tryb stworzony!"); }
    else toast(await r.text() || "Blad.", "error");
  };

  const handleDeleteMode = (id: number) => setConfirm({ open: true, message: "Na pewno usunac tryb?", onConfirm: async () => {
    const r = await fetch(`/api/admin/tryb/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { fetchModes(apiKey, token!); toast("Tryb usuniety."); }
  }});

  const handleSaveIp = async () => {
    const r = await fetch(`/api/admin/sklep/ip?serverIp=${serverIp}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "X-API-Key": apiKey } });
    if (r.ok) { toast("IP zaktualizowane."); saveOnboarding({ ip: true }); }
    else toast("Blad.", "error");
  };

  const handleSaveTheme = async (t: string) => {
    if (plan === "FREE" && t !== "default") { toast("Motywy premium wymagają planu STARTER lub PRO.", "error"); return; }
    setTheme(t);
    const r = await fetch(`/api/admin/sklep/motyw?theme=${t}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "X-API-Key": apiKey } });
    if (r.ok) toast("Motyw zmieniony.");
    else toast(await r.text() || "Blad.", "error");
  };

  const isValidDomain = (d: string) => {
    if (!d || d.includes("localhost") || d.includes("http") || d.includes(":")) return false;
    return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,}$/i.test(d);
  };

  const handleSaveDomain = async () => {
    if (plan !== "PRO") { toast("Wlasna domena tylko dla PRO.", "error"); return; }
    if (!isValidDomain(customDomain)) { setDomainError("Format: sklep.mcsurv.pl"); return; }
    setDomainError(null); setVerifyingDomain(true);
    try {
      const r = await fetch(`/api/admin/custom-domain?customDomain=${encodeURIComponent(customDomain)}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "X-API-Key": apiKey } });
      if (r.ok) toast("Domena zweryfikowana i ustawiona!");
      else { const e = await r.text(); setDomainError(e || "Blad weryfikacji DNS."); toast("Weryfikacja DNS nie powiodla sie.", "error"); }
    } catch { toast("Blad polaczenia.", "error"); }
    finally { setVerifyingDomain(false); }
  };

  const handleSaveShopSettings = async () => {
    const r = await fetch(`/api/admin/shops/${shopId}/settings`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ dailyRewardName: rewardName, dailyRewardCommand: rewardCmd, discordLink, bannerText, termsContent }) });
    if (r.ok) toast("Ustawienia zapisane.");
    else toast("Blad.", "error");
  };

  const handleAddLoot = async () => {
    if (!lootName || !lootCmd) { toast("Uzupelnij nazwe i komende.", "error"); return; }
    const r = await fetch("/api/admin/lootbox", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-API-Key": apiKey }, body: JSON.stringify({ name: lootName, command: lootCmd, weight: parseInt(lootWeight)||1 }) });
    if (r.ok) { toast("Nagroda dodana!"); setLootName(""); setLootCmd(""); setLootWeight("1"); fetchLootbox(apiKey, token!); }
    else toast("Blad.", "error");
  };

  const handleDeleteLoot = async (id: number) => {
    const r = await fetch(`/api/admin/lootbox/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "X-API-Key": apiKey } });
    if (r.ok) { toast("Usunieto."); fetchLootbox(apiKey, token!); }
    else toast("Blad.", "error");
  };

  const handleExport = async () => {
    try {
      const r = await fetch("/api/admin/zamowienia/export", { headers: { Authorization: `Bearer ${token}`, "X-API-Key": apiKey } });
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `zamowienia_${shop?.serverName}.csv`; a.click();
      toast("CSV wyeksportowany.");
    } catch { toast("Blad eksportu.", "error"); }
  };

  const startStarterCheckout = async () => {
    if (!token) return;
    try {
      const r = await fetch("/api/payment/create-checkout-session-starter", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); if (d.url) window.location.href = d.url; }
      else toast(await r.text() || "Blad platnosci.", "error");
    } catch { toast("Blad polaczenia.", "error"); }
  };

  const startProCheckout = async () => {
    if (!token) return;
    try {
      const r = await fetch("/api/payment/create-checkout-session", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); if (d.url) window.location.href = d.url; }
      else toast("Blad platnosci.", "error");
    } catch { toast("Blad polaczenia.", "error"); }
  };

  const copyApiKey = async () => {
    await navigator.clipboard.writeText(apiKey);
    setApiKeyCopied(true); toast("API Key skopiowany.");
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  const handleDownloadConfig = () => {
    const cfg = `# ZiutekShop Config\nserver-name: "${shop?.serverName}"\napi-key: "${apiKey}"\napi-url: "https://api.pumpking.club/api"\ncheck-interval: 60\n\nallowed-command-prefixes:\n  - "give "\n  - "lp "\n  - "eco "\n\nmessages:\n  no-slots: "&cNie masz wolnych slotow!"\n  bought-success: "&aPomyslnie odebrano: &f{item}"\n  nothing-to-collect: "&cBrak przedmiotow do odebrania."`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([cfg], {type:"text/yaml"})); a.download = "config.yml"; a.click();
    toast("Config.yml pobrany.");
  };

  const saveOnboarding = (upd: Partial<typeof onboarding>) => {
    const n = { ...onboarding, ...upd }; setOnboarding(n); localStorage.setItem("onboarding_status", JSON.stringify(n));
  };

  const filteredOrders = orders.filter(o => {
    const s = orderSearch.toLowerCase();
    return (o.playerName.toLowerCase().includes(s) || o.itemName.toLowerCase().includes(s)) &&
           (orderFilter==="all" || (orderFilter==="claimed" && o.claimed) || (orderFilter==="pending" && !o.claimed));
  });

  const isPro = plan === "PRO";
  const isAtLeastStarter = plan === "PRO" || plan === "STARTER";

  if (loadingData || !shop) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const NAV_GROUPS = [
    {
      label: "Sklep",
      items: [
        { id: "dashboard", Icon: LayoutDashboard, label: "Dashboard" },
        { id: "modes",     Icon: Gamepad2,        label: "Tryby gry" },
        { id: "products",  Icon: Package,         label: "Produkty" },
        { id: "orders",    Icon: ShoppingCart,    label: "Sprzedaz" },
      ],
    },
    {
      label: "Konfiguracja",
      items: [
        { id: "rewards",  Icon: Gift,     label: "Nagroda dzienna" },
        { id: "lootbox",  Icon: Dices,    label: "Lootbox" },
        { id: "promo",    Icon: Tag,      label: "Promo kody" },
        { id: "settings", Icon: Settings, label: "Ustawienia" },
      ],
    },
    {
      label: "Konto",
      items: [
        { id: "security", Icon: KeyRound, label: "Klucz API" },
        { id: "billing",  Icon: CreditCard,  label: "Plan" },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[#09090B] text-white font-sans flex overflow-hidden">
      <Toasts toasts={toasts} />
      <ConfirmModal state={confirm} onClose={() => setConfirm(p => ({...p,open:false}))} />
      <CodeModal state={codeModal} onClose={() => setCodeModal(p => ({...p,open:false}))} />

      {/* ── SIDEBAR ── */}
      <aside className="w-[200px] flex-shrink-0 bg-[#0C0C10] border-r border-white/[0.05] hidden md:flex flex-col">
        {/* Header */}
        <div className="h-14 px-4 flex items-center gap-3 border-b border-white/[0.05]">
          <button onClick={() => router.push("/admin")}
            className="w-7 h-7 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] flex items-center justify-center transition-all flex-shrink-0"
            title="Wrocz"><ArrowLeft size={15} /></button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0 shadow-[0_0_5px_rgba(52,211,153,0.7)]" />
            <span className="text-sm font-bold text-slate-200 truncate">{shop.serverName}</span>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-700 px-2 mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(({ id, Icon, label }) => (
                  <button key={id}
                    onClick={() => { setTab(id); resetProd(); resetMode(); }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all
                      ${tab===id ? "bg-blue-600 text-white shadow-sm shadow-blue-700/30" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]"}`}>
                    <Icon size={15} className="flex-shrink-0" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Plan badge */}
        <div className="p-3 border-t border-white/[0.05]">
          <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${isPro ? "bg-blue-600/10 border border-blue-500/20" : "bg-white/[0.03] border border-white/[0.05]"}`}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{plan}</span>
            {!isPro && (
              <button onClick={startProCheckout} className="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors">Ulepsz →</button>
            )}
            {isPro && <span className="text-sm">💎</span>}
          </div>
        </div>
      </aside>

      {/* ── CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-[#09090B] border-b border-white/[0.05] px-3 sm:px-7 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600 hover:text-slate-400 cursor-pointer transition-colors" onClick={() => router.push("/admin")}>ItemShop</span>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300 font-semibold">{shop.serverName}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open(`https://${shop.serverName.toLowerCase()}.pumpking.club`, "_blank")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.05] text-xs font-medium text-slate-500 hover:text-slate-300 transition-all"
            >
              <span>↗</span> Podglad
            </button>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${isPro ? "bg-blue-600/15 text-blue-400 border border-blue-500/20" : "bg-white/[0.04] text-slate-500 border border-white/[0.05]"}`}>{plan}</span>
          </div>
        </header>

        {/* ── MOBILE NAV STRIP ── */}
        <div className="md:hidden flex-shrink-0 bg-[#09090B] border-b border-white/[0.05] overflow-x-auto scrollbar-none">
          <div className="flex gap-1 px-2 py-2 w-max">
            {NAV_GROUPS.flatMap(g => g.items).map(({ id, Icon, label }) => (
              <button key={id}
                onClick={() => { setTab(id); resetProd(); resetMode(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0
                  ${tab===id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]"}`}>
                <Icon size={12} className="flex-shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-7 bg-[#09090B]">
          <div className="max-w-[1200px] mx-auto">

            {/* ── DASHBOARD ── */}
            {tab === "dashboard" && (
              <div className="space-y-6">
                <div className="flex items-end justify-between">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-100">{shop.serverName}</h1>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">Dashboard · przegląd i statystyki</p>
                  </div>
                  <button onClick={() => loadAll()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition-all border border-white/[0.05]">
                    ↺ Odswiez
                  </button>
                </div>

                {/* Onboarding */}
                {(!onboarding.modes || !onboarding.products || !onboarding.ip || !onboarding.plugin) && (
                  <div className="border border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Pierwsze kroki</p>
                      <button onClick={() => saveOnboarding({modes:true,products:true,ip:true,plugin:true})} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">Pomin</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        {key:"modes",   label:"Stwórz tryb",        done: modes.length>0||onboarding.modes,     tab:"modes"},
                        {key:"products",label:"Dodaj produkt",       done: products.length>0||onboarding.products, tab:"products"},
                        {key:"ip",      label:"Podepnij IP serwera", done: !!serverIp||onboarding.ip,            tab:"settings"},
                        {key:"plugin",  label:"Skonfiguruj plugin",  done: onboarding.plugin,                    tab:"settings"},
                      ].map(s => (
                        <div key={s.key} onClick={() => !s.done && setTab(s.tab)}
                          className={`p-4 rounded-xl border transition-all ${s.done ? "border-emerald-500/15 bg-emerald-500/5" : "border-white/[0.06] hover:border-blue-500/25 cursor-pointer hover:bg-white/[0.02]"}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black mb-3 ${s.done ? "bg-emerald-600 text-white" : "bg-blue-600/20 text-blue-400 border border-blue-500/20"}`}>
                            {s.done ? "✓" : "·"}
                          </div>
                          <p className={`text-xs font-semibold ${s.done ? "text-slate-600" : "text-slate-400"}`}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Przychod" value={`${stats.totalRevenue.toFixed(2)} PLN`} sub="laczny" color="text-emerald-400" icon="◈" />
                  <StatCard label="Zamowienia" value={stats.totalOrders} sub="wszystkie" color="text-blue-400" icon="≡" />
                  <StatCard label="Odebrane" value={stats.claimedOrders} sub={`${stats.totalOrders > 0 ? Math.round((stats.claimedOrders/stats.totalOrders)*100) : 0}%`} color="text-violet-400" icon="✓" />
                  <StatCard label="Gracze" value={stats.uniquePlayers} sub="unikalni" color="text-orange-400" icon="◉" />
                </div>

                {/* Chart + recent orders */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                  <div className={`lg:col-span-2 ${card}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Przychod — 7 dni</p>
                      <span className="text-[10px] text-slate-700 font-mono">PLN</span>
                    </div>
                    <MiniChart data={chart} />
                  </div>

                  <div className={`lg:col-span-3 ${card} p-0 overflow-hidden`}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Ostatnia sprzedaz</p>
                      <span className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        Live
                      </span>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {orders.slice(0,6).length === 0
                        ? <p className="px-6 py-10 text-center text-xs text-slate-700 font-medium">Brak zamowien</p>
                        : orders.slice(0,6).map((o, i) => (
                          <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.015] transition-colors">
                            <img src={`https://minotar.net/helm/${o.playerName}/32.png`} className="w-7 h-7 rounded-lg flex-shrink-0" alt="" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                            <span className="font-semibold text-sm text-blue-400 flex-1 truncate">{o.playerName}</span>
                            <span className="text-xs text-slate-600 italic truncate max-w-[120px]">{o.itemName}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border flex-shrink-0 ${o.claimed ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/15" : "bg-amber-500/10 text-amber-500 border-amber-500/15"}`}>
                              {o.claimed ? "Odebrano" : "Czeka"}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── MODES ── */}
            {tab === "modes" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-100">Tryby gry</h1>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">{modes.length} aktywnych trybów</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Form */}
                  <div className={`lg:col-span-2 ${card} space-y-4`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{modeId ? "Edytuj tryb" : "Nowy tryb"}</p>

                    <div className="relative rounded-xl bg-[#09090B] border border-white/[0.07] overflow-hidden h-36 flex items-center justify-center cursor-pointer group">
                      {modeImg
                        ? <><img src={modeImg} className="w-full h-full object-cover opacity-50" alt="" /><button onClick={() => setModeImg("")} className="absolute top-2.5 right-2.5 bg-red-600 text-white w-6 h-6 rounded-full text-xs z-10 flex items-center justify-center">✕</button></>
                        : <p className="text-[10px] text-slate-700 font-medium pointer-events-none">Kliknij aby dodac zdjecie</p>
                      }
                      <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], setModeImg, setModeUploading)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {modeUploading && <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}
                    </div>

                    <input type="text" placeholder="Nazwa trybu (np. Survival)" value={modeName} onChange={e => setModeName(e.target.value)} className={inp} />
                    <textarea placeholder="Krotki opis trybu..." value={modeDesc} onChange={e => setModeDesc(e.target.value)} className={`${inp} h-24 resize-none`} />

                    <div className="flex gap-3">
                      <button onClick={handleSaveMode} className={`${btn} flex-1`}>{modeId ? "Zapisz" : "Stworz tryb"}</button>
                      {modeId && <button onClick={resetMode} className={btnG}>Anuluj</button>}
                    </div>
                  </div>

                  {/* List */}
                  <div className="lg:col-span-3 space-y-3">
                    {modes.length === 0
                      ? <div className="h-48 flex flex-col items-center justify-center border border-dashed border-white/[0.06] rounded-2xl gap-2">
                          <span className="text-2xl opacity-30">◉</span>
                          <p className="text-xs text-slate-700 font-medium">Brak trybów — stwórz pierwszy po lewej</p>
                        </div>
                      : modes.map(m => (
                        <div key={m.id} className="group relative bg-[#111116] border border-white/[0.06] hover:border-white/[0.1] rounded-xl overflow-hidden flex items-center h-20 transition-all">
                          {m.imageUrl && <div className="w-20 h-full bg-cover bg-center opacity-30 flex-shrink-0" style={{backgroundImage:`url(${m.imageUrl})`}} />}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#111116]/95" />
                          <div className="relative z-10 flex-1 px-5 flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-[14px] text-blue-400">{m.name}</h4>
                              <p className="text-[11px] text-slate-600 truncate max-w-[200px] mt-0.5">{m.description}</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => { setModeId(m.id); setModeName(m.name); setModeDesc(m.description); setModeImg(m.imageUrl||""); }} className="w-8 h-8 bg-[#09090B] hover:bg-blue-600 text-slate-500 hover:text-white rounded-lg transition-all text-xs flex items-center justify-center border border-white/[0.06]">✏</button>
                              <button onClick={() => handleDeleteMode(m.id)} className="w-8 h-8 bg-[#09090B] hover:bg-red-600 text-slate-500 hover:text-white rounded-lg transition-all text-xs flex items-center justify-center border border-white/[0.06]">✕</button>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}

            {/* ── PRODUCTS ── */}
            {tab === "products" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-100">Produkty</h1>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">{products.length} opublikowanych produktow</p>
                </div>

                {/* Form */}
                <div className={`${card} space-y-5`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{prodId ? "Edytuj produkt" : "Nowy produkt"}</p>

                  <div className="relative rounded-xl bg-[#09090B] border border-white/[0.07] overflow-hidden h-32 flex items-center justify-center cursor-pointer group">
                    {prodImg
                      ? <><div className="h-24 mx-auto group-hover:scale-105 transition-transform"><img src={prodImg} className="h-full object-contain drop-shadow-xl" alt="" /></div><button onClick={() => setProdImg("")} className="absolute top-2.5 right-2.5 bg-red-600 text-white w-6 h-6 rounded-full text-xs z-10 flex items-center justify-center">✕</button></>
                      : <p className="text-[10px] text-slate-700 font-medium pointer-events-none">Kliknij aby dodac zdjecie produktu</p>
                    }
                    <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], setProdImg, setProdUploading)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {prodUploading && <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <input type="text" placeholder="Nazwa produktu" value={prodName} onChange={e => setProdName(e.target.value)} className={inp} />
                    </div>
                    <select value={prodMode} onChange={e => setProdMode(e.target.value)} className={`${inp} text-blue-400 font-semibold`}>
                      <option value="">Tryb gry...</option>
                      {modes.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input type="number" placeholder="Cena" value={prodPrice} onChange={e => setProdPrice(e.target.value)} className={`${inp} text-emerald-400 font-bold flex-1`} />
                      <input type="text" placeholder="🎁" value={prodEmoji} onChange={e => setProdEmoji(e.target.value)} className={`${inp} w-14 text-center text-lg px-2`} />
                    </div>
                  </div>
                  <textarea placeholder="Krotki opis produktu..." value={prodDesc} onChange={e => setProdDesc(e.target.value)} className={`${inp} h-20 resize-none`} />
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">Komendy serwera (jedna na linii) — zmienna: {"{player}"}</label>
                    <textarea placeholder={`give {player} diamond 1\nlp user {player} parent set vip`} value={prodCmd} onChange={e => setProdCmd(e.target.value)} className={`${mono} h-28 resize-none text-[12px]`} />
                  </div>

                  <div className="flex gap-4">
                    <button onClick={handleSaveProd} className={`${btn} flex-1`}>{prodId ? "Zapisz zmiany" : "Opublikuj produkt"}</button>
                    {prodId && <button onClick={resetProd} className={btnG}>Anuluj edycje</button>}
                  </div>
                </div>

                {/* Grid */}
                {products.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-700 font-medium mb-4 uppercase tracking-widest">Przeciagnij, aby zmienic kolejnosc</p>
                    <DraggableProducts products={products} onReorder={handleReorder}
                      onEdit={p => { setProdId(p.id); setProdName(p.name); setProdDesc(p.description); setProdEmoji(p.iconEmoji||"📦"); setProdImg(p.imageUrl||""); setProdPrice(p.price.toString()); setProdMode(p.mode||""); setProdCmd(p.commands?.join("\n")||""); window.scrollTo({top:0,behavior:"smooth"}); }}
                      onDelete={handleDeleteProd}
                    />
                  </div>
                )}
                {products.length === 0 && (
                  <div className="h-32 flex flex-col items-center justify-center border border-dashed border-white/[0.06] rounded-2xl gap-2">
                    <span className="text-2xl opacity-30">◆</span>
                    <p className="text-xs text-slate-700 font-medium">Brak produktow — dodaj pierwszy powyzej</p>
                  </div>
                )}
              </div>
            )}

            {/* ── ORDERS ── */}
            {tab === "orders" && (
              <div className="space-y-5">
                <div className="flex items-end justify-between">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-100">Historia sprzedazy</h1>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">{orders.length} zamowien lacznie</p>
                  </div>
                  <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/15 border border-emerald-600/15 text-emerald-400 text-xs font-bold uppercase tracking-widest transition-all">
                    ↓ Eksport CSV
                  </button>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 text-sm pointer-events-none">⌕</span>
                    <input type="text" placeholder="Szukaj gracza lub produktu..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                      className={`${inp} pl-10`} />
                  </div>
                  <div className="flex gap-1.5">
                    {(["all","claimed","pending"] as const).map(f => (
                      <button key={f} onClick={() => setOrderFilter(f)}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${orderFilter===f ? "bg-blue-600 text-white" : "bg-[#111116] text-slate-500 hover:text-slate-300 border border-white/[0.06]"}`}>
                        {f==="all" ? "Wszystkie" : f==="claimed" ? "✓ Odebrane" : "⌛ Oczekujace"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`${card} p-0 overflow-hidden`}>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Wyniki: {filteredOrders.length}</p>
                  </div>
                  {filteredOrders.length === 0
                    ? <p className="px-6 py-12 text-center text-xs text-slate-700 font-medium">Brak wynikow</p>
                    : <div className="divide-y divide-white/[0.04]">
                        {filteredOrders.map(o => (
                          <div key={o.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.015] transition-colors">
                            <img src={`https://minotar.net/helm/${o.playerName}/32.png`} className="w-8 h-8 rounded-lg flex-shrink-0" alt="" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                            <span className="font-semibold text-sm text-blue-400 w-32 truncate flex-shrink-0">{o.playerName}</span>
                            <span className="text-xs text-slate-600 italic flex-1 truncate">{o.itemName}</span>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase border flex-shrink-0 ${o.claimed ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" : "bg-amber-500/10 text-amber-400 border-amber-500/15"}`}>
                              {o.claimed ? "Odebrano" : "Czeka"}
                            </span>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              </div>
            )}

            {/* ── DAILY REWARD ── */}
            {tab === "rewards" && (
              <div className="max-w-xl space-y-5">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-100">Nagroda dzienna</h1>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">Gracz moze odbrac raz na 24h</p>
                </div>
                <div className={`${card} space-y-5`}>
                  <Field label="Widoczna nazwa nagrody">
                    <input type="text" placeholder="Darmowy Bonus 24h" value={rewardName} onChange={e => setRewardName(e.target.value)} className={inp} />
                  </Field>
                  <Field label={`Komenda serwera — zmienna: {player}`}>
                    <input type="text" placeholder="give {player} diamond 1" value={rewardCmd} onChange={e => setRewardCmd(e.target.value)} className={mono} />
                  </Field>
                  <button onClick={handleSaveShopSettings} className={`w-full ${btn}`}>Zapisz konfiguracje</button>
                </div>
              </div>
            )}

            {/* ── LOOTBOX ── */}
            {tab === "lootbox" && (
              <div className="max-w-3xl space-y-5">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-100">Lootbox</h1>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">Nagrody losowane wazonym algorytmem · koszt 500 pkt</p>
                </div>

                <div className={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-5">Dodaj nagrode</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <input type="text" value={lootName} onChange={e => setLootName(e.target.value)} placeholder="Nazwa nagrody" className={inp} />
                    <div className="md:col-span-2">
                      <input type="text" value={lootCmd} onChange={e => setLootCmd(e.target.value)} placeholder={`give {player} diamond 5`} className={mono} />
                    </div>
                    <div className="flex gap-2 items-center">
                      <input type="number" min="1" value={lootWeight} onChange={e => setLootWeight(e.target.value)} placeholder="Waga" className={`${inp} flex-1`} />
                      <button onClick={handleAddLoot} className={`${btn} flex-shrink-0`}>+</button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {lootbox.length === 0
                    ? <div className={`${card} text-center py-8`}>
                        <span className="text-2xl opacity-20 block mb-2">⊞</span>
                        <p className="text-xs text-slate-700 font-medium">Brak nagrod w puli. Gracze otrzymaja nagrody domyslne.</p>
                      </div>
                    : lootbox.map(r => (
                      <div key={r.id} className={`${card} flex items-center gap-5 p-4`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[14px] text-slate-200">{r.name}</p>
                          <p className="text-[11px] text-slate-600 font-mono mt-0.5 truncate">{r.command}</p>
                        </div>
                        <span className="bg-orange-500/10 text-orange-400 border border-orange-500/15 px-3 py-1 rounded-xl text-[10px] font-bold uppercase flex-shrink-0">
                          Waga {r.weight}
                        </span>
                        <button onClick={() => handleDeleteLoot(r.id)} className="w-8 h-8 bg-[#09090B] hover:bg-red-600 text-slate-600 hover:text-white rounded-lg transition-all text-xs flex items-center justify-center border border-white/[0.06] flex-shrink-0">✕</button>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* ── PROMO KODY ── */}
            {tab === "promo" && (
              <div className="max-w-2xl space-y-5">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-100">Kody promocyjne</h1>
                  <p className="text-xs text-slate-600 mt-1">Gracze wpisują kod przy zakupie, aby otrzymać zniżkę.</p>
                </div>

                {/* Formularz */}
                <div className={`${card} space-y-4`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Nowy kod</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-600 uppercase font-bold tracking-widest block mb-1.5">Kod</label>
                      <input className={inp} placeholder="PROMO20" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} maxLength={30} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 uppercase font-bold tracking-widest block mb-1.5">Zniżka (%)</label>
                      <input className={inp} type="number" min="1" max="100" placeholder="10" value={promoDiscount} onChange={e => setPromoDiscount(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 uppercase font-bold tracking-widest block mb-1.5">Limit użyć (opcja)</label>
                      <input className={inp} type="number" min="1" placeholder="bez limitu" value={promoMaxUses} onChange={e => setPromoMaxUses(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 uppercase font-bold tracking-widest block mb-1.5">Wygasa (opcja)</label>
                      <input className={inp} type="datetime-local" value={promoExpiresAt} onChange={e => setPromoExpiresAt(e.target.value)} />
                    </div>
                  </div>
                  <button className={`${btn} w-full`} onClick={async () => {
                    if (!promoCode.trim()) { toast("Wpisz kod.", "error"); return; }
                    const disc = parseInt(promoDiscount);
                    if (isNaN(disc) || disc < 1 || disc > 100) { toast("Zniżka musi być 1–100%.", "error"); return; }
                    const body: Record<string, unknown> = { code: promoCode, discountPercent: disc };
                    if (promoMaxUses) body.maxUses = parseInt(promoMaxUses);
                    if (promoExpiresAt) body.expiresAt = promoExpiresAt;
                    const r = await fetch("/api/admin/kod-promo", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-API-Key": apiKey },
                      body: JSON.stringify(body)
                    });
                    if (r.ok) { toast("Kod dodany!"); setPromoCode(""); setPromoDiscount("10"); setPromoMaxUses(""); setPromoExpiresAt(""); fetchPromoCodes(apiKey, token!); }
                    else { toast(await r.text() || "Blad.", "error"); }
                  }}>
                    <Plus size={14} /> Dodaj kod
                  </button>
                </div>

                {/* Lista kodów */}
                <div className="space-y-2">
                  {promoCodes.length === 0
                    ? <div className={`${card} text-center py-8`}>
                        <span className="text-2xl opacity-20 block mb-2">🏷️</span>
                        <p className="text-xs text-slate-700 font-medium">Brak kodów promocyjnych. Dodaj pierwszy powyżej.</p>
                      </div>
                    : promoCodes.map(pc => (
                      <div key={pc.id} className={`${card} flex items-center gap-4 p-4`}>
                        <code className="bg-black/40 text-[#bbf028] font-mono font-bold text-sm px-3 py-1.5 rounded-lg border border-[#bbf028]/20 flex-shrink-0">
                          {pc.code}
                        </code>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded-lg text-[10px] font-bold">-{pc.discountPercent}%</span>
                            <span className="text-[10px] text-slate-600">{pc.currentUses}{pc.maxUses ? `/${pc.maxUses}` : ""} użyć</span>
                            {pc.expiresAt && <span className="text-[10px] text-slate-600">Wygasa: {new Date(pc.expiresAt).toLocaleDateString("pl-PL")}</span>}
                          </div>
                        </div>
                        <button onClick={async () => {
                          const r = await fetch(`/api/admin/kod-promo/${pc.id}/toggle`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "X-API-Key": apiKey } });
                          if (r.ok) fetchPromoCodes(apiKey, token!);
                        }} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex-shrink-0 ${pc.active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20" : "bg-white/[0.03] text-slate-600 border-white/[0.06] hover:bg-emerald-500/10 hover:text-emerald-400"}`}>
                          {pc.active ? <><ToggleRight size={12} /> ON</> : <><ToggleLeft size={12} /> OFF</>}
                        </button>
                        <button onClick={() => setConfirm({ open: true, message: `Usunąć kod ${pc.code}?`, onConfirm: async () => {
                          const r = await fetch(`/api/admin/kod-promo/${pc.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "X-API-Key": apiKey } });
                          if (r.ok) { toast("Kod usuniety."); fetchPromoCodes(apiKey, token!); }
                        }})} className="w-8 h-8 bg-[#09090B] hover:bg-red-600 text-slate-600 hover:text-white rounded-lg transition-all text-xs flex items-center justify-center border border-white/[0.06] flex-shrink-0">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* ── SETTINGS ── */}
            {tab === "settings" && (
              <div className="max-w-2xl space-y-5">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-100">Ustawienia sklepu</h1>
                </div>

                {/* Server IP */}
                <div className={`${card} space-y-4`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Adres serwera Minecraft</p>
                  <div className="flex gap-3">
                    <input type="text" placeholder="play.serwer.pl lub 192.168.1.1" value={serverIp} onChange={e => setServerIp(e.target.value)} className={`${inp} flex-1`} />
                    <button onClick={handleSaveIp} className={btn}>Zapisz</button>
                  </div>
                </div>

                {/* Custom domain */}
                <div className={`${card} space-y-4`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Wlasna domena</p>
                    {!isPro && <span className="text-[10px] bg-blue-600/10 text-blue-400 border border-blue-500/15 px-2.5 py-1 rounded-lg font-bold">Tylko PRO</span>}
                  </div>
                  <div className="flex gap-3">
                    <input type="text" placeholder="sklep.mcsurv.pl" value={customDomain} onChange={e => { setCustomDomain(e.target.value); setDomainError(null); }} disabled={!isPro} className={`${inp} flex-1 disabled:opacity-30`} />
                    <button onClick={handleSaveDomain} disabled={!isPro || verifyingDomain} className={`${btn} disabled:opacity-30`}>
                      {verifyingDomain ? "Weryfikacja..." : "Ustaw"}
                    </button>
                  </div>
                  {domainError && <p className="text-xs text-red-400 font-medium">{domainError}</p>}
                  {isPro && (
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Dodaj rekord CNAME: <code className="text-blue-400 bg-blue-500/8 px-1.5 py-0.5 rounded font-mono">shops.pumpking.club</code> w DNS swojej domeny, nastepnie wpisz domene powyzej.
                    </p>
                  )}
                </div>

                {/* Motyw */}
                <div className={`${card} space-y-4`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Motyw sklepu</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: "default", label: "Default", free: true },
                      { id: "dark",    label: "Dark",    free: false },
                      { id: "forest",  label: "Forest",  free: false },
                      { id: "ocean",   label: "Ocean",   free: false },
                    ].map(t => (
                      <button key={t.id} onClick={() => handleSaveTheme(t.id)}
                        disabled={plan === "FREE" && !t.free}
                        className={`py-3 rounded-xl text-sm font-semibold border transition-all flex flex-col items-center gap-1.5 disabled:opacity-30 ${theme===t.id ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-700/20" : "bg-white/[0.03] border-white/[0.07] hover:border-white/[0.13] text-slate-400"}`}>
                        <span className="text-base">{t.id === "default" ? "◎" : t.id === "dark" ? "◉" : t.id === "forest" ? "◈" : "◆"}</span>
                        <span className="text-[11px]">{t.label}</span>
                        {!t.free && <span className="text-[8px] text-violet-400/60 font-bold uppercase">STARTER+</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discord & Banner */}
                <div className={`${card} space-y-4`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Tresci sklepu</p>
                  <Field label="Link do Discorda">
                    <input type="text" placeholder="https://discord.gg/..." value={discordLink} onChange={e => setDiscordLink(e.target.value)} className={inp} />
                  </Field>
                  <Field label="Tekst bannera">
                    <input type="text" placeholder="DOLACZ DO SWIATA..." value={bannerText} onChange={e => setBannerText(e.target.value)} className={inp} />
                  </Field>
                  <button onClick={handleSaveShopSettings} className={`w-full ${btn}`}>Zapisz ustawienia</button>
                </div>

                {/* Regulamin */}
                <div className={`${card} space-y-4`}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Regulamin sklepu</p>
                    <p className="text-[10px] text-slate-700 mt-1">Wyswietlany na stronie /regulamin. Jezeli puste — pokazuje szablon domyslny.</p>
                  </div>
                  <textarea
                    value={termsContent}
                    onChange={e => setTermsContent(e.target.value)}
                    placeholder={"§1. Postanowienia Ogólne\nNiniejszy regulamin...\n\n§2. Zasady Rozgrywki\n..."}
                    rows={12}
                    className={`${inp} w-full font-mono text-xs leading-relaxed resize-y min-h-[200px]`}
                  />
                  <button onClick={handleSaveShopSettings} className={`w-full ${btn}`}>Zapisz regulamin</button>
                </div>
              </div>
            )}

            {/* ── SECURITY ── */}
            {tab === "security" && (
              <div className="max-w-xl space-y-5">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-100">Klucz API</h1>
                </div>

                {/* API Key */}
                <div className={`${card} space-y-4`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Klucz API — Plugin Minecraft</p>
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#09090B] border border-blue-500/15 rounded-xl">
                    <code className="text-[11px] text-blue-400 font-mono flex-1 truncate select-all">{apiKey}</code>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={copyApiKey} className={`${btnG} ${apiKeyCopied ? "text-emerald-400 border-emerald-500/20" : ""}`}>
                      {apiKeyCopied ? "✓ Skopiowano" : "Kopiuj klucz"}
                    </button>
                    <button onClick={handleDownloadConfig} className={btnG}>Pobierz config.yml</button>
                  </div>
                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                      Wklej klucz do pliku <code className="text-blue-400 font-mono">config.yml</code> pluginu, nastepnie zrestartuj serwer. Plugin automatycznie polaczy sie z Twoim sklepem.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── BILLING ── */}
            {tab === "billing" && (
              <div className="max-w-2xl space-y-5">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-100">Plan i subskrypcja</h1>
                </div>

                {/* Aktywny plan badge */}
                {(() => {
                  const planLabel = plan === "PRO" ? "PRO" : plan === "STARTER" ? "STARTER" : "Free";
                  const planColor = plan === "PRO" ? "text-blue-400 border-blue-500/20" : plan === "STARTER" ? "text-violet-400 border-violet-500/20" : "text-slate-300 border-white/[0.06]";
                  const planIcon  = plan === "PRO" ? "💎" : plan === "STARTER" ? "⚡" : "🆓";
                  return (
                    <div className={`${card} flex items-center justify-between ${planColor}`}>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1.5">Aktywny plan</p>
                        <h2 className={`text-3xl font-black ${planColor.split(" ")[0]}`}>{planLabel}</h2>
                        {subscriptionExpiresAt && (
                          <p className="text-[10px] text-slate-600 mt-1">Wygasa: {new Date(subscriptionExpiresAt).toLocaleDateString("pl-PL")}</p>
                        )}
                      </div>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-white/[0.03] border ${planColor.split(" ")[1]}`}>{planIcon}</div>
                    </div>
                  );
                })()}

                {/* 3 plany */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* FREE */}
                  <div className={`${card} ${plan !== "FREE" ? "opacity-40" : ""}`}>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-1">Free</p>
                    <h3 className="text-xl font-black text-slate-300 mb-1">0 PLN</h3>
                    <p className="text-[10px] text-slate-600 mb-5">zawsze</p>
                    <ul className="space-y-2 text-xs text-slate-500 mb-6">
                      {[{ok:true,t:"1 sklep"},{ok:true,t:"1 tryb gry"},{ok:true,t:"Motyw domyslny"},{ok:false,t:"Motywy premium"},{ok:false,t:"Wlasna domena"}].map(({ok,t}) => (
                        <li key={t} className={`flex items-center gap-2 ${!ok?"opacity-40":""}`}>
                          <span className="w-3.5 h-3.5 rounded-full bg-slate-800 flex items-center justify-center text-[7px] flex-shrink-0">{ok?"✓":"✕"}</span>{t}
                        </li>
                      ))}
                    </ul>
                    <div className="py-2 rounded-xl border border-white/5 text-center text-[10px] font-bold uppercase text-slate-600">{plan === "FREE" ? "Aktywny" : "—"}</div>
                  </div>

                  {/* STARTER */}
                  <div className={`${card} relative overflow-hidden transition-all border-violet-500/20 ${plan === "STARTER" ? "" : "hover:border-violet-500/40 cursor-pointer"}`}
                    onClick={() => plan === "FREE" && startStarterCheckout()}>
                    {plan === "FREE" && <div className="absolute top-0 right-0 bg-violet-600 text-[7px] font-black px-2.5 py-1.5 rounded-bl-xl uppercase tracking-wider">Popularny</div>}
                    <p className="text-[10px] text-violet-400/60 font-bold uppercase tracking-widest mb-1">Starter</p>
                    <h3 className="text-xl font-black text-violet-400 mb-1">9,99 PLN</h3>
                    <p className="text-[10px] text-slate-600 mb-5">/ miesiac</p>
                    <ul className="space-y-2 text-xs text-violet-200/60 mb-6">
                      {["1 sklep","5 trybow gry","Motywy dark/forest/ocean","Edytor regulaminu"].map(f => (
                        <li key={f} className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full bg-violet-600/20 flex items-center justify-center text-[7px] text-violet-400 flex-shrink-0">✓</span>{f}
                        </li>
                      ))}
                      {["Wlasna domena","Motyw RPG/Retro"].map(f => (
                        <li key={f} className="flex items-center gap-2 opacity-40">
                          <span className="w-3.5 h-3.5 rounded-full bg-slate-800 flex items-center justify-center text-[7px] flex-shrink-0">✕</span>{f}
                        </li>
                      ))}
                    </ul>
                    {plan === "STARTER"
                      ? <div className="py-2 rounded-xl border border-violet-500/20 bg-violet-500/5 text-center text-[10px] font-bold uppercase text-violet-400">⚡ Aktywny</div>
                      : plan === "FREE"
                        ? <div className="py-2 rounded-xl bg-violet-600 hover:bg-violet-500 transition-all text-center text-[10px] font-bold uppercase text-white">Wybierz →</div>
                        : <div className="py-2 rounded-xl border border-white/5 text-center text-[10px] font-bold uppercase text-slate-600">—</div>
                    }
                  </div>

                  {/* PRO */}
                  <div className={`${card} relative overflow-hidden transition-all border-blue-500/20 ${isPro ? "" : "hover:border-blue-500/40 cursor-pointer"}`}
                    onClick={() => !isPro && startProCheckout()}>
                    {!isPro && <div className="absolute top-0 right-0 bg-blue-600 text-[7px] font-black px-2.5 py-1.5 rounded-bl-xl uppercase tracking-wider">Pelny dostep</div>}
                    <p className="text-[10px] text-blue-500/50 font-bold uppercase tracking-widest mb-1">Pro</p>
                    <h3 className="text-xl font-black text-blue-400 mb-1">29,99 PLN</h3>
                    <p className="text-[10px] text-slate-600 mb-5">/ miesiac</p>
                    <ul className="space-y-2 text-xs text-blue-200/60 mb-6">
                      {["Nielimitowane sklepy","Nielimitowane tryby","Wszystkie motywy","Wlasna domena","Priorytetowy support"].map(f => (
                        <li key={f} className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full bg-blue-600/20 flex items-center justify-center text-[7px] text-blue-400 flex-shrink-0">✓</span>{f}
                        </li>
                      ))}
                    </ul>
                    {isPro
                      ? <div className="py-2 rounded-xl border border-blue-500/20 bg-blue-500/5 text-center text-[10px] font-bold uppercase text-blue-400">💎 Aktywny</div>
                      : <div className="py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-center text-[10px] font-bold uppercase text-white">29,99 PLN →</div>
                    }
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}