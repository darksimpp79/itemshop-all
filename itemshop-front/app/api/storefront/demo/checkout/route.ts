import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "survival";

  // Symulacja opóźnienia płatności jak Stripe
  await new Promise((r) => setTimeout(r, 600));

  // Zwróć URL przekierowujący z powrotem do sklepu z sukcesem
  return NextResponse.json({
    url: `/shop/${mode.toLowerCase()}?payment=success`,
  });
}
