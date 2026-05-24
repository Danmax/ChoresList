import { NextRequest, NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { createConfirmationToken, hashConfirmationToken, hashPassword, normalizeEmail, verifyPassword } from "@/lib/auth";
import { sendConfirmationEmail } from "@/lib/email";
import { seedHouseholdDefaults } from "@/lib/household-defaults";
import { prisma } from "@/lib/prisma";
import { createSessionToken, parentSession, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

export const GET = withErrors(async (req: NextRequest) => {
  const confirmationToken = req.nextUrl.searchParams.get("confirm");
  if (confirmationToken) {
    const result = await confirmEmail(confirmationToken);
    const redirectUrl = new URL("/parent", req.url);
    redirectUrl.searchParams.set(result.ok ? "confirmed" : "confirmError", "1");
    return NextResponse.redirect(redirectUrl);
  }

  const token = req.cookies.get(parentSession.name)?.value;
  const session = verifySessionToken(token);
  return NextResponse.json({ ok: Boolean(session), session });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { email, password, mode, householdName } = await req.json();

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (mode === "signup") {
    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await prisma.parentAccount.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "An account already exists for this email." }, { status: 409 });
    }

    const { passwordHash, passwordSalt } = hashPassword(password);
    const { token: confirmationToken, tokenHash } = createConfirmationToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await prisma.$transaction(async (tx) => {
      const parent = await tx.parentAccount.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          passwordSalt,
          household: {
            create: { name: typeof householdName === "string" && householdName.trim() ? householdName.trim() : "My Household" },
          },
          confirmationTokens: {
            create: { tokenHash, expiresAt },
          },
        },
      });

      await seedHouseholdDefaults(tx, parent.householdId);
    });

    const confirmUrl = new URL("/api/parent/auth", req.url);
    confirmUrl.searchParams.set("confirm", confirmationToken);
    const emailResult = await sendConfirmationEmail({ to: normalizedEmail, confirmUrl: confirmUrl.toString() });

    return NextResponse.json({
      ok: true,
      needsConfirmation: true,
      message: emailResult.sent
        ? "Account created. Check your email to confirm before signing in."
        : "Account created. SMTP is not configured, so use the development confirmation link.",
      confirmUrl: emailResult.sent ? undefined : confirmUrl.toString(),
    });
  }

  const parent = await prisma.parentAccount.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (!parent || !verifyPassword(password, parent.passwordHash, parent.passwordSalt)) {
    return NextResponse.json({ ok: false });
  }

  if (!parent.emailVerified) {
    return NextResponse.json({ ok: false, needsConfirmation: true, error: "Please confirm your email first." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: parentSession.name,
    value: createSessionToken(parent),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: parentSession.maxAge,
  });
  return response;
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("confirm");
  if (!token) return NextResponse.json({ ok: false, error: "Missing confirmation token." }, { status: 400 });

  const result = await confirmEmail(token);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
});

async function confirmEmail(token: string) {
  const record = await prisma.emailConfirmationToken.findUnique({
    where: { tokenHash: hashConfirmationToken(token) },
    include: { parent: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "Confirmation link is invalid or expired." };
  }

  await prisma.$transaction([
    prisma.parentAccount.update({ where: { id: record.parentId }, data: { emailVerified: true } }),
    prisma.emailConfirmationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { ok: true };
}

export const DELETE = withErrors(async () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: parentSession.name,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
});
