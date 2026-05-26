import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { getBaseUrl } from "@/lib/base-url";
import { generatePairingCode, hashPairingCode } from "@/lib/device-session";

const PAIRING_TTL_MINUTES = 10;

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
  const { householdId } = requireSession(req);
  const body = await req.json();
  const mode = body.mode === "member" ? "member" : "household";
  const memberId = mode === "member" ? Number(body.memberId) : null;
  const deviceName = String(body.deviceName ?? "").trim().slice(0, 255) || "Kids task screen";

  if (mode === "member") {
    const member = await prisma.familyMember.findFirst({ where: { id: memberId ?? 0, householdId, role: "child" } });
    if (!member) return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

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
          householdId,
          memberId,
          mode,
          deviceName,
          codeHash,
          expiresAt,
        },
      });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }

  return NextResponse.json({
    id: pairingCode?.id,
    code,
    expiresAt,
    pairUrl: `${getBaseUrl(req)}/pair?code=${code}`,
  });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id") ?? 0);

  await prisma.householdDevice.update({
    where: { id, householdId },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
});
