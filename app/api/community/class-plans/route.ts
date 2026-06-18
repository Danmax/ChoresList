import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requireEventCommunityRole } from "@/lib/community";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function cleanRequiredText(value: unknown, fallback: string, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function cleanInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

const classPlanInclude = {
  skill: { select: { id: true, name: true, icon: true } },
  badge: { select: { id: true, title: true, icon: true } },
} as const;

export const GET = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId") ?? "";
  if (!eventId) return NextResponse.json({ error: "Event is required" }, { status: 400 });

  await requireEventCommunityRole(eventId, parentId, "member");
  const plan = await prisma.communityClassPlan.findUnique({
    where: { eventId },
    include: classPlanInclude,
  });
  return NextResponse.json(plan);
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  if (!eventId) return NextResponse.json({ error: "Event is required" }, { status: 400 });

  const { event } = await requireEventCommunityRole(eventId, parentId, "manager");
  const skillId = typeof body.skillId === "string" && body.skillId ? body.skillId : null;
  const badgeId = typeof body.badgeId === "string" && body.badgeId ? body.badgeId : null;

  if (skillId) {
    const skill = await prisma.skillCategory.findFirst({ where: { id: skillId }, select: { id: true } });
    if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }
  if (badgeId) {
    const badge = await prisma.meritBadge.findFirst({
      where: { id: badgeId, OR: [{ communityGroupId: event.groupId }, { communityGroupId: null }] },
      select: { id: true },
    });
    if (!badge) return NextResponse.json({ error: "Badge not found" }, { status: 404 });
  }

  const plan = await prisma.communityClassPlan.upsert({
    where: { eventId },
    create: {
      eventId,
      skillId,
      badgeId,
      lessonTitle: cleanRequiredText(body.lessonTitle, "Class lesson", 255),
      objectives: cleanText(body.objectives, 3000),
      materials: cleanText(body.materials, 3000),
      agenda: cleanText(body.agenda, 3000),
      homework: cleanText(body.homework, 2000),
      testInstructions: cleanText(body.testInstructions, 2000),
      attendanceXp: cleanInt(body.attendanceXp, 5, 0, 100),
    },
    update: {
      skillId,
      badgeId,
      lessonTitle: cleanRequiredText(body.lessonTitle, "Class lesson", 255),
      objectives: cleanText(body.objectives, 3000),
      materials: cleanText(body.materials, 3000),
      agenda: cleanText(body.agenda, 3000),
      homework: cleanText(body.homework, 2000),
      testInstructions: cleanText(body.testInstructions, 2000),
      attendanceXp: cleanInt(body.attendanceXp, 5, 0, 100),
    },
    include: classPlanInclude,
  });

  return NextResponse.json(plan);
});
