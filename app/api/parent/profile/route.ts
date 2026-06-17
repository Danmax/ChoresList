import { NextRequest, NextResponse } from "next/server";
import { requireParentSession, withErrors } from "@/lib/api";
import { ensureParentFamilyMember } from "@/lib/parent-member";
import { prisma } from "@/lib/prisma";

const PARENT_TYPES = new Set(["mom", "dad", "parent", "stepmom", "stepdad", "guardian", "grandparent", "young-adult", "other"]);
const ACCESS_MODES = new Set(["all", "selected", "none"]);

function cleanText(value: unknown, fallback = "", max = 128) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function cleanParentType(value: unknown) {
  return typeof value === "string" && PARENT_TYPES.has(value) ? value : "parent";
}

function cleanAccessMode(value: unknown) {
  return typeof value === "string" && ACCESS_MODES.has(value) ? value : "all";
}

function cleanIds(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0)))
    : [];
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  const parent = await prisma.parentAccount.findFirst({
    where: { id: parentId, householdId },
    select: {
      id: true,
      email: true,
      accountRole: true,
      displayName: true,
      parentType: true,
      relationshipLabel: true,
      childAccessMode: true,
      childAccessMemberIds: true,
    },
  });
  if (!parent) return NextResponse.json({ error: "Parent account not found" }, { status: 404 });
  return NextResponse.json(parent);
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  const body = await req.json();
  const childAccessMode = cleanAccessMode(body.childAccessMode);
  const requestedIds = cleanIds(body.childAccessMemberIds);
  const validMembers = requestedIds.length
    ? await prisma.familyMember.findMany({
        where: { householdId, id: { in: requestedIds } },
        select: { id: true },
      })
    : [];
  const validIds = validMembers.map((member) => member.id);

  const parent = await prisma.parentAccount.update({
    where: { id: parentId, householdId },
    data: {
      displayName: cleanText(body.displayName, "", 80) || null,
      parentType: cleanParentType(body.parentType),
      relationshipLabel: cleanText(body.relationshipLabel, "", 128) || null,
      childAccessMode,
      childAccessMemberIds: childAccessMode === "selected" ? validIds : [],
    },
    select: {
      id: true,
      email: true,
      accountRole: true,
      displayName: true,
      parentType: true,
      relationshipLabel: true,
      childAccessMode: true,
      childAccessMemberIds: true,
    },
  });

  await ensureParentFamilyMember(parentId, householdId);

  return NextResponse.json(parent);
});
