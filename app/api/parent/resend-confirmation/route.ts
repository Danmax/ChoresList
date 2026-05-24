import { NextRequest, NextResponse } from "next/server";
import { createConfirmationToken, normalizeEmail, verifyPassword } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { sendConfirmationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export const POST = withErrors(async (req: NextRequest) => {
  const { email, password } = await req.json();

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parent = await prisma.parentAccount.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (!parent || !verifyPassword(password, parent.passwordHash, parent.passwordSalt)) {
    return NextResponse.json({ ok: false, error: "Email or password is incorrect." }, { status: 401 });
  }

  if (parent.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  await prisma.emailConfirmationToken.updateMany({
    where: { parentId: parent.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const { token, tokenHash } = createConfirmationToken();
  await prisma.emailConfirmationToken.create({
    data: {
      parentId: parent.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const confirmUrl = new URL("/api/parent/auth", req.url);
  confirmUrl.searchParams.set("confirm", token);
  const emailResult = await sendConfirmationEmail({ to: parent.email, confirmUrl: confirmUrl.toString() });

  return NextResponse.json({
    ok: true,
    needsConfirmation: true,
    message: emailResult.sent
      ? "Confirmation email sent."
      : "SMTP is not configured, so use the development confirmation link.",
    confirmUrl: emailResult.sent ? undefined : confirmUrl.toString(),
  });
});
