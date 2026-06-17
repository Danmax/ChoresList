import { NextRequest, NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { createConfirmationToken, hashConfirmationToken, hashPassword, normalizeEmail, verifyPassword } from "@/lib/auth";
import { getBaseUrl } from "@/lib/base-url";
import { sendConfirmationEmail } from "@/lib/email";
import { seedHouseholdDefaults } from "@/lib/household-defaults";
import { ensureParentFamilyMember } from "@/lib/parent-member";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createSessionToken, parentSession, verifyHouseholdInviteToken, verifySessionToken } from "@/lib/session";

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

const ACCOUNT_ROLES = new Set(["owner", "parent", "grandparent"]);

function cleanAccountRole(value: unknown) {
  return typeof value === "string" && ACCOUNT_ROLES.has(value) ? value : "parent";
}

async function finalizeVerifiedParentAccount(parent: {
  id: string;
  householdId: string;
  email: string;
  accountRole: string;
}) {
  const [parentCount, ownerCount, choreCount, skillCount] = await Promise.all([
    prisma.parentAccount.count({ where: { householdId: parent.householdId } }),
    prisma.parentAccount.count({ where: { householdId: parent.householdId, accountRole: "owner" } }),
    prisma.chore.count({ where: { householdId: parent.householdId } }),
    prisma.skillCategory.count({ where: { householdId: parent.householdId } }),
  ]);

  const nextRole = parentCount <= 1 || ownerCount === 0 ? "owner" : cleanAccountRole(parent.accountRole);
  const updated = nextRole !== parent.accountRole
    ? await prisma.parentAccount.update({
        where: { id: parent.id },
        data: { accountRole: nextRole },
      })
    : parent;

  if (nextRole === "owner" && choreCount === 0 && skillCount === 0) {
    await seedHouseholdDefaults(prisma, parent.householdId);
  }

  await ensureParentFamilyMember(parent.id, parent.householdId);

  return updated;
}

export const GET = withErrors(async (req: NextRequest) => {
  const confirmationToken = req.nextUrl.searchParams.get("confirm");
  if (confirmationToken) {
    const result = await confirmEmail(confirmationToken);
    const redirectUrl = new URL("/parent", getBaseUrl(req));
    redirectUrl.searchParams.set(result.ok ? "confirmed" : "confirmError", "1");
    return NextResponse.redirect(redirectUrl);
  }

  const token = req.cookies.get(parentSession.name)?.value;
  const session = verifySessionToken(token);
  const parent = session
    ? await prisma.parentAccount.findFirst({
        where: { id: session.parentId, householdId: session.householdId },
        select: { accountRole: true },
      })
    : null;
  return NextResponse.json({ ok: Boolean(session), session, accountRole: parent?.accountRole ?? null });
});

export const POST = withErrors(async (req: NextRequest) => {
  const limited = rateLimit(req, { key: "parent-auth", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const { email, password, mode, householdName, inviteToken } = await req.json();

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

    const invite = typeof inviteToken === "string" ? verifyHouseholdInviteToken(inviteToken) : null;
    if (inviteToken && !invite) {
      return NextResponse.json({ ok: false, error: "Invite link is invalid or expired." }, { status: 400 });
    }
    if (invite) {
      const household = await prisma.household.findUnique({ where: { id: invite.householdId } });
      if (!household) {
        return NextResponse.json({ ok: false, error: "Invite household no longer exists." }, { status: 400 });
      }
    }

    const existing = await prisma.parentAccount.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      if (invite && !existing.emailVerified) {
        await prisma.parentAccount.update({
          where: { id: existing.id },
          data: {
            householdId: invite.householdId,
            accountRole: invite.accountRole,
            parentType: invite.parentType,
            relationshipLabel: invite.relationshipLabel ?? null,
            childAccessMode: invite.childAccessMode,
            childAccessMemberIds: invite.childAccessMode === "selected" ? invite.childAccessMemberIds : [],
          },
        });
      }
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
      if (invite) {
        await tx.parentAccount.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            passwordSalt,
            householdId: invite.householdId,
            accountRole: invite.accountRole,
            parentType: invite.parentType,
            relationshipLabel: invite.relationshipLabel ?? null,
            childAccessMode: invite.childAccessMode,
            childAccessMemberIds: invite.childAccessMode === "selected" ? invite.childAccessMemberIds : [],
            confirmationTokens: {
              create: { tokenHash, expiresAt },
            },
          },
        });
        return;
      }

      const parent = await tx.parentAccount.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          passwordSalt,
          household: {
            create: { name: typeof householdName === "string" && householdName.trim() ? householdName.trim() : "My Household" },
          },
          accountRole: "owner",
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
        : process.env.NODE_ENV === "production"
          ? GENERIC_SIGNUP_MESSAGE
          : "Account created. SMTP is not configured, so use the development confirmation link.",
      confirmUrl: !emailResult.sent && process.env.NODE_ENV !== "production" ? confirmUrl.toString() : undefined,
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

  const verifiedParent = await finalizeVerifiedParentAccount(parent);
  const response = NextResponse.json({ ok: true, accountRole: verifiedParent.accountRole });
  response.cookies.set({
    name: parentSession.name,
    value: createSessionToken(verifiedParent),
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
  const parent = await finalizeVerifiedParentAccount(record.parent);

  return { ok: true, accountRole: parent.accountRole };
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
