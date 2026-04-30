// 🎨 Reusable components dla Admin panelu
"use client";

import { useState, ReactNode } from "react";

// ─── TOOLTIP ───────────────────────────────────────────────────────────────────
export function Tooltip({ children, text, side = "top" }: { children: ReactNode; text: string; side?: "top" | "bottom" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={`absolute left-1/2 -translate-x-1/2 ${side === "top" ? "bottom-full mb-2" : "top-full mt-2"} bg-[#131620] text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-50 border border-white/10 shadow-xl`}>
          {text}
          <div className={`absolute ${side === "top" ? "top-full border-t-[#131620]" : "bottom-full border-b-[#131620]"} left-1/2 -translate-x-1/2 border-4 border-transparent`}></div>
        </div>
      )}
    </div>
  );
}

// ─── EMPTY STATE ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action, actionLabel }: { icon: string; title: string; description: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h2 className="text-2xl font-black mb-2 text-white">{title}</h2>
      <p className="text-gray-400 mb-8 max-w-sm">{description}</p>
      {action && actionLabel && (
        <button onClick={action} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-600/20">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ─── LOADING CARD ──────────────────────────────────────────────────────────────
export function LoadingCard() {
  return (
    <div className="bg-[#0B0D13] rounded-[32px] p-6 space-y-4">
      <div className="h-8 bg-white/5 rounded-lg animate-pulse"></div>
      <div className="h-20 bg-white/5 rounded-lg animate-pulse"></div>
      <div className="h-6 bg-white/5 rounded-lg w-2/3 animate-pulse"></div>
    </div>
  );
}

// ─── LOADING SKELETON ──────────────────────────────────────────────────────────
export function LoadingGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}

// ─── STAT CARD ─────────────────────────────────────────────────────────────────
export function StatCard({ icon, label, value, tooltip }: { icon: string; label: string; value: string | number; tooltip?: string }) {
  const content = (
    <div className="bg-[#0C0E16] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all">
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{label}</p>
      <p className="text-lg font-black text-white">{value}</p>
    </div>
  );

  if (tooltip) {
    return <Tooltip text={tooltip}>{content}</Tooltip>;
  }
  return content;
}

// ─── VALIDATION INDICATOR ──────────────────────────────────────────────────────
export function ValidationIndicator({ touched, error }: { touched: boolean; error: string | null }) {
  if (!touched) return null;
  return <span className={`text-[9px] ml-2 ${error ? "text-red-400" : "text-green-400"}`}>{error ? "✗ " + error : "✓"}</span>;
}

// ─── FORM INPUT ────────────────────────────────────────────────────────────────
export function FormInput({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  help,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  help?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-2 flex justify-between">
        <span>
          {label}
          {required && <span className="text-red-400">*</span>}
        </span>
        {touched && <ValidationIndicator touched={touched} error={error || null} />}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        className={`w-full px-5 py-4 rounded-xl bg-[#08090D] border outline-none focus:border-blue-500 font-bold transition-all
          ${touched && error ? "border-red-500/50 focus:border-red-500" : "border-white/5 focus:border-blue-500"}`}
      />
      {touched && error && <p className="text-xs text-red-400 mt-1">⚠️ {error}</p>}
      {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
    </div>
  );
}

// ─── ONBOARDING CHECKLIST ──────────────────────────────────────────────────────
export function OnboardingChecklist({ tasks }: { tasks: Array<{ id: string; icon: string; label: string; done: boolean }> }) {
  const completedCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;

  return (
    <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-blue-400 uppercase text-xs">🚀 Setup Progress</h3>
        <span className="text-xs font-black text-gray-500">
          {completedCount}/{totalCount}
        </span>
      </div>
      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-3">
            <input type="checkbox" checked={task.done} disabled className="w-5 h-5 rounded accent-blue-500 cursor-not-allowed" />
            <span className={`text-sm font-bold ${task.done ? "text-green-400" : "text-gray-500"}`}>
              {task.icon} {task.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
export function Badge({ type, label, icon }: { type: "success" | "error" | "warning" | "info"; label: string; icon?: string }) {
  const styles = {
    success: "bg-green-500/10 text-green-400 border-green-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  return (
    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border ${styles[type]}`}>
      {icon && `${icon} `}
      {label}
    </span>
  );
}

// ─── UNREAD BADGE ─────────────────────────────────────────────────────────────
export function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{count > 99 ? "99+" : count}</span>;
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
export function ProgressBar({ progress, label }: { progress: number; label?: string }) {
  return (
    <div>
      {label && <p className="text-xs font-bold text-gray-500 mb-2">{label}</p>}
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>
      <p className="text-xs text-gray-500 mt-1">{progress}%</p>
    </div>
  );
}

// ─── HELP TEXT ────────────────────────────────────────────────────────────────
export function HelpText({ text, icon = "ℹ️" }: { text: string; icon?: string }) {
  return <p className="text-xs text-gray-500 mt-2 flex items-start gap-2"><span className="flex-shrink-0">{icon}</span> {text}</p>;
}
// ─── BREADCRUMBS ────────────────────────────────────────────────────────────
export function Breadcrumbs({ items }: { items: Array<{ label: string; onClick?: () => void }> }) {
  return (
    <nav className="flex items-center gap-2 text-xs text-gray-500">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {item.onClick ? (
            <button onClick={item.onClick} className="hover:text-white transition-colors">
              {item.label}
            </button>
          ) : (
            <span className="text-white font-bold">{item.label}</span>
          )}
          {idx < items.length - 1 && <span>/</span>}
        </div>
      ))}
    </nav>
  );
}

// ─── TAB BUTTON ─────────────────────────────────────────────────────────────
export function TabButton({
  icon,
  label,
  active,
  onClick,
  badge,
  shortcut,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  shortcut?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`w-full px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-3 relative
        ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
    >
      <span className="text-lg">{icon}</span>
      <span className="hidden lg:inline">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{badge > 99 ? "99+" : badge}</span>
      )}
      {shortcut && <span className="absolute top-1 right-1 text-[7px] text-gray-600 opacity-0 group-hover:opacity-100">{shortcut}</span>}
    </button>
  );
}

// ─── GLOBAL SEARCH ──────────────────────────────────────────────────────────
export function GlobalSearch({
  placeholder,
  results,
  onSearch,
}: {
  placeholder: string;
  results?: Array<{ id: string; type: "product" | "order"; title: string; subtitle?: string; onClick: () => void }>;
  onSearch: (query: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const handleChange = (val: string) => {
    setQuery(val);
    onSearch(val);
  };

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-b from-[#08090D] to-[#08090D]/80 backdrop-blur-sm px-6 py-4 border-b border-white/5">
      <div className="relative">
        <input
          id="admin-search"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 100)}
          className="w-full px-4 py-3 rounded-xl bg-[#0C0E16] border border-white/5 outline-none focus:border-blue-500 text-white placeholder-gray-600 transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600">⌘K</span>

        {open && results && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0C0E16] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto">
            <div className="divide-y divide-white/5">
              {results.map(result => (
                <button
                  key={result.id}
                  onClick={() => {
                    result.onClick();
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-white/5 flex items-start justify-between transition-colors"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{result.title}</p>
                    {result.subtitle && <p className="text-xs text-gray-500">{result.subtitle}</p>}
                  </div>
                  <span className="text-xs text-gray-600">{result.type === "product" ? "📦" : "🛒"}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}