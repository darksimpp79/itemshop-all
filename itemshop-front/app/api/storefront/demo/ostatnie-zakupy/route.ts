import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    { nick: "Notch",       item: "VIP+",           time: "2 min temu" },
    { nick: "Alex",        item: "Lucky Block x32", time: "8 min temu" },
    { nick: "Herobrine",   item: "Ranga Admin",     time: "15 min temu" },
    { nick: "Dinnerbone",  item: "Ochrona X",       time: "23 min temu" },
    { nick: "jeb_",        item: "Klucz Skrzynki",  time: "1h temu" },
    { nick: "Dream",       item: "Monety x1000",    time: "2h temu" },
  ]);
}
