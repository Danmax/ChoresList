import { NextRequest, NextResponse } from "next/server";
import { optionalSession, withErrors } from "@/lib/api";
import { requireDeviceSession, hashDeviceSecret } from "@/lib/device-session";
import { fetchProductPreview } from "@/lib/product-preview";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

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
  const limited = rateLimit(req, { key: "product-preview", limit: 20, windowMs: 60_000, bucket: householdId });
  if (limited) return limited;
  const preview = await fetchProductPreview(req.nextUrl.searchParams.get("url"));
  if (!preview) return NextResponse.json({ error: "We couldn't find an image for that item" }, { status: 404 });
  return NextResponse.json(preview);
});
