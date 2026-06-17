import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { AuthError } from "@/lib/auth-error";

const DEVICE_SESSION_TTL_SECONDS = 60 * 60 * 24 * 90;
const DEVICE_SESSION_COOKIE = "kid-device-session";
const PAIRING_CODE_DIGITS = 8;
const PAIRING_CODE_MIN = 10 ** (PAIRING_CODE_DIGITS - 1);
const PAIRING_CODE_MAX = 10 ** PAIRING_CODE_DIGITS;

export type DeviceMode = "household" | "member";

export type DeviceSessionPayload = {
  deviceId: string;
  householdId: string;
  memberId: string | null;
  mode: DeviceMode;
  secret: string;
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

function pairingSecret() {
  const value = process.env.PAIRING_SECRET?.trim();
  return value && value.length >= 32 ? value : secret();
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function hashPairingCode(code: string) {
  return createHmac("sha256", pairingSecret()).update(`pair:${code}`).digest("hex");
}

export function hashDeviceSecret(deviceSecret: string) {
  return createHash("sha256").update(deviceSecret).digest("hex");
}

export function generateDeviceSecret() {
  return randomBytes(32).toString("base64url");
}

export function generatePairingCode() {
  return String(randomInt(PAIRING_CODE_MIN, PAIRING_CODE_MAX));
}

export function normalizePairingCode(code: unknown) {
  return String(code ?? "").replace(/\D/g, "").slice(0, PAIRING_CODE_DIGITS);
}

export const PAIRING_CODE_LENGTH = PAIRING_CODE_DIGITS;

export function createDeviceSessionToken(device: {
  id: string;
  householdId: string;
  memberId: string | null;
  mode: string;
  secret: string;
}) {
  const expiresAt = Math.floor(Date.now() / 1000) + DEVICE_SESSION_TTL_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({
      deviceId: device.id,
      householdId: device.householdId,
      memberId: device.memberId,
      mode: device.mode === "member" ? "member" : "household",
      secret: device.secret,
      expiresAt,
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyDeviceSessionToken(token?: string): DeviceSessionPayload | null {
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
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DeviceSessionPayload;
    if (
      typeof parsed.deviceId !== "string" ||
      typeof parsed.householdId !== "string" ||
      !(typeof parsed.memberId === "string" || parsed.memberId === null) ||
      (parsed.mode !== "household" && parsed.mode !== "member") ||
      typeof parsed.secret !== "string" ||
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

export function requireDeviceSession(req: NextRequest) {
  const session = verifyDeviceSessionToken(req.cookies.get(deviceSession.name)?.value);
  if (!session) throw new AuthError("Device pairing required");
  return session;
}

export const deviceSession = {
  name: DEVICE_SESSION_COOKIE,
  maxAge: DEVICE_SESSION_TTL_SECONDS,
};
