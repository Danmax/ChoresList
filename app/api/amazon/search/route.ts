import { NextRequest, NextResponse } from "next/server";
import { optionalSession, withErrors } from "@/lib/api";
import { searchAmazonProducts } from "@/lib/amazon-creators";
import { rateLimit } from "@/lib/rate-limit";
import { requireDeviceSession, hashDeviceSecret } from "@/lib/device-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export const GET = withErrors(async (req: NextRequest) => {
  const parent = optionalSession(req);
  let householdId = parent?.householdId ?? "";
  if (!householdId) {
    try {
      const deviceSession = requireDeviceSession(req);
      const device = await prisma.householdDevice.findFirst({ where: { id: deviceSession.deviceId, householdId: deviceSession.householdId, tokenHash: hashDeviceSecret(deviceSession.secret), revokedAt: null }, select: { householdId: true } });
      householdId = device?.householdId ?? "";
    } catch {
      householdId = "";
    }
  }
  if (!householdId) return NextResponse.json({ error: "Sign in or pair this device first" }, { status: 401 });
  const limited = rateLimit(req, { key: "amazon-product-search", limit: 20, windowMs: 60_000, bucket: householdId });
  if (limited) return limited;
  const query = req.nextUrl.searchParams.get("q")?.trim().slice(0, 200) ?? "";
  if (query.length < 2) return NextResponse.json({ error: "Enter at least two characters" }, { status: 400 });
  const products = await searchAmazonProducts(query);
  if (!products) return NextResponse.json({ error: "Amazon product search is not configured", configured: false }, { status: 503 });
  return NextResponse.json({ products, configured: true });
});
