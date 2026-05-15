"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

// ─── ANIMATED COUNTER ────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = to / 60;
      const timer = setInterval(() => {
        start += step;
        if (start >= to) { setVal(to); clearInterval(timer); }
        else setVal(Math.floor(start));
      }, 16);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString("pl")}{suffix}</span>;
}

// ─── MARQUEE ─────────────────────────────────────────────────────────────────
function Marquee({ items }: { items: string[] }) {
  return (
    <div className="overflow-hidden whitespace-nowrap border-y border-white/5 py-5 bg-[#0C0E18]">
      <div className="inline-flex gap-0 animate-[marquee_20s_linear_infinite]">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-700 px-10">
            {item} <span className="text-blue-600 mx-4">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

import { useLiveStats } from "@/hooks/useLiveStats";

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ZiutekShopLanding() {
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const stats = useLiveStats();

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    const onMouse = (e: MouseEvent) => setMousePos({
      x: (e.clientX / window.innerWidth - 0.5) * 30,
      y: (e.clientY / window.innerHeight - 0.5) * 30,
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("mousemove", onMouse); };
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const t = setInterval(() => setActiveFeature(p => (p + 1) % features.length), 3000);
    return () => clearInterval(t);
  }, []);

  const navScrolled = scrollY > 40;

  const features = [
    { icon: "⚡", title: "Instalacja w 10 sekund", desc: "Kopiujesz klucz API, wklejasz do config.yml i plugin łączy się automatycznie. Zero konfiguracji bazy danych.", color: "from-yellow-500/20 to-transparent" },
    { icon: "🎨", title: "4 motywy Premium", desc: "Default, Cyberpunk, RPG, Space — każdy z własnym klimatem. Twoi gracze pomyślą że wydałeś tysiące na design.", color: "from-blue-500/20 to-transparent" },
    { icon: "🛡️", title: "Bezpieczeństwo JWT", desc: "Każde żądanie weryfikowane kryptograficznie. Klucze API per-sklep. Webhook Stripe z podpisem.", color: "from-green-500/20 to-transparent" },
    { icon: "📊", title: "Dashboard w czasie rzeczywistym", desc: "Wykres przychodów, live zamówienia, statystyki graczy — wszystko na jednym ekranie.", color: "from-purple-500/20 to-transparent" },
    { icon: "🎁", title: "System nagród dziennych", desc: "Gracz wraca co 24h po bonus. Per-tryb, z live timerem. Twój serwer zawsze aktywny.", color: "from-orange-500/20 to-transparent" },
    { icon: "💳", title: "BLIK i Karta przez Stripe", desc: "Płatności trafiają prosto do Ciebie. Ziutek nie bierze prowizji od transakcji.", color: "from-red-500/20 to-transparent" },
  ];

  const steps = [
    { num: "01", title: "Zarejestruj konto", desc: "30 sekund. Email + hasło. Natychmiast dostajesz sklep FREE z pełnymi funkcjami.", icon: "✦" },
    { num: "02", title: "Dodaj tryby i produkty", desc: "Panel admina. Drag & drop kolejność. Upload zdjęć. VIP, rangi, klucze — co tylko chcesz.", icon: "✦" },
    { num: "03", title: "Wklej klucz do pluginu", desc: "config.yml → api-key: 'sk_twój_klucz'. Plugin pobiera zamówienia automatycznie co minutę.", icon: "✦" },
    { num: "04", title: "Zarabiaj", desc: "Gracz kupuje → Stripe wysyła kasę → plugin wykonuje komendę. Ty nic nie robisz.", icon: "✦" },
  ];

  const pricing = [
    {
      name: "Start",
      badge: "FREE",
      price: "0",
      period: "zawsze",
      desc: "Zacznij bez ryzyka",
      features: ["1 instancja sklepu", "1 tryb gry", "Motyw Osadnik", "Nielimitowane produkty", "Plugin MC", "Support Discord"],
      locked: ["Własna domena", "Motywy Premium", "Priorytetowy support"],
      cta: "Zacznij za darmo",
      highlight: false,
    },
    {
      name: "Pro",
      badge: "HOT 🔥",
      price: "29.99",
      period: "30 dni",
      desc: "Dla poważnych serwerów",
      features: ["Nielimitowane instancje", "Nielimitowane tryby", "Wszystkie 4 motywy", "Własna domena .pl", "Priorytetowy support VIP", "Eksport CSV", "Drag & drop produktów"],
      locked: [],
      cta: "Aktywuj Pro",
      highlight: true,
    },
    {
      name: "Roczny",
      badge: "2 miesiące gratis",
      price: "299.99",
      period: "rok",
      desc: "Maksymalna oszczędność",
      features: ["Wszystko z Pro", "2 miesiące gratis", "Dedykowany support", "Early access nowych funkcji"],
      locked: [],
      cta: "Wybieram roczny",
      highlight: false,
    },
  ];

  const faq = [
    { q: "Czy Ziutek bierze prowizję od sprzedaży?", a: "Nie. Płacisz tylko za subskrypcję platformy. Każda złotówka od gracza trafia bezpośrednio do Ciebie przez Stripe." },
    { q: "Jak szybko zamówienie trafia do gracza?", a: "Plugin sprawdza nowe zamówienia co 60 sekund (konfigurowalne). Po zakupie gracz dostaje przedmiot w ciągu minuty po wejściu na serwer." },
    { q: "Czy muszę mieć VPS do hostowania sklepu?", a: "Nie. Strona sklepu jest hostowana przez nas. Twój VPS potrzebuje tylko pluginu — nic więcej." },
    { q: "Co jeśli gracz nie ma miejsca w ekwipunku?", a: "Zamówienie czeka w magazynie (/magazyn). Gracz może odebrać je kiedy chce, nawet po tygodniu." },
    { q: "Czy mogę mieć kilka trybów (Survival, BoxPVP, Skyblock)?", a: "Tak. W planie Pro możesz tworzyć nielimitowane tryby. Każdy ma własne produkty i nagrody dzienne." },
    { q: "Jak działa zmiana motywu?", a: "W panelu admina → Ustawienia → Motyw. Zmiana jest natychmiastowa. Motywy Cyber, RPG i Space wymagają planu Pro." },
  ];

  return (
    <main className="bg-[#08090F] text-white overflow-x-hidden" style={{ fontFamily: "'system-ui', sans-serif" }}>

      {/* ── STYLE INJECTION ── */}
      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes float { 0%,100% { transform: translateY(0px) rotate(0deg) } 50% { transform: translateY(-16px) rotate(2deg) } }
        @keyframes glow-pulse { 0%,100% { opacity: 0.4 } 50% { opacity: 0.8 } }
        @keyframes scan { 0% { transform: translateY(-100%) } 100% { transform: translateY(100vh) } }
        .float { animation: float 6s ease-in-out infinite; }
        .glow-pulse { animation: glow-pulse 3s ease-in-out infinite; }
        .grid-bg { background-image: linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px); background-size: 60px 60px; }
        .noise::after { content: ''; position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"); pointer-events: none; }
        .text-stroke { -webkit-text-stroke: 1px rgba(255,255,255,0.15); color: transparent; }
        .card-hover { transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), border-color 0.3s; }
        .card-hover:hover { transform: translateY(-6px) scale(1.01); }
      `}</style>

      {/* ── CURSOR GLOW ── */}
      <div className="fixed w-96 h-96 rounded-full pointer-events-none z-0 transition-all duration-700 ease-out"
        style={{ background: "radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)", left: `calc(${mousePos.x * 3 + 50}% - 12rem)`, top: `calc(${mousePos.y * 3 + 50}% - 12rem)` }} />

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-500 ${navScrolled ? "bg-[#08090F]/90 backdrop-blur-xl border-b border-white/[0.06] py-4 shadow-2xl" : "bg-transparent py-8"}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-lg font-black italic shadow-lg shadow-blue-600/30 group-hover:rotate-12 group-hover:scale-110 transition-all">Z</div>
            <span className="text-lg font-black italic uppercase tracking-tighter">Ziutek<span className="text-blue-500">Shop</span></span>
          </Link>

          <div className="hidden lg:flex items-center gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
            {[["#o-systemie", "O systemie"], ["#jak-dziala", "Jak działa"], ["#cennik", "Cennik"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="hover:text-white transition-colors relative group">
                {label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-blue-500 transition-all group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin">
              <button className="hidden sm:block px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                Panel Admina
              </button>
            </Link>
            <Link href="/admin">
              <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 active:translate-y-0">
                Zacznij za darmo
              </button>
            </Link>
            <button className="lg:hidden w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden bg-[#0C0E18] border-t border-white/5 px-6 py-6 space-y-4">
            {[["#o-systemie", "O systemie"], ["#jak-dziala", "Jak działa"], ["#cennik", "Cennik"], ["#faq", "FAQ"], ["/admin", "Panel Admina"]].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-white py-2 transition-colors">{label}</a>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-32 pb-20 px-6 grid-bg noise overflow-hidden">
        {/* BG blobs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[140px] glow-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-800/6 rounded-full blur-[120px] pointer-events-none" />

        {/* Floating decorative elements */}
        <div className="absolute top-32 right-[8%] float opacity-20 pointer-events-none select-none text-[120px]">⛏️</div>
        <div className="absolute bottom-32 left-[5%] float opacity-10 pointer-events-none select-none text-[80px]" style={{ animationDelay: "2s" }}>💎</div>
        <div className="absolute top-1/2 right-[3%] float opacity-10 pointer-events-none select-none text-[60px]" style={{ animationDelay: "1s" }}>🗡️</div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="max-w-5xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-3 bg-blue-600/10 border border-blue-500/20 px-5 py-2 rounded-full mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,1)] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-300">
                {stats.loaded ? `${stats.shops}+ aktywnych sklepów` : "Platforma aktywna"} — Dołącz za darmo
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(56px,9vw,130px)] font-black uppercase italic leading-[0.85] tracking-tighter mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              Sklep dla<br />
              <span className="relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600">Twoich</span>
              </span>
              <br />
              <span className="text-white/10 text-stroke">Graczy</span>
            </h1>

            <p className="text-gray-400 text-xl max-w-2xl mb-12 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
              Wrzuć plugin, skonfiguruj w 10 minut i zacznij zarabiać. Żadnych prowizji, żadnego VPS, żadnego bólu głowy. Tylko <span className="text-white font-bold">Twoje pieniądze</span>, Twoi gracze.
            </p>

            {/* CTA */}
            <div className="flex flex-wrap gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
              <Link href="/admin">
                <button className="group relative px-10 py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase text-sm tracking-widest transition-all shadow-[0_20px_40px_rgba(37,99,235,0.25)] hover:shadow-[0_20px_60px_rgba(37,99,235,0.4)] hover:-translate-y-1 active:translate-y-0 overflow-hidden">
                  <span className="relative z-10">Stwórz sklep za darmo →</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                </button>
              </Link>
              <Link href="/demo">
                <button className="px-10 py-5 rounded-2xl border border-white/10 font-black uppercase text-sm tracking-widest hover:bg-white/5 hover:border-white/20 transition-all group">
                  <span className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Demo na żywo
                  </span>
                </button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex flex-wrap items-center gap-8 mt-16 pt-10 border-t border-white/[0.06] animate-in fade-in duration-700 delay-500">
              {[
                { val: stats.shops, suffix: "+", label: "aktywnych sklepów" },
                { val: stats.orders, suffix: "+", label: "zrealizowanych zamówień" },
                { val: Math.floor(stats.revenue / 1000), suffix: "k+ PLN", label: "przez platformę" },
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-3xl font-black tracking-tight text-white">
                    {stats.loaded ? <Counter to={s.val} suffix={s.suffix} /> : "—"}
                  </p>
                  <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 animate-bounce">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-blue-500" />
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Scroll</p>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <Marquee items={["ZiutekShop", "Survival", "BoxPVP", "SkyBlock", "OneBlock", "RPG", "Factions", "Bedwars", "Creative", "Minigames"]} />

      {/* ── FEATURES ── */}
      <section id="o-systemie" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-4">Platforma</p>
            <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter">
              Wszystko czego<br />
              <span className="text-white/10 text-stroke">potrzebujesz</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Big feature card */}
            <div className={`lg:row-span-2 bg-gradient-to-br ${features[activeFeature].color} to-[#0C0E18] border border-white/[0.06] rounded-[40px] p-12 flex flex-col justify-between min-h-[400px] transition-all duration-500 relative overflow-hidden`}>
              <div className="absolute top-0 right-0 text-[200px] opacity-[0.03] pointer-events-none select-none leading-none">{features[activeFeature].icon}</div>
              <div>
                <div className="text-5xl mb-8">{features[activeFeature].icon}</div>
                <h3 className="text-3xl font-black uppercase italic tracking-tight mb-4">{features[activeFeature].title}</h3>
                <p className="text-gray-400 leading-relaxed text-lg">{features[activeFeature].desc}</p>
              </div>
              <div className="flex gap-2 mt-8">
                {features.map((_, i) => (
                  <button key={i} onClick={() => setActiveFeature(i)} className={`h-1.5 rounded-full transition-all ${i === activeFeature ? "bg-blue-500 w-8" : "bg-white/10 w-1.5"}`} />
                ))}
              </div>
            </div>

            {/* Small feature cards */}
            {features.filter((_, i) => i !== activeFeature).slice(0, 4).map((f, i) => (
              <div key={i} onClick={() => setActiveFeature(features.indexOf(f))}
                className="bg-[#0C0E18] border border-white/[0.06] rounded-[28px] p-8 flex items-start gap-6 cursor-pointer card-hover hover:border-blue-500/20 group">
                <div className="text-3xl flex-shrink-0 group-hover:scale-110 transition-transform">{f.icon}</div>
                <div>
                  <h4 className="font-black uppercase italic tracking-tight mb-2 text-lg">{f.title}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="jak-dziala" className="py-32 px-6 bg-[#0C0E18] border-y border-white/[0.04] relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-4">Instalacja</p>
            <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter">
              10 minut do<br /><span className="text-blue-500">pierwszej sprzedaży</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="relative group">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-blue-500/30 to-transparent z-10 -translate-y-1/2" />
                )}
                <div className="bg-[#08090F] border border-white/[0.06] rounded-[28px] p-8 card-hover hover:border-blue-500/20 h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center">
                      <span className="text-[11px] font-black text-blue-400 tracking-widest">{s.num}</span>
                    </div>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <h3 className="text-xl font-black uppercase italic tracking-tight mb-3">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Code snippet */}
          <div className="mt-16 bg-[#08090F] border border-white/[0.06] rounded-[28px] p-8 font-mono text-sm overflow-x-auto">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="text-gray-600 text-[10px] uppercase tracking-widest ml-4">config.yml</span>
            </div>
            <div className="space-y-2">
              <p><span className="text-gray-600"># ZiutekShop Plugin Config</span></p>
              <p><span className="text-blue-400">server-name</span><span className="text-gray-400">: </span><span className="text-green-400">"TwójSerwer"</span></p>
              <p><span className="text-blue-400">api-key</span><span className="text-gray-400">: </span><span className="text-orange-400">"sk_<span className="animate-pulse">••••••••••••••••••••</span>"</span></p>
              <p><span className="text-blue-400">api-url</span><span className="text-gray-400">: </span><span className="text-green-400">"https://api.ziutekshop.pl"</span></p>
              <p><span className="text-blue-400">check-interval</span><span className="text-gray-400">: </span><span className="text-purple-400">60</span><span className="text-gray-600"> # sekundy</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* ── THEMES SHOWCASE ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-4">Motywy</p>
            <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-6">
              Twój sklep,<br />Twój styl
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">Każdy motyw jest kompletnym doświadczeniem — inne fonty, kolory, układy. Zmiana w jednym kliknięciu.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Osadnik", badge: "FREE", color: "#bbf028", bg: "#111", desc: "Neon na czerni. Klasyk.", emoji: "🌿" },
              { name: "Cyberpunk", badge: "PRO", color: "#e879f9", bg: "#090014", desc: "Fuksjowy chaos przyszłości.", emoji: "🤖" },
              { name: "RPG Fantasy", badge: "PRO", color: "#f59e0b", bg: "#1a120b", desc: "Mroczne fantasy. Klimat.", emoji: "⚔️" },
              { name: "Space", badge: "PRO", color: "#22d3ee", bg: "#020b18", desc: "Retrofuturyzm. Pikselowy.", emoji: "🚀" },
            ].map((t, i) => (
              <div key={i} className="group cursor-pointer card-hover relative overflow-hidden rounded-[28px] border border-white/[0.06] hover:border-white/20"
                style={{ background: t.bg, minHeight: "280px" }}>
                <div className="absolute inset-0 flex items-center justify-center text-[100px] opacity-10 group-hover:opacity-20 transition-opacity select-none">{t.emoji}</div>
                <div className="relative z-10 p-8 h-full flex flex-col justify-between" style={{ minHeight: "280px" }}>
                  <div>
                    <span className={`text-[8px] font-black px-3 py-1 rounded-full border mb-4 inline-block ${t.badge === "FREE" ? "border-gray-700 text-gray-500" : "border-blue-500/30 text-blue-400 bg-blue-600/10"}`}>{t.badge}</span>
                    <h4 className="text-2xl font-black uppercase italic mb-2" style={{ color: t.color }}>{t.name}</h4>
                    <p className="text-gray-600 text-xs font-bold">{t.desc}</p>
                  </div>
                  <div className="h-1.5 rounded-full mt-6 w-0 group-hover:w-full transition-all duration-500" style={{ background: t.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BANNER ── */}
      <section className="py-20 px-6 bg-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-500 opacity-50" />
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
            {[
              { val: stats.shops, suffix: "+", label: "Aktywnych sklepów" },
              { val: stats.orders, suffix: "+", label: "Zrealizowanych zamówień" },
              { val: 4, suffix: "", label: "Motywy Premium" },
              { val: 99, suffix: ".9%", label: "Uptime platformy" },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-4xl md:text-5xl font-black tracking-tighter mb-2">
                  {stats.loaded ? <Counter to={s.val} suffix={s.suffix} /> : `—${s.suffix}`}
                </p>
                <p className="text-blue-200/70 text-[10px] font-black uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="cennik" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-4">Cennik</p>
            <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-6">
              Ile za ten<br /><span className="text-blue-500">luksus?</span>
            </h2>
            <p className="text-gray-500">Płacisz tylko za czas. Reszta jest nielimitowana.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricing.map((p, i) => (
              <div key={i} className={`relative rounded-[36px] p-px transition-all duration-300 hover:scale-[1.02] ${p.highlight ? "bg-gradient-to-b from-blue-500 to-blue-700 shadow-[0_30px_80px_rgba(37,99,235,0.3)]" : "bg-white/[0.06]"}`}>
                <div className={`rounded-[34px] p-8 h-full flex flex-col ${p.highlight ? "bg-blue-950" : "bg-[#0C0E18]"}`}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-1">{p.name}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black tracking-tighter">{p.price}</span>
                        <span className="text-xs text-gray-500 font-bold uppercase">PLN / {p.period}</span>
                      </div>
                    </div>
                    <span className={`text-[8px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider ${p.highlight ? "bg-blue-500 text-white" : "bg-white/5 text-gray-400 border border-white/10"}`}>{p.badge}</span>
                  </div>

                  <p className="text-gray-500 text-xs mb-6 font-medium">{p.desc}</p>

                  <ul className="space-y-3 mb-8 flex-1">
                    {p.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3 text-[11px] font-bold text-gray-300">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] flex-shrink-0 ${p.highlight ? "bg-blue-500" : "bg-green-600/30 text-green-400"}`}>✓</span>
                        {f}
                      </li>
                    ))}
                    {p.locked.map((f, j) => (
                      <li key={j} className="flex items-center gap-3 text-[11px] font-bold text-gray-700 line-through">
                        <span className="w-4 h-4 rounded-full bg-gray-800 flex items-center justify-center text-[8px] flex-shrink-0 text-gray-600">✕</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href="/admin">
                    <button className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${p.highlight ? "bg-white text-blue-700 hover:bg-blue-50" : "bg-white/5 hover:bg-white hover:text-black border border-white/10"}`}>
                      {p.cta} →
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-600 text-[10px] font-black uppercase tracking-widest mt-10">
            Brak prowizji od transakcji · Stripe BLIK i Karta · Anuluj kiedy chcesz
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-32 px-6 bg-[#0C0E18] border-y border-white/[0.04]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-4">FAQ</p>
            <h2 className="text-5xl font-black uppercase italic tracking-tighter">Pytania?</h2>
          </div>

          <div className="space-y-3">
            {faq.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-40 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[150px] glow-pulse" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="text-8xl mb-8 float inline-block">🏰</div>
          <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter mb-8 leading-[0.85]">
            Twoja twierdza<br />
            <span className="text-blue-500">czeka</span>
          </h2>
          <p className="text-gray-400 text-xl max-w-xl mx-auto mb-12 leading-relaxed">
            Dołącz do setek właścicieli serwerów którzy już zarabiają z ZiutekShop. Start za darmo, bez karty kredytowej.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/admin">
              <button className="group relative px-12 py-6 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_20px_60px_rgba(37,99,235,0.3)] hover:-translate-y-1 overflow-hidden">
                <span className="relative z-10">Stwórz sklep za darmo →</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            </Link>
            <a href="https://discord.gg/ziutek" target="_blank" rel="noreferrer">
              <button className="px-12 py-6 rounded-2xl border border-white/10 hover:bg-white/5 font-black uppercase tracking-widest text-sm transition-all">
                Discord Społeczności
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.04] bg-[#0C0E18]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-lg font-black italic">Z</div>
                <span className="text-lg font-black italic uppercase tracking-tighter">Ziutek<span className="text-blue-500">Shop</span></span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed max-w-sm">
                Platforma sklepów dla serwerów Minecraft. Instalacja 10 minut, zero prowizji, pełna kontrola.
              </p>
              <div className="flex gap-4 mt-6">
                {["DC", "YT", "FB"].map(s => (
                  <div key={s} className="w-10 h-10 bg-white/5 hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/30 rounded-xl flex items-center justify-center text-xs font-black text-gray-500 hover:text-white cursor-pointer transition-all">{s}</div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 mb-6">Platforma</p>
              <div className="space-y-3">
                <Link href="/admin"><p className="text-gray-500 hover:text-white text-sm font-medium cursor-pointer transition-colors">Panel Admina</p></Link>
                <a href="#cennik"><p className="text-gray-500 hover:text-white text-sm font-medium cursor-pointer transition-colors">Cennik</p></a>
                <Link href="/demo"><p className="text-gray-500 hover:text-white text-sm font-medium cursor-pointer transition-colors">Demo</p></Link>
                <Link href="/polityka"><p className="text-gray-500 hover:text-white text-sm font-medium cursor-pointer transition-colors">Dokumentacja</p></Link>
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 mb-6">Prawne</p>
              <div className="space-y-3">
                <Link href="/polityka/regulamin"><p className="text-gray-500 hover:text-white text-sm font-medium cursor-pointer transition-colors">Regulamin</p></Link>
                <Link href="/polityka/prywatnosc"><p className="text-gray-500 hover:text-white text-sm font-medium cursor-pointer transition-colors">Prywatność</p></Link>
                <Link href="/polityka/cookies"><p className="text-gray-500 hover:text-white text-sm font-medium cursor-pointer transition-colors">Cookies</p></Link>
                <Link href="/polityka/rodo"><p className="text-gray-500 hover:text-white text-sm font-medium cursor-pointer transition-colors">RODO</p></Link>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.04] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-700 text-[10px] font-black uppercase tracking-widest">
              © 2026 ZiutekShop. Wszelkie prawa zastrzeżone.
            </p>
            <div className="flex items-center gap-6 text-gray-700 text-[10px] font-black uppercase tracking-widest">
              <span>VISA</span><span>MASTERCARD</span><span>BLIK</span>
              <span className="text-gray-800">|</span>
              <span className="italic opacity-50">Not affiliated with Mojang AB</span>
            </div>
          </div>
        </div>
      </footer>

    </main>
  );
}

// ─── FAQ ITEM ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-2xl transition-all duration-300 overflow-hidden ${open ? "border-blue-500/30 bg-blue-600/5" : "border-white/[0.06] bg-[#08090F] hover:border-white/10"}`}>
      <button className="w-full flex justify-between items-center px-8 py-6 text-left gap-4" onClick={() => setOpen(!open)}>
        <span className="font-black text-sm uppercase tracking-wide">{q}</span>
        <span className={`text-blue-500 flex-shrink-0 text-xl font-black transition-transform duration-300 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && (
        <div className="px-8 pb-6 text-gray-400 text-sm leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
          {a}
        </div>
      )}
    </div>
  );
}