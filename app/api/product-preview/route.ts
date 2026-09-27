import { NextRequest, NextResponse } from "next/server";
import { optionalSession, withErrors } from "@/lib/api";
import { getActiveDeviceSession } from "@/lib/device-session";
import { fetchProductPreview } from "@/lib/product-preview";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export const GET = withErrors(async (req: NextRequest) => {
  const parent = optionalSession(req);
  let householdId = parent?.householdId ?? "";
  if (!householdId) {
    try {
      const deviceSession = await getActiveDeviceSession(req);
      householdId = deviceSession?.householdId ?? "";
    } catch {
      householdId = "";
    }
  }
  const limited = householdId
    ? rateLimit(req, { key: "product-preview", limit: 20, windowMs: 60_000, bucket: householdId })
    : rateLimit(req, { key: "guest-product-preview", limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const preview = await fetchProductPreview(req.nextUrl.searchParams.get("url"));
  if (!preview) return NextResponse.json({ error: "We couldn't find an image for that item" }, { status: 404 });
  return NextResponse.json(preview);
});
