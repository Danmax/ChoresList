import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deviceSession, hashDeviceSecret, requireDeviceSession } from "@/lib/device-session";
import { withErrors } from "@/lib/api";

export const GET = withErrors(async (req: NextRequest) => {
  const session = requireDeviceSession(req);
  const device = await prisma.householdDevice.findFirst({
    where: {
      id: session.deviceId,
      householdId: session.householdId,
      tokenHash: hashDeviceSecret(session.secret),
      revokedAt: null,
    },
    include: { member: { select: { id: true, name: true, avatar: true } } },
  });

  if (!device) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });

  await prisma.householdDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({
    id: device.id,
    name: device.name,
    mode: device.mode,
    member: device.member,
  });
});

export const DELETE = withErrors(async () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(deviceSession.name, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
});
