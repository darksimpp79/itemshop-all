import { NextResponse } from "next/server";

// Kolejność backendu: index 0 = rank #1, 1 = rank #2, 2 = rank #3
// DefaultTheme sam przestawia na podium [#2, #1, #3]
export async function GET() {
  return NextResponse.json([
    { nick: "Notch",    amount: 289.50 }, // rank 1
    { nick: "Herobrine", amount: 154.20 }, // rank 2
    { nick: "Steve",    amount: 98.00  }, // rank 3
  ]);
}
