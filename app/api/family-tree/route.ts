import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { requirePluginActive } from "@/lib/plugins/registry";
import { syncHouseholdFamilyTree } from "@/lib/family-tree";

const NODE_KINDS = new Set(["external"]);
const RELATIONSHIP_TYPES = new Set([
  "parent_child",
  "spouse_partner",
  "guardian",
  "step_parent",
  "adoptive_parent",
  "grandparent_grandchild",
  "sibling",
  "other",
]);

function cleanText(value: unknown, fallback = "", max = 255) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function cleanOptionalText(value: unknown, max = 255) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function cleanInt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function cleanId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanBirthday(monthValue: unknown, dayValue: unknown) {
  const birthdayMonth = cleanInt(monthValue);
  const birthdayDay = cleanInt(dayValue);
  if (birthdayMonth === null && birthdayDay === null) return { birthdayMonth: null, birthdayDay: null };
  if (birthdayMonth === null || birthdayDay === null || birthdayMonth < 1 || birthdayMonth > 12) {
    return { birthdayMonth: null, birthdayDay: null };
  }
  const maxDay = new Date(2024, birthdayMonth, 0).getDate();
  if (birthdayDay < 1 || birthdayDay > maxDay) return { birthdayMonth: null, birthdayDay: null };
  return { birthdayMonth, birthdayDay };
}

async function treePayload(householdId: string) {
  await syncHouseholdFamilyTree(householdId);
  const [nodes, relationships] = await Promise.all([
    prisma.familyTreeNode.findMany({ where: { householdId }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.familyTreeRelationship.findMany({ where: { householdId }, orderBy: [{ relationshipType: "asc" }, { id: "asc" }] }),
  ]);

  return {
    nodes,
    relationships,
    relationshipTypes: Array.from(RELATIONSHIP_TYPES),
  };
}

async function ensureNode(householdId: string, id: string | null) {
  if (!id) return null;
  return prisma.familyTreeNode.findFirst({ where: { householdId, id }, select: { id: true } });
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  await requirePluginActive(householdId, "family-tree");
  return NextResponse.json(await treePayload(householdId));
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  await requirePluginActive(householdId, "family-tree");
  const body = await req.json();

  if (body.type === "relationship") {
    const fromNodeId = cleanId(body.fromNodeId);
    const toNodeId = cleanId(body.toNodeId);
    const relationshipType = RELATIONSHIP_TYPES.has(body.relationshipType) ? body.relationshipType : "other";
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) {
      return NextResponse.json({ error: "Choose two different people" }, { status: 400 });
    }
    const [fromNode, toNode] = await Promise.all([ensureNode(householdId, fromNodeId), ensureNode(householdId, toNodeId)]);
    if (!fromNode || !toNode) return NextResponse.json({ error: "Both people must belong to this household tree" }, { status: 400 });

    await prisma.familyTreeRelationship.create({
      data: {
        householdId,
        fromNodeId,
        toNodeId,
        relationshipType,
        label: cleanOptionalText(body.label, 128),
        notes: cleanOptionalText(body.notes, 1000),
      },
    });
    return NextResponse.json(await treePayload(householdId), { status: 201 });
  }

  const kind = NODE_KINDS.has(body.kind) ? body.kind : "external";
  const name = cleanText(body.name, "", 80);
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const birthday = cleanBirthday(body.birthdayMonth, body.birthdayDay);
  const birthYear = cleanInt(body.birthYear);

  await prisma.familyTreeNode.create({
    data: {
      householdId,
      kind,
      name,
      avatar: cleanText(body.avatar, "👤", 32),
      color: cleanText(body.color, "#a78bfa", 32),
      birthYear: birthYear && birthYear > 1800 && birthYear < 2200 ? birthYear : null,
      ...birthday,
      notes: cleanOptionalText(body.notes, 1000),
    },
  });

  return NextResponse.json(await treePayload(householdId), { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  await requirePluginActive(householdId, "family-tree");
  const body = await req.json();
  const id = cleanId(body.id);
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  if (body.type === "relationship") {
    const existing = await prisma.familyTreeRelationship.findFirst({ where: { id, householdId } });
    if (!existing) return NextResponse.json({ error: "Relationship not found" }, { status: 404 });

    const fromNodeId = body.fromNodeId !== undefined ? cleanId(body.fromNodeId) : existing.fromNodeId;
    const toNodeId = body.toNodeId !== undefined ? cleanId(body.toNodeId) : existing.toNodeId;
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) {
      return NextResponse.json({ error: "Choose two different people" }, { status: 400 });
    }
    const [fromNode, toNode] = await Promise.all([ensureNode(householdId, fromNodeId), ensureNode(householdId, toNodeId)]);
    if (!fromNode || !toNode) return NextResponse.json({ error: "Both people must belong to this household tree" }, { status: 400 });

    await prisma.familyTreeRelationship.update({
      where: { id },
      data: {
        fromNodeId,
        toNodeId,
        relationshipType: RELATIONSHIP_TYPES.has(body.relationshipType) ? body.relationshipType : existing.relationshipType,
        label: body.label !== undefined ? cleanOptionalText(body.label, 128) : undefined,
        notes: body.notes !== undefined ? cleanOptionalText(body.notes, 1000) : undefined,
      },
    });
    return NextResponse.json(await treePayload(householdId));
  }

  const existing = await prisma.familyTreeNode.findFirst({ where: { id, householdId } });
  if (!existing) return NextResponse.json({ error: "Person not found" }, { status: 404 });
  const name = body.name !== undefined ? cleanText(body.name, "", 80) : undefined;
  if (name !== undefined && !name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const birthday = body.birthdayMonth !== undefined || body.birthdayDay !== undefined
    ? cleanBirthday(body.birthdayMonth, body.birthdayDay)
    : undefined;
  const birthYear = body.birthYear !== undefined ? cleanInt(body.birthYear) : undefined;

  await prisma.familyTreeNode.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(body.avatar !== undefined && { avatar: cleanText(body.avatar, "👤", 32) }),
      ...(body.color !== undefined && { color: cleanText(body.color, "#a78bfa", 32) }),
      ...(birthYear !== undefined && { birthYear: birthYear && birthYear > 1800 && birthYear < 2200 ? birthYear : null }),
      ...(birthday !== undefined && birthday),
      ...(body.notes !== undefined && { notes: cleanOptionalText(body.notes, 1000) }),
      ...(body.x !== undefined && { x: cleanInt(body.x) }),
      ...(body.y !== undefined && { y: cleanInt(body.y) }),
    },
  });
  return NextResponse.json(await treePayload(householdId));
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  await requirePluginActive(householdId, "family-tree");
  const body = await req.json().catch(() => ({}));
  const id = cleanId(body.id);
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  if (body.type === "relationship") {
    await prisma.familyTreeRelationship.deleteMany({ where: { id, householdId } });
    return NextResponse.json(await treePayload(householdId));
  }

  const node = await prisma.familyTreeNode.findFirst({ where: { id, householdId }, select: { kind: true } });
  if (!node) return NextResponse.json({ error: "Person not found" }, { status: 404 });
  if (node.kind !== "external") {
    return NextResponse.json({ error: "Family member and parent nodes are managed from Family Members" }, { status: 400 });
  }
  await prisma.familyTreeNode.delete({ where: { id } });
  return NextResponse.json(await treePayload(householdId));
});
