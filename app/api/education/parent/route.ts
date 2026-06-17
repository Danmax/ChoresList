import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { canAccessMember, childAccessWhere } from "@/lib/child-access";
import { requirePluginActive } from "@/lib/plugins/registry";
import { cleanInt, cleanOptionalText, cleanText, dateFromInput, EDUCATION_MODES, EDUCATION_SUBJECTS, parseMaterialLines } from "@/lib/education";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  await requirePluginActive(householdId, "education-academy");

  const [members, sets, assignments, projects] = await Promise.all([
    prisma.familyMember.findMany({
      where: { householdId, ...(await childAccessWhere(parentId, householdId)) },
      orderBy: { name: "asc" },
      select: { id: true, name: true, avatar: true, color: true, role: true },
    }),
    prisma.educationMaterialSet.findMany({
      where: { householdId, isActive: true },
      include: { materials: { orderBy: { sortOrder: "asc" } }, _count: { select: { assignments: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.educationAssignment.findMany({
      where: { householdId },
      include: {
        member: { select: { id: true, name: true, avatar: true, color: true } },
        set: { select: { id: true, title: true, subject: true, mode: true } },
        attempts: { orderBy: { completedAt: "desc" }, take: 3 },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.educationProject.findMany({
      where: { householdId },
      include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return NextResponse.json({ members, sets, assignments, projects });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  await requirePluginActive(householdId, "education-academy");
  const body = await req.json();
  const action = typeof body.action === "string" ? body.action : "set";

  if (action === "assignment") {
    const memberId = typeof body.memberId === "string" ? body.memberId : "";
    const setId = typeof body.setId === "string" ? body.setId : "";
    if (!(await canAccessMember(parentId, householdId, memberId))) {
      return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
    }
    const set = await prisma.educationMaterialSet.findFirst({ where: { id: setId, householdId, isActive: true } });
    if (!set) return NextResponse.json({ error: "Material set not found" }, { status: 404 });

    const assignment = await prisma.educationAssignment.create({
      data: {
        householdId,
        memberId,
        setId,
        title: cleanText(body.title, set.title, 255),
        dueDate: dateFromInput(body.dueDate),
        passingScore: cleanInt(body.passingScore, set.passingScore, 1, 100),
        pointsReward: cleanInt(body.pointsReward, set.pointsReward, 0, 500),
      },
      include: {
        member: { select: { id: true, name: true, avatar: true, color: true } },
        set: { select: { id: true, title: true, subject: true, mode: true } },
        attempts: true,
      },
    });
    return NextResponse.json(assignment, { status: 201 });
  }

  if (action === "project") {
    const memberId = typeof body.memberId === "string" && body.memberId ? body.memberId : null;
    if (memberId && !(await canAccessMember(parentId, householdId, memberId))) {
      return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
    }
    const title = cleanText(body.title, "", 255);
    if (!title) return NextResponse.json({ error: "Project title is required" }, { status: 400 });
    const project = await prisma.educationProject.create({
      data: {
        householdId,
        memberId,
        title,
        subject: EDUCATION_SUBJECTS.has(body.subject) ? body.subject : "project",
        description: cleanOptionalText(body.description, 2000),
        rubric: cleanOptionalText(body.rubric, 2000),
        dueDate: dateFromInput(body.dueDate),
        pointsReward: cleanInt(body.pointsReward, 25, 0, 500),
      },
      include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
    });
    return NextResponse.json(project, { status: 201 });
  }

  const title = cleanText(body.title, "", 255);
  const materials = parseMaterialLines(body.materialsText);
  if (!title || materials.length === 0) {
    return NextResponse.json({ error: "Title and at least one material line are required" }, { status: 400 });
  }

  const set = await prisma.educationMaterialSet.create({
    data: {
      householdId,
      title,
      subject: EDUCATION_SUBJECTS.has(body.subject) ? body.subject : "vocabulary",
      mode: EDUCATION_MODES.has(body.mode) ? body.mode : "drill",
      description: cleanOptionalText(body.description, 2000),
      passingScore: cleanInt(body.passingScore, 85, 1, 100),
      pointsReward: cleanInt(body.pointsReward, 10, 0, 500),
      materials: {
        create: materials.map((material) => ({
          prompt: material.prompt,
          answer: material.answer,
          choices: material.choices,
          explanation: material.explanation,
          sortOrder: material.sortOrder,
        })),
      },
    },
    include: { materials: { orderBy: { sortOrder: "asc" } }, _count: { select: { assignments: true } } },
  });
  return NextResponse.json(set, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  await requirePluginActive(householdId, "education-academy");
  const body = await req.json();

  if (body.action === "project") {
    const id = typeof body.id === "string" ? body.id : "";
    const project = await prisma.educationProject.findFirst({ where: { id, householdId }, select: { memberId: true, pointsReward: true, status: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (project.memberId && !(await canAccessMember(parentId, householdId, project.memberId))) {
      return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
    }

    const status = body.status === "completed" ? "completed" : body.status === "archived" ? "archived" : body.status === "submitted" ? "submitted" : "open";
    const completedNow = status === "completed" && project.status !== "completed";
    const updated = await prisma.$transaction(async (tx) => {
      const nextProject = await tx.educationProject.update({
        where: { id },
        data: { status, completedAt: status === "completed" ? new Date() : null },
        include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
      });
      if (completedNow && project.memberId && project.pointsReward > 0) {
        await tx.familyMember.update({ where: { id: project.memberId }, data: { totalPoints: { increment: project.pointsReward } } });
      }
      return nextProject;
    });

    return NextResponse.json(updated);
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status === "completed" ? "completed" : body.status === "archived" ? "archived" : "assigned";
  const assignment = await prisma.educationAssignment.findFirst({ where: { id, householdId }, select: { memberId: true } });
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  if (!(await canAccessMember(parentId, householdId, assignment.memberId))) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }
  const updated = await prisma.educationAssignment.update({
    where: { id },
    data: { status, completedAt: status === "completed" ? new Date() : null },
    include: {
      member: { select: { id: true, name: true, avatar: true, color: true } },
      set: { select: { id: true, title: true, subject: true, mode: true } },
      attempts: { orderBy: { completedAt: "desc" }, take: 3 },
    },
  });
  return NextResponse.json(updated);
});
