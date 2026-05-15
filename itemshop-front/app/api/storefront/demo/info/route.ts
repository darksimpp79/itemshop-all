import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    serverName: "PrzyjaznyKraft",
    serverIp: null,
    theme: "default",
    discordLink: "https://discord.gg/ziutekshop",
    bannerText: "Witaj w sklepie demonstracyjnym ZiutekShop! 🎮",
    termsContent: null,
  });
}
