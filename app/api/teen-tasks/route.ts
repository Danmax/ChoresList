import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { canAccessMember } from "@/lib/child-access";

const FREQUENCIES = new Set(["daily", "weekly"]);

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function teenMember(householdId: string, memberId: string) {
  return prisma.familyMember.findFirst({
    where: { id: memberId, householdId, age: { gte: 12, lte: 18 }, role: { in: ["child", "young-adult"] } },
    select: { id: true, age: true },
  });
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const memberId = req.nextUrl.searchParams.get("memberId") ?? "";
  const proposals = await prisma.teenTaskProposal.findMany({
    where: { householdId, ...(memberId && { memberId }) },
    include: { member: { select: { id: true, name: true, age: true, avatar: true } }, chore: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(proposals);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const body = await req.json();
  const memberId = text(body.memberId, 36);
  const member = await teenMember(householdId, memberId);
  if (!member) return NextResponse.json({ error: "This feature is for family members ages 12–18." }, { status: 403 });

  const choreId = text(body.choreId, 36) || null;
  const chore = choreId ? await prisma.chore.findFirst({ where: { id: choreId, householdId, ageMin: { lte: member.age }, ageMax: { gte: member.age } } }) : null;
  const title = chore?.name ?? text(body.title, 120);
  if (!title) return NextResponse.json({ error: "Give the task a name." }, { status: 400 });
  const duplicate = await prisma.teenTaskProposal.findFirst({ where: { householdId, memberId, status: "pending", ...(choreId ? { choreId } : { title }) } });
  if (duplicate) return NextResponse.json({ error: "This task is already waiting for parent approval." }, { status: 409 });

  const frequency = FREQUENCIES.has(body.frequency) ? body.frequency : "weekly";
  const proposal = await prisma.teenTaskProposal.create({
    data: {
      householdId, memberId, choreId: chore?.id ?? null, title,
      description: chore ? chore.description : (text(body.description, 500) || null),
      icon: chore?.icon ?? (text(body.icon, 32) || "✅"),
      category: chore?.category ?? (text(body.category, 64) || "other"),
      frequency,
    },
  });
  return NextResponse.json(proposal, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  const body = await req.json();
  const proposal = await prisma.teenTaskProposal.findFirst({ where: { id: text(body.id, 36), householdId, status: "pending" } });
  if (!proposal || !(await canAccessMember(parentId, householdId, proposal.memberId))) return NextResponse.json({ error: "Task request not found." }, { status: 404 });
  if (body.action !== "approve" && body.action !== "decline") {
    return NextResponse.json({ error: "Choose whether to approve or decline the task request." }, { status: 400 });
  }
  const approved = body.action === "approve";
  const parentNote = text(body.parentNote, 500) || null;
  if (!approved) {
    return NextResponse.json(await prisma.teenTaskProposal.update({ where: { id: proposal.id }, data: { status: "declined", parentNote, reviewedAt: new Date() } }));
  }
  const pointsValue = Math.min(100, Math.max(5, Math.round(Number(body.pointsValue) || 20)));
  const frequency = FREQUENCIES.has(body.frequency) ? body.frequency : proposal.frequency;
  const result = await prisma.$transaction(async (tx) => {
    const chore = proposal.choreId
      ? await tx.chore.findFirst({ where: { id: proposal.choreId, householdId } })
      : await tx.chore.create({ data: { householdId, name: proposal.title, description: proposal.description, icon: proposal.icon, category: proposal.category, ageMin: 12, ageMax: 18, pointsValue } });
    if (!chore) throw new Error("Selected chore no longer exists");
    const assignment = await tx.choreAssignment.create({ data: { householdId, memberId: proposal.memberId, choreId: chore.id, frequency }, include: { chore: true } });
    const reviewed = await tx.teenTaskProposal.update({ where: { id: proposal.id }, data: { status: "approved", parentNote, reviewedAt: new Date() } });
    return { reviewed, assignment };
  });
  return NextResponse.json(result);
});
