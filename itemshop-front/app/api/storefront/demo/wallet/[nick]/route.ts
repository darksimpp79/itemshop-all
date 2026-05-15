import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ nick: string }> }
) {
  const { nick } = await params;
  return NextResponse.json({
    nickname: nick,
    points: 1250,
  });
}
