import { NextRequest, NextResponse } from "next/server";

// Demo kody promo do testowania
const DEMO_CODES: Record<string, number> = {
  DEMO10:   10,
  DEMO20:   20,
  ZIUTEK50: 50,
  START:    15,
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const upper = decodeURIComponent(code).toUpperCase();
  const discount = DEMO_CODES[upper];

  if (discount !== undefined) {
    return NextResponse.json({
      valid: true,
      code: upper,
      discountPercent: discount,
    });
  }

  return NextResponse.json({ valid: false }, { status: 400 });
}
