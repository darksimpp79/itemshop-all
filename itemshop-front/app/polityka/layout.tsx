import Link from "next/link";
import React from "react";

const LINKS = [
  { href: "/polityka/regulamin",   label: "Regulamin" },
  { href: "/polityka/prywatnosc",  label: "Polityka prywatności" },
  { href: "/polityka/cookies",     label: "Polityka cookies" },
  { href: "/polityka/rodo",        label: "RODO / GDPR" },
];

export default function PolitykLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080c14] text-white font-sans">
      <header className="border-b border-white/[0.04] px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-base font-black italic">Z</div>
            <span className="text-sm font-black italic uppercase tracking-tighter">
              Ziutek<span className="text-blue-500">Shop</span>
            </span>
          </Link>
          <Link href="/" className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors">
            ◀ Strona główna
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-10">
        <aside className="lg:w-52 shrink-0">
          <nav className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 sticky top-8">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-600 mb-3 px-2">Dokumenty prawne</p>
            <ul className="space-y-0.5">
              {LINKS.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
