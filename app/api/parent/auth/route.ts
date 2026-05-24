import { NextRequest, NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { normalizeEmail, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSessionToken, parentSession, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

export const GET = withErrors(async (req: NextRequest) => {
  const token = req.cookies.get(parentSession.name)?.value;
  return NextResponse.json({ ok: verifySessionToken(token) });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { email, password } = await req.json();

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parent = await prisma.parentAccount.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (!parent || !verifyPassword(password, parent.passwordHash, parent.passwordSalt)) {
    return NextResponse.json({ ok: false });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: parentSession.name,
    value: createSessionToken(parent.email),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: parentSession.maxAge,
  });
  return response;
});

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
