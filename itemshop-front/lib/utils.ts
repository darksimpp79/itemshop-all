/**
 * Utility functions for ItemShop SaaS
 */

import type { ModeStyle } from "@/types/shop";
import { detectServerNameFromHostname } from "./domain";

export function getModeStyle(modeName: string): ModeStyle {
  const name = modeName?.toLowerCase() || "";

  if (name.includes("survival"))
    return {
      color: "text-emerald-400",
      bg: "bg-emerald-500",
      glow: "shadow-[0_0_20px_rgba(52,211,153,0.3)]",
    };

  if (name.includes("boxpvp"))
    return {
      color: "text-orange-400",
      bg: "bg-orange-500",
      glow: "shadow-[0_0_20px_rgba(251,146,60,0.3)]",
    };

  // Default lime green
  return {
    color: "text-[#bbf028]",
    bg: "bg-[#bbf028]",
    glow: "shadow-[0_0_20px_rgba(187,240,40,0.3)]",
  };
}

/**
 * Format cooldown time from string (HH:MM:SS) and decrement
 */
export function decrementCooldown(cooldown: string): string | null {
  const parts = cooldown.split(":").map(Number);
  let [h, m, s] = parts;

  if (h === 0 && m === 0 && s === 0) {
    return null;
  }

  if (s > 0) s--;
  else if (m > 0) {
    m--;
    s = 59;
  } else if (h > 0) {
    h--;
    m = 59;
    s = 59;
  }

  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Extract server name from hostname or query params
 */
export function detectServerName(): string {
  if (typeof window === "undefined") return "";

  // 1. Najpierw sprawdzamy parametry URL (na wszelki wypadek)
  const queryName = new URLSearchParams(window.location.search).get("serverName");
  if (queryName) return queryName;

  // 2. Jeśli nie ma w parametrach, wycinamy mądrze z domeny przeglądarki!
  return detectServerNameFromHostname(window.location.hostname);
}

/**
 * Validate Minecraft nick (basic validation)
 */
export function validateMinecraftNick(nick: string): boolean {
  return /^[a-zA-Z0-9_]{3,16}$/.test(nick.trim());
}

/**
 * Get payment status from query params
 */
export function getPaymentStatusFromUrl(): { ok: boolean; text: string } | null {
  if (typeof window === "undefined") return null;

  const p = new URLSearchParams(window.location.search).get("payment");

  if (p === "success") {
    return {
      ok: true,
      text: "Płatność zakończona sukcesem. Przedmiot trafi do /magazyn.",
    };
  } else if (p === "cancel") {
    return { ok: false, text: "Płatność anulowana." };
  }

  return null;
}
