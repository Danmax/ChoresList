import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { cleanCommunityRole, requireCommunityRole } from "@/lib/community";

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 255) : "";
}

function cleanId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export const POST = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const groupId = cleanId(body.groupId);
  if (!groupId) return NextResponse.json({ error: "Group is required" }, { status: 400 });

  const email = cleanEmail(body.email);
  const role = cleanCommunityRole(body.role);

  if (!email) {
    const group = await prisma.communityGroup.findUnique({ where: { id: groupId }, select: { id: true, visibility: true } });
    if (!group) return NextResponse.json({ error: "Community group not found" }, { status: 404 });
    if (group.visibility !== "public") {
      return NextResponse.json({ error: "This group is private" }, { status: 403 });
    }
    const member = await prisma.communityMember.upsert({
      where: { groupId_parentId: { groupId, parentId } },
      create: { groupId, parentId, role: "member", status: "active" },
      update: { status: "active" },
    });
    return NextResponse.json(member, { status: 201 });
  }

  const actor = await requireCommunityRole(groupId, parentId, role === "manager" || role === "owner" ? "owner" : "manager");
  if (role === "owner" && actor.role !== "owner") {
    return NextResponse.json({ error: "Only owners can add owners" }, { status: 403 });
  }

  const parent = await prisma.parentAccount.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!parent) return NextResponse.json({ error: "No parent account found for that email" }, { status: 404 });

  const member = await prisma.communityMember.upsert({
    where: { groupId_parentId: { groupId, parentId: parent.id } },
    create: { groupId, parentId: parent.id, role, status: "active" },
    update: { role, status: "active" },
    include: { parent: { select: { id: true, email: true } } },
  });

  return NextResponse.json(member, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const groupId = cleanId(body.groupId);
  const targetParentId = cleanId(body.parentId);
  if (!groupId || !targetParentId) {
    return NextResponse.json({ error: "Group and member are required" }, { status: 400 });
  }

  await requireCommunityRole(groupId, parentId, "owner");
  const role = body.role !== undefined ? cleanCommunityRole(body.role) : undefined;
  const status = body.status === "inactive" ? "inactive" : body.status === "active" ? "active" : undefined;

  const member = await prisma.communityMember.update({
    where: { groupId_parentId: { groupId, parentId: targetParentId } },
    data: {
      ...(role !== undefined && { role }),
      ...(status !== undefined && { status }),
    },
    include: { parent: { select: { id: true, email: true } } },
  });

  return NextResponse.json(member);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId") ?? "";
  const targetParentId = searchParams.get("parentId") ?? "";
  if (!groupId || !targetParentId) {
    return NextResponse.json({ error: "Group and member are required" }, { status: 400 });
  }

  if (targetParentId !== parentId) await requireCommunityRole(groupId, parentId, "owner");

  await prisma.communityMember.delete({ where: { groupId_parentId: { groupId, parentId: targetParentId } } });
  return NextResponse.json({ ok: true });
});
