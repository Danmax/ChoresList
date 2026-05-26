import { NextRequest, NextResponse } from "next/server";
import { requireSession, withErrors } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  createElevationToken,
  elevationCookieOptions,
  parentElevation,
} from "@/lib/elevation";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function normalizePin(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function pinError(pin: string) {
  if (pin.length < 4 || pin.length > 8) return "PIN must be 4 to 8 digits.";
  if (/^(\d)\1+$/.test(pin)) return "PIN can't be a single repeated digit.";
  return null;
}

export const GET = withErrors(async (req: NextRequest) => {
  const { parentId, householdId } = requireSession(req);
  const parent = await prisma.parentAccount.findFirst({
    where: { id: parentId, householdId },
    select: { pinHash: true },
  });
  return NextResponse.json({ hasPin: Boolean(parent?.pinHash) });
});

export const POST = withErrors(async (req: NextRequest) => {
  const limited = rateLimit(req, { key: "parent-pin-set", limit: 10, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const { parentId, householdId } = requireSession(req);
  const body = await req.json();
  const newPin = normalizePin(body.newPin);
  const currentPin = normalizePin(body.currentPin);

  const validationError = pinError(newPin);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  const parent = await prisma.parentAccount.findFirst({
    where: { id: parentId, householdId },
    select: { id: true, pinHash: true, pinSalt: true },
  });
  if (!parent) return NextResponse.json({ ok: false }, { status: 401 });

  if (parent.pinHash && parent.pinSalt) {
    if (!currentPin || !verifyPassword(currentPin, parent.pinHash, parent.pinSalt)) {
      return NextResponse.json({ ok: false, error: "Current PIN is incorrect." }, { status: 401 });
    }
  }

  const { passwordHash, passwordSalt } = hashPassword(newPin);
  await prisma.parentAccount.update({
    where: { id: parent.id },
    data: { pinHash: passwordHash, pinSalt: passwordSalt },
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: parentElevation.name,
    value: createElevationToken({ id: parentId, householdId }),
    ...elevationCookieOptions(parentElevation.maxAge),
  });
  return response;
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { parentId, householdId } = requireSession(req);
  const body = await req.json().catch(() => ({}));
  const currentPin = normalizePin(body.currentPin);

  const parent = await prisma.parentAccount.findFirst({
    where: { id: parentId, householdId },
    select: { id: true, pinHash: true, pinSalt: true },
  });
  if (!parent) return NextResponse.json({ ok: false }, { status: 401 });

  if (parent.pinHash && parent.pinSalt) {
    if (!currentPin || !verifyPassword(currentPin, parent.pinHash, parent.pinSalt)) {
      return NextResponse.json({ ok: false, error: "Current PIN is incorrect." }, { status: 401 });
    }
  }

  await prisma.parentAccount.update({
    where: { id: parent.id },
    data: { pinHash: null, pinSalt: null },
  });

  return NextResponse.json({ ok: true });
});
