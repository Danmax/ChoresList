import { NextRequest, NextResponse } from "next/server";
import { requireSession, withErrors } from "@/lib/api";
import { verifyPassword } from "@/lib/auth";
import {
  createElevationToken,
  elevationCookieOptions,
  parentElevation,
  verifyElevationToken,
} from "@/lib/elevation";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function normalizePin(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export const GET = withErrors(async (req: NextRequest) => {
  const { parentId, householdId } = requireSession(req);
  const parent = await prisma.parentAccount.findFirst({
    where: { id: parentId, householdId },
    select: { pinHash: true },
  });
  const hasPin = Boolean(parent?.pinHash);
  const cookieToken = req.cookies.get(parentElevation.name)?.value;
  const payload = verifyElevationToken(cookieToken);
  const elevated =
    !hasPin ||
    (payload != null && payload.parentId === parentId && payload.householdId === householdId);
  return NextResponse.json({
    hasPin,
    elevated,
    expiresAt: payload?.expiresAt ?? null,
  });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { parentId, householdId } = requireSession(req);
  const ipLimited = rateLimit(req, { key: "parent-elevate-ip", limit: 20, windowMs: 10 * 60_000 });
  if (ipLimited) return ipLimited;
  const accountLimited = rateLimit(req, {
    key: "parent-elevate-account",
    bucket: String(parentId),
    limit: 8,
    windowMs: 10 * 60_000,
  });
  if (accountLimited) return accountLimited;

  const body = await req.json();
  const pin = normalizePin(body.pin);

  const parent = await prisma.parentAccount.findFirst({
    where: { id: parentId, householdId },
    select: { id: true, pinHash: true, pinSalt: true },
  });

  if (!parent?.pinHash || !parent.pinSalt) {
    const response = NextResponse.json({ ok: true, elevated: true });
    response.cookies.set({
      name: parentElevation.name,
      value: createElevationToken({ id: parentId, householdId }),
      ...elevationCookieOptions(parentElevation.maxAge),
    });
    return response;
  }

  if (!pin || !verifyPassword(pin, parent.pinHash, parent.pinSalt)) {
    return NextResponse.json({ ok: false, error: "Incorrect PIN." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, elevated: true });
  response.cookies.set({
    name: parentElevation.name,
    value: createElevationToken({ id: parentId, householdId }),
    ...elevationCookieOptions(parentElevation.maxAge),
  });
  return response;
});

export const DELETE = withErrors(async () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: parentElevation.name,
    value: "",
    ...elevationCookieOptions(0),
  });
  return response;
});
