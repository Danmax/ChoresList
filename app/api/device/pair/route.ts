import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PAIRING_CODE_LENGTH,
  createDeviceSessionToken,
  deviceSession,
  generateDeviceSecret,
  hashDeviceSecret,
  hashPairingCode,
  normalizePairingCode,
} from "@/lib/device-session";
import { withErrors } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export const POST = withErrors(async (req: NextRequest) => {
  const limited = rateLimit(req, { key: "device-pair", limit: 8, windowMs: 10 * 60_000 });
  if (limited) return limited;

  const body = await req.json();
  const code = normalizePairingCode(body.code);

  if (code.length !== PAIRING_CODE_LENGTH) {
    return NextResponse.json({ error: `Enter the ${PAIRING_CODE_LENGTH} digit code` }, { status: 400 });
  }

  const pairingCode = await prisma.devicePairingCode.findFirst({
    where: {
      codeHash: hashPairingCode(code),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!pairingCode) {
    return NextResponse.json({ error: "That code is invalid or expired" }, { status: 404 });
  }

  const deviceSecret = generateDeviceSecret();
  const device = await prisma.householdDevice.create({
    data: {
      householdId: pairingCode.householdId,
      memberId: pairingCode.memberId,
      mode: pairingCode.mode,
      name: pairingCode.deviceName,
      tokenHash: hashDeviceSecret(deviceSecret),
      lastSeenAt: new Date(),
    },
  });

  await prisma.devicePairingCode.update({
    where: { id: pairingCode.id },
    data: { usedAt: new Date() },
  });

  const token = createDeviceSessionToken({ ...device, secret: deviceSecret });
  const response = NextResponse.json({ ok: true, redirectTo: "/screen/tasks" });
  response.cookies.set(deviceSession.name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
    path: "/",
    maxAge: deviceSession.maxAge,
  });

  return response;
});
