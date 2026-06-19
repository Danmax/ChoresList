import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";
import { hashDeviceSecret, requireDeviceSession } from "@/lib/device-session";

const MOODS = new Set(["great", "awesome", "cool", "good", "okay", "low", "sad", "frustrated", "tired", "overwhelmed"]);

async function verifiedDevice(req: NextRequest) {
  const session = requireDeviceSession(req);
  const device = await prisma.householdDevice.findFirst({
    where: { id: session.deviceId, householdId: session.householdId, tokenHash: hashDeviceSecret(session.secret), revokedAt: null },
  });
  return device ? { session, device } : null;
}

export const GET = withErrors(async (req: NextRequest) => {
  const verified = await verifiedDevice(req);
  if (!verified) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });
  const { session } = verified;
  const memberWhere = {
    householdId: session.householdId,
    role: { in: ["child", "young-adult"] },
    ...(session.mode === "member" && session.memberId ? { id: session.memberId } : {}),
  };
  const members = await prisma.familyMember.findMany({
    where: memberWhere,
    select: { id: true, name: true, avatar: true, color: true, totalPoints: true, level: true },
    orderBy: { name: "asc" },
  });
  const memberIds = members.map((member) => member.id);
  const now = new Date();

  const [education, projects, rewards, badges, classes, potlucks] = await Promise.all([
    prisma.educationAssignment.findMany({
      where: { householdId: session.householdId, memberId: { in: memberIds }, status: { not: "archived" } },
      select: {
        id: true, memberId: true, title: true, dueDate: true, status: true, passingScore: true, pointsReward: true,
        member: { select: { name: true, avatar: true } },
        set: { select: { subject: true, mode: true, _count: { select: { materials: true } } } },
        attempts: { orderBy: { completedAt: "desc" }, take: 1, select: { score: true, passed: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    prisma.educationProject.findMany({
      where: { householdId: session.householdId, memberId: { in: memberIds }, status: { in: ["open", "submitted"] } },
      select: { id: true, memberId: true, title: true, subject: true, description: true, dueDate: true, status: true, pointsReward: true, member: { select: { name: true, avatar: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.rewardTicket.findMany({
      where: { householdId: session.householdId, memberId: { in: memberIds } },
      select: { id: true, memberId: true, rewardTitle: true, rewardEmoji: true, status: true, earnedAt: true, member: { select: { name: true, avatar: true } }, project: { select: { title: true } } },
      orderBy: { earnedAt: "desc" }, take: 30,
    }),
    prisma.memberBadge.findMany({
      where: { householdId: session.householdId, memberId: { in: memberIds } },
      select: { id: true, memberId: true, awardedAt: true, note: true, member: { select: { name: true, avatar: true } }, badge: { select: { title: true, icon: true, description: true, xpReward: true } }, group: { select: { name: true } } },
      orderBy: { awardedAt: "desc" }, take: 30,
    }),
    prisma.communityEvent.findMany({
      where: {
        date: { gte: now }, eventType: { in: ["class", "workshop", "practice"] },
        OR: [
          { group: { participants: { some: { memberId: { in: memberIds }, status: "active" } } } },
          { group: { members: { some: { status: "active", parent: { householdId: session.householdId } } } } },
        ],
      },
      select: { id: true, title: true, eventType: true, date: true, endDate: true, location: true, group: { select: { name: true } }, classPlan: { select: { lessonTitle: true, objectives: true, homework: true, badge: { select: { title: true, icon: true } } } } },
      orderBy: { date: "asc" }, take: 20,
    }),
    prisma.communityEvent.findMany({
      where: {
        date: { gte: now }, eventType: "potluck",
        group: { members: { some: { status: "active", parent: { householdId: session.householdId } } } },
      },
      select: {
        id: true, title: true, date: true, location: true, group: { select: { name: true } },
        items: {
          where: { OR: [{ assignedTo: { householdId: session.householdId } }, { claimedBy: { householdId: session.householdId } }] },
          select: { id: true, title: true, quantity: true, note: true, claimNote: true, status: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { date: "asc" }, take: 20,
    }),
  ]);

  await prisma.householdDevice.update({ where: { id: session.deviceId }, data: { lastSeenAt: new Date() } });
  return NextResponse.json({ members, education, projects, rewards, badges, classes, potlucks: potlucks.filter((event) => event.items.length > 0) });
});

export const POST = withErrors(async (req: NextRequest) => {
  const verified = await verifiedDevice(req);
  if (!verified) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });
  const { session } = verified;
  const body = await req.json();
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  const targetMemberId = session.mode === "member" && session.memberId ? session.memberId : memberId;
  const mood = typeof body.mood === "string" && MOODS.has(body.mood) ? body.mood : "";
  const member = await prisma.familyMember.findFirst({
    where: { id: targetMemberId, householdId: session.householdId },
    select: { id: true },
  });
  if (!member || !mood) return NextResponse.json({ error: "Family member and emotion are required" }, { status: 400 });
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 1000) : null;
  const checkIn = await prisma.wellbeingCheckIn.create({
    data: { householdId: session.householdId, memberId: targetMemberId, recordedByDeviceId: session.deviceId, mood, note, supportRequested: body.supportRequested === true },
  });
  return NextResponse.json(checkIn, { status: 201 });
});
