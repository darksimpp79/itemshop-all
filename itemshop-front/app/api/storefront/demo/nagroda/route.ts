import { NextRequest, NextResponse } from "next/server";

// Prosta in-memory mapa (resetuje się przy restarcie serwera)
// Format: "nick:mode" → timestamp ostatniego odbioru
const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minut w demo (zamiast 24h)

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nick = searchParams.get("nick") || "gracz";
  const mode = searchParams.get("mode") || "survival";

  const key = `${nick.toLowerCase()}:${mode.toLowerCase()}`;
  const lastClaim = cooldowns.get(key);
  const now = Date.now();

  if (lastClaim && now - lastClaim < COOLDOWN_MS) {
    const remaining = COOLDOWN_MS - (now - lastClaim);
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return new NextResponse(`Cooldown: ${timeStr}`, { status: 429 });
  }

  cooldowns.set(key, now);
  return NextResponse.json({ success: true, message: "Nagroda przyznana!" });
}
