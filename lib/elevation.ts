import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "@/lib/auth-error";
import { prisma } from "@/lib/prisma";

const ELEVATION_TTL_SECONDS = 60 * 30;
const ELEVATION_COOKIE = "parent-elevation";

const PLACEHOLDER_SECRETS = new Set([
  "",
  "dev-secret-change-me",
  "replace-with-a-long-random-string",
]);

function secret() {
  const value = process.env.AUTH_SECRET?.trim() ?? "";
  if (PLACEHOLDER_SECRETS.has(value) || value.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set to a random value of at least 32 characters");
    }
    return "dev-only-secret-change-me-now";
  }
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(`elevate:${value}`).digest("hex");
}

export type ElevationPayload = {
  parentId: number;
  householdId: number;
  expiresAt: number;
};

export function createElevationToken(parent: { id: number; householdId: number }) {
  const expiresAt = Math.floor(Date.now() / 1000) + ELEVATION_TTL_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({ parentId: parent.id, householdId: parent.householdId, expiresAt })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyElevationToken(token?: string): ElevationPayload | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actualBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ElevationPayload;
    if (
      typeof parsed.parentId !== "number" ||
      typeof parsed.householdId !== "number" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export class ElevationRequiredError extends AuthError {
  needsPin = true;
  hasPin: boolean;

  constructor(hasPin: boolean) {
    super("Parent PIN required");
    this.status = 403;
    this.hasPin = hasPin;
  }
}

export async function requireElevation(req: NextRequest, parentId: number, householdId: number) {
  const parent = await prisma.parentAccount.findFirst({
    where: { id: parentId, householdId },
    select: { pinHash: true },
  });
  if (!parent) throw new AuthError();
  if (!parent.pinHash) return;

  const token = req.cookies.get(ELEVATION_COOKIE)?.value;
  const payload = verifyElevationToken(token);
  if (!payload || payload.parentId !== parentId || payload.householdId !== householdId) {
    throw new ElevationRequiredError(true);
  }
}

export function elevationCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV !== "development",
    path: "/",
    maxAge,
  };
}

export const parentElevation = {
  name: ELEVATION_COOKIE,
  maxAge: ELEVATION_TTL_SECONDS,
};
