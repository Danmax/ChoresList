import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requireEventCommunityRole } from "@/lib/community";
import { awardSkillXp, resolveHouseholdSkillByName } from "@/lib/skills";

const ATTENDANCE_STATUSES = new Set(["registered", "present", "late", "excused", "absent"]);

function cleanStatus(value: unknown) {
  return typeof value === "string" && ATTENDANCE_STATUSES.has(value) ? value : "present";
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

const attendanceInclude = {
  participant: {
    include: {
      member: { select: { id: true, householdId: true, name: true, avatar: true, color: true } },
      parent: { select: { id: true, displayName: true, relationshipLabel: true, email: true } },
    },
  },
} as const;

export const GET = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId") ?? "";
  if (!eventId) return NextResponse.json({ error: "Event is required" }, { status: 400 });

  await requireEventCommunityRole(eventId, parentId, "member");
  const attendance = await prisma.communityEventAttendance.findMany({
    where: { eventId },
    include: attendanceInclude,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(attendance);
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  if (!eventId) return NextResponse.json({ error: "Event is required" }, { status: 400 });

  await requireEventCommunityRole(eventId, parentId, "manager");
  const rows = Array.isArray(body.attendance) ? body.attendance.slice(0, 200) : [];
  const event = await prisma.communityEvent.findUnique({
    where: { id: eventId },
    include: { classPlan: { include: { skill: true } } },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const updated = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const row of rows) {
      const input = row && typeof row === "object" ? row as Record<string, unknown> : {};
      const participantId = typeof input.participantId === "string" ? input.participantId : "";
      if (!participantId) continue;
      const participant = await tx.communityParticipant.findFirst({
        where: { id: participantId, groupId: event.groupId, status: "active" },
        include: { member: { select: { id: true, householdId: true } } },
      });
      if (!participant) continue;

      const status = cleanStatus(input.status);
      const attendance = await tx.communityEventAttendance.upsert({
        where: { eventId_participantId: { eventId, participantId } },
        create: {
          eventId,
          participantId,
          status,
          notes: cleanText(input.notes, 1000),
          checkedInAt: status === "present" || status === "late" ? new Date() : null,
          checkedInByParentId: status === "present" || status === "late" ? parentId : null,
        },
        update: {
          status,
          notes: cleanText(input.notes, 1000),
          checkedInAt: status === "present" || status === "late" ? new Date() : null,
          checkedInByParentId: status === "present" || status === "late" ? parentId : null,
        },
        include: attendanceInclude,
      });

      if ((status === "present" || status === "late") && event.classPlan?.skill?.name && event.classPlan.attendanceXp > 0) {
        const skillId = await resolveHouseholdSkillByName(tx, {
          householdId: participant.member.householdId,
          skillName: event.classPlan.skill.name,
        });
        if (skillId) {
          await awardSkillXp(tx, {
            householdId: participant.member.householdId,
            memberId: participant.memberId,
            skillId,
            xp: event.classPlan.attendanceXp,
            sourceType: "community_attendance",
            sourceId: attendance.id,
            note: `Attendance for ${event.title}`,
            awardedByParentId: parentId,
          });
        }
      }

      results.push(attendance);
    }
    return results;
  });

  return NextResponse.json(updated);
});
