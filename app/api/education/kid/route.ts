import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { canAccessMember } from "@/lib/child-access";
import { requirePluginActive } from "@/lib/plugins/registry";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  await requirePluginActive(householdId, "education-academy");
  const { searchParams } = new URL(req.url);
  const memberId = Number(searchParams.get("memberId"));
  if (!(await canAccessMember(parentId, householdId, memberId))) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }

  const [member, assignments, projects] = await Promise.all([
    prisma.familyMember.findFirst({
      where: { id: memberId, householdId },
      select: { id: true, name: true, avatar: true, color: true, totalPoints: true },
    }),
    prisma.educationAssignment.findMany({
      where: { householdId, memberId, status: { not: "archived" } },
      include: {
        set: {
          include: {
            materials: { orderBy: { sortOrder: "asc" } },
          },
        },
        attempts: { orderBy: { completedAt: "desc" }, take: 3 },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.educationProject.findMany({
      where: { householdId, memberId, status: "open" },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  return NextResponse.json({ member, assignments, projects });
});
