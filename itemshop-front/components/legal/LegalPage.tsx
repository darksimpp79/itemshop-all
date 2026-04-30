import React from "react";

interface Props {
  title: string;
  subtitle: string;
  updatedAt: string;
  children: React.ReactNode;
}

export default function LegalPage({ title, subtitle, updatedAt, children }: Props) {
  const date = new Date(updatedAt).toLocaleDateString("pl-PL", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <article>
      <div className="mb-10 pb-8 border-b border-white/[0.06]">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500 mb-3">Dokumenty prawne</p>
        <h1 className="text-3xl font-black tracking-tight mb-2">{title}</h1>
        <p className="text-gray-500 text-sm mb-4">{subtitle}</p>
        <span className="inline-flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-full text-[10px] font-bold text-gray-600 uppercase tracking-widest">
          Ostatnia aktualizacja: {date}
        </span>
      </div>
      <div>{children}</div>
    </article>
  );
}
