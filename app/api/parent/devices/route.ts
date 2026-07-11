import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { getBaseUrl } from "@/lib/base-url";
import { generatePairingCode, hashPairingCode } from "@/lib/device-session";

const PAIRING_TTL_MINUTES = 10;

function cleanDeviceName(value: unknown) {
  return String(value ?? "").trim().slice(0, 255) || "Kids task screen";
}

function cleanMode(value: unknown) {
  return value === "member" ? "member" : "household";
}

async function validateChild(householdId: string, mode: string, memberId: string | null) {
  if (mode !== "member") return null;
  const member = await prisma.familyMember.findFirst({ where: { id: memberId ?? "", householdId, role: "child" } });
  return member ? member.id : null;
}

async function createPairingCode(req: NextRequest, input: {
  householdId: string;
  deviceName: string;
  mode: string;
  memberId: string | null;
  deviceId?: string | null;
}) {
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MINUTES * 60 * 1000);
  let code = generatePairingCode();
  let pairingCode = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    code = generatePairingCode();
    const codeHash = hashPairingCode(code);
    await prisma.devicePairingCode.deleteMany({
      where: {
        codeHash,
        OR: [{ usedAt: { not: null } }, { expiresAt: { lte: new Date() } }],
      },
    });
    try {
      pairingCode = await prisma.devicePairingCode.create({
        data: {
          householdId: input.householdId,
          memberId: input.memberId,
          deviceId: input.deviceId ?? null,
          mode: input.mode,
          deviceName: input.deviceName,
          codeHash,
          expiresAt,
        },
      });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }

  return {
    id: pairingCode?.id,
    code,
    expiresAt,
    pairUrl: `${getBaseUrl(req)}/pair?code=${code}`,
  };
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);

  const devices = await prisma.householdDevice.findMany({
    where: { householdId },
    include: { member: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(devices);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const mode = cleanMode(body.mode);
  const memberId = mode === "member" && typeof body.memberId === "string" ? body.memberId : null;
  const deviceName = cleanDeviceName(body.deviceName);
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : null;

  const validMemberId = await validateChild(householdId, mode, memberId);
  if (mode === "member" && !validMemberId) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  if (deviceId) {
    const device = await prisma.householdDevice.findFirst({ where: { id: deviceId, householdId } });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  return NextResponse.json(await createPairingCode(req, {
    householdId,
    memberId: mode === "member" ? validMemberId : null,
    mode,
    deviceName,
    deviceId,
  }));
});

export const PATCH = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  const mode = cleanMode(body.mode);
  const memberId = mode === "member" && typeof body.memberId === "string" ? body.memberId : null;
  const deviceName = cleanDeviceName(body.deviceName);

  const validMemberId = await validateChild(householdId, mode, memberId);
  if (mode === "member" && !validMemberId) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const device = await prisma.householdDevice.update({
    where: { id, householdId },
    data: {
      name: deviceName,
      mode,
      memberId: mode === "member" ? validMemberId : null,
    },
    include: { member: { select: { id: true, name: true, avatar: true } } },
  });

  return NextResponse.json(device);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const action = searchParams.get("action") ?? "revoke";

  if (action === "delete") {
    await prisma.householdDevice.delete({ where: { id, householdId } });
    return NextResponse.json({ ok: true });
  }

  await prisma.householdDevice.update({
    where: { id, householdId },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
});
