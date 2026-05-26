import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetToken, hashPassword, hashPasswordResetToken, normalizeEmail } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const RESET_TTL_MS = 1000 * 60 * 60;

export const POST = withErrors(async (req: NextRequest) => {
  const { email } = await req.json();
  if (typeof email !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parent = await prisma.parentAccount.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (!parent) {
    return NextResponse.json({ ok: true });
  }

  await prisma.passwordResetToken.updateMany({
    where: { parentId: parent.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const { token, tokenHash } = createPasswordResetToken();
  await prisma.passwordResetToken.create({
    data: {
      parentId: parent.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const resetUrl = new URL("/parent", req.url);
  resetUrl.searchParams.set("reset", token);
  const emailResult = await sendPasswordResetEmail({ to: parent.email, resetUrl: resetUrl.toString() });

  return NextResponse.json({
    ok: true,
    resetUrl: emailResult.sent ? undefined : resetUrl.toString(),
  });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { token, password } = await req.json();
  if (typeof token !== "string" || typeof password !== "string") {
    return NextResponse.json({ ok: false, error: "Missing reset token or password." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetToken(token) },
    include: { parent: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: "Password reset link is invalid or expired." }, { status: 400 });
  }

  const { passwordHash, passwordSalt } = hashPassword(password);
  await prisma.$transaction([
    prisma.parentAccount.update({
      where: { id: record.parentId },
      data: { passwordHash, passwordSalt, emailVerified: true },
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true });
});
