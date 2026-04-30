import React from "react";

interface ErrorAlertProps {
  error: string | null;
  onDismiss?: () => void;
}

export function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  if (!error) return null;

  return (
    <div className="mb-6 border border-red-500/30 bg-red-500/10 text-red-200 rounded-2xl px-6 py-4 flex items-center justify-between gap-4">
      <div>
        <div className="font-black uppercase text-[10px] tracking-widest mb-1">
          ✕ BŁĄD
        </div>
        <div className="text-sm font-medium">{error}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-black uppercase text-[10px] tracking-widest flex-shrink-0"
        >
          OK
        </button>
      )}
    </div>
  );
}
