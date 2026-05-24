import { NextRequest, NextResponse } from "next/server";
import { withErrors } from "@/lib/api";

export const POST = withErrors(async (req: NextRequest) => {
  const { pin } = await req.json();
  const expected = process.env.PARENT_PIN ?? "1234";
  return NextResponse.json({ ok: pin === expected });
});
