import { NextRequest, NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { createConfirmationToken, hashConfirmationToken, hashPassword, normalizeEmail, verifyPassword } from "@/lib/auth";
import { getBaseUrl } from "@/lib/base-url";
import { sendConfirmationEmail } from "@/lib/email";
import { seedHouseholdDefaults } from "@/lib/household-defaults";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createSessionToken, parentSession, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

const sessionCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV !== "development",
  path: "/",
  maxAge,
});

const GENERIC_SIGNUP_MESSAGE =
  "If that email is available, we sent a confirmation link. Check your inbox to finish signup.";

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
  const limited = rateLimit(req, { key: "parent-auth", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const { email, password, mode, householdName } = await req.json();

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);

  if (mode === "signup") {
    const emailLimited = rateLimit(req, {
      key: "parent-signup-email",
      bucket: normalizedEmail,
      limit: 3,
      windowMs: 60 * 60_000,
    });
    if (emailLimited) return emailLimited;

    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await prisma.parentAccount.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({
        ok: true,
        needsConfirmation: true,
        message: GENERIC_SIGNUP_MESSAGE,
      });
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

    const confirmUrl = new URL("/api/parent/auth", getBaseUrl(req));
    confirmUrl.searchParams.set("confirm", confirmationToken);
    const emailResult = await sendConfirmationEmail({ to: normalizedEmail, confirmUrl: confirmUrl.toString() });

    return NextResponse.json({
      ok: true,
      needsConfirmation: true,
      message: emailResult.sent
        ? GENERIC_SIGNUP_MESSAGE
        : "Account created. SMTP is not configured, so use the development confirmation link.",
      confirmUrl: emailResult.sent ? undefined : confirmUrl.toString(),
    });
  }

  const emailLimited = rateLimit(req, {
    key: "parent-login-email",
    bucket: normalizedEmail,
    limit: 8,
    windowMs: 10 * 60_000,
  });
  if (emailLimited) return emailLimited;

  const parent = await prisma.parentAccount.findUnique({ where: { email: normalizedEmail } });

  if (!parent || !verifyPassword(password, parent.passwordHash, parent.passwordSalt)) {
    return NextResponse.json({ ok: false, error: "Email or password is incorrect." }, { status: 401 });
  }

  if (!parent.emailVerified) {
    return NextResponse.json({ ok: false, needsConfirmation: true, error: "Please confirm your email first." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: parentSession.name,
    value: createSessionToken(parent),
    ...sessionCookieOptions(parentSession.maxAge),
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
    ...sessionCookieOptions(0),
  });
  return response;
});
