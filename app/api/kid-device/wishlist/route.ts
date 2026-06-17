import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";
import { hashDeviceSecret, requireDeviceSession } from "@/lib/device-session";

async function verifyDevice(req: NextRequest) {
  const session = requireDeviceSession(req);
  const device = await prisma.householdDevice.findFirst({
    where: {
      id: session.deviceId,
      householdId: session.householdId,
      tokenHash: hashDeviceSecret(session.secret),
      revokedAt: null,
    },
  });
  if (!device) return null;
  return session;
}

export const POST = withErrors(async (req: NextRequest) => {
  const session = await verifyDevice(req);
  if (!session) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });

  const body = await req.json();
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!memberId) {
    return NextResponse.json({ error: "Choose a child" }, { status: 400 });
  }
  if (session.mode === "member" && session.memberId !== memberId) {
    return NextResponse.json({ error: "This device can only add wishes for its paired child" }, { status: 403 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Add a wish title" }, { status: 400 });

  const member = await prisma.familyMember.findFirst({
    where: { id: memberId, householdId: session.householdId, role: "child" },
  });
  if (!member) return NextResponse.json({ error: "Child not found" }, { status: 404 });

  const item = await prisma.wishListItem.create({
    data: {
      householdId: session.householdId,
      memberId,
      title,
      category: typeof body.category === "string" ? body.category : "other",
      emoji: typeof body.emoji === "string" ? body.emoji : "🎁",
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
    },
  });

  await prisma.householdDevice.update({
    where: { id: session.deviceId },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json(item, { status: 201 });
});
