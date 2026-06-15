import { NextRequest, NextResponse } from "next/server";
import { createPinResetToken, hashPinResetToken, normalizeEmail } from "@/lib/auth";
import { optionalSession, withErrors } from "@/lib/api";
import { getBaseUrl } from "@/lib/base-url";
import { parentElevation } from "@/lib/elevation";
import { sendPinResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const RESET_TTL_MS = 1000 * 60 * 30;

export const POST = withErrors(async (req: NextRequest) => {
  const ipLimited = rateLimit(req, { key: "pin-reset-ip", limit: 10, windowMs: 60 * 60_000 });
  if (ipLimited) return ipLimited;

  const session = optionalSession(req);
  const body = await req.json().catch(() => ({}));
  const bodyEmail = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const bucket = session ? String(session.parentId) : bodyEmail;
  const emailLimited = rateLimit(req, {
    key: "pin-reset-account",
    bucket,
    limit: 3,
    windowMs: 60 * 60_000,
  });
  if (emailLimited) return emailLimited;

  const parent = session
    ? await prisma.parentAccount.findFirst({ where: { id: session.parentId, householdId: session.householdId } })
    : bodyEmail
      ? await prisma.parentAccount.findUnique({ where: { email: bodyEmail } })
      : null;

  if (!parent) {
    return NextResponse.json({ ok: true });
  }

  await prisma.pinResetToken.updateMany({
    where: { parentId: parent.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const { token, tokenHash } = createPinResetToken();
  await prisma.pinResetToken.create({
    data: {
      parentId: parent.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const resetUrl = new URL("/parent", getBaseUrl(req));
  resetUrl.searchParams.set("pinReset", token);
  const emailResult = await sendPinResetEmail({ to: parent.email, resetUrl: resetUrl.toString() });

  return NextResponse.json({
    ok: true,
    resetUrl: !emailResult.sent && process.env.NODE_ENV !== "production" ? resetUrl.toString() : undefined,
  });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const limited = rateLimit(req, { key: "pin-reset-confirm", limit: 10, windowMs: 10 * 60_000 });
  if (limited) return limited;

  const { token } = await req.json();
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ ok: false, error: "Missing reset token." }, { status: 400 });
  }

  const record = await prisma.pinResetToken.findUnique({
    where: { tokenHash: hashPinResetToken(token) },
    include: { parent: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: "PIN reset link is invalid or expired." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.parentAccount.update({
      where: { id: record.parentId },
      data: { pinHash: null, pinSalt: null },
    }),
    prisma.pinResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: parentElevation.name,
    value: "",
    maxAge: 0,
    path: "/",
  });
  return response;
});
