import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { AuthError } from "@/lib/api";

const DEVICE_SESSION_TTL_SECONDS = 60 * 60 * 24 * 90;
const DEVICE_SESSION_COOKIE = "kid-device-session";

export type DeviceMode = "household" | "member";

export type DeviceSessionPayload = {
  deviceId: number;
  householdId: number;
  memberId: number | null;
  mode: DeviceMode;
  secret: string;
  expiresAt: number;
};

function secret() {
  return process.env.AUTH_SECRET ?? "dev-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function hashPairingCode(code: string) {
  return createHmac("sha256", secret()).update(`pair:${code}`).digest("hex");
}

export function hashDeviceSecret(deviceSecret: string) {
  return createHash("sha256").update(deviceSecret).digest("hex");
}

export function generateDeviceSecret() {
  return randomBytes(32).toString("base64url");
}

export function generatePairingCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function normalizePairingCode(code: unknown) {
  return String(code ?? "").replace(/\D/g, "").slice(0, 6);
}

export function createDeviceSessionToken(device: {
  id: number;
  householdId: number;
  memberId: number | null;
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
      typeof parsed.deviceId !== "number" ||
      typeof parsed.householdId !== "number" ||
      !(typeof parsed.memberId === "number" || parsed.memberId === null) ||
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
