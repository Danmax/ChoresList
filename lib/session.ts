import { createHmac, timingSafeEqual } from "crypto";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_COOKIE = "parent-session";

export type SessionPayload = {
  parentId: number;
  householdId: number;
  email: string;
  expiresAt: number;
};

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
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function createSessionToken(parent: { id: number; householdId: number; email: string }) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({
      parentId: parent.id,
      householdId: parent.householdId,
      email: parent.email,
      expiresAt,
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (
      typeof parsed.parentId !== "number" ||
      typeof parsed.householdId !== "number" ||
      typeof parsed.email !== "string" ||
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

export const parentSession = {
  name: SESSION_COOKIE,
  maxAge: SESSION_TTL_SECONDS,
};
