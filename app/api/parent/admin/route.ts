import { NextRequest, NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/auth-error";
import { requireOwnerSession, withErrors } from "@/lib/api";
import { cleanCommunityRole } from "@/lib/community";
import { prisma } from "@/lib/prisma";

const ACCOUNT_ROLES = new Set(["owner", "parent", "grandparent"]);
const COMMUNITY_VISIBILITIES = new Set(["private", "public"]);

function cleanInt(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

async function requireManageableCommunity(groupId: number, householdId: number) {
  const group = await prisma.communityGroup.findFirst({
    where: {
      id: groupId,
      OR: [
        { creator: { householdId } },
        { members: { some: { role: "owner", status: "active", parent: { householdId } } } },
      ],
    },
    select: { id: true },
  });
  if (!group) throw new ForbiddenError("This household does not own this community group");
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireOwnerSession(req);

  const [household, parents, familyMembers, communities] = await Promise.all([
    prisma.household.findUnique({
      where: { id: householdId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            parents: true,
            members: true,
            devices: true,
            groceryLists: true,
          },
        },
      },
    }),
    prisma.parentAccount.findMany({
      where: { householdId },
      orderBy: [{ accountRole: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        email: true,
        accountRole: true,
        emailVerified: true,
        createdAt: true,
        _count: { select: { communityMemberships: true, createdCommunityEvents: true } },
      },
    }),
    prisma.familyMember.findMany({
      where: { householdId },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        age: true,
        role: true,
        avatar: true,
        totalPoints: true,
        _count: { select: { assignments: true, devices: true } },
      },
    }),
    prisma.communityGroup.findMany({
      where: {
        OR: [
          { creator: { householdId } },
          { members: { some: { parent: { householdId } } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        groupType: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        creator: { select: { id: true, email: true, householdId: true } },
        members: {
          where: { status: "active" },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          select: {
            id: true,
            parentId: true,
            role: true,
            status: true,
            parent: { select: { id: true, email: true, householdId: true } },
          },
        },
        _count: { select: { members: true, events: true } },
      },
    }),
  ]);

  if (!household) return NextResponse.json({ error: "Household not found" }, { status: 404 });

  return NextResponse.json({
    currentParentId: parentId,
    household,
    parents,
    familyMembers,
    communities: communities.map((group) => ({
      ...group,
      ownedByHousehold: group.creator.householdId === householdId,
      manageableByHousehold:
        group.creator.householdId === householdId ||
        group.members.some((member) => member.parent.householdId === householdId && member.role === "owner"),
      currentHouseholdMembers: group.members.filter((member) => member.parent.householdId === householdId),
    })),
  });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireOwnerSession(req);
  const body = await req.json();
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "parentRole") {
    const targetParentId = cleanInt(body.parentId);
    const accountRole = typeof body.accountRole === "string" && ACCOUNT_ROLES.has(body.accountRole)
      ? body.accountRole
      : null;
    if (!targetParentId || !accountRole) {
      return NextResponse.json({ error: "Parent and role are required" }, { status: 400 });
    }

    const target = await prisma.parentAccount.findFirst({
      where: { id: targetParentId, householdId },
      select: { id: true, accountRole: true },
    });
    if (!target) return NextResponse.json({ error: "Parent user not found" }, { status: 404 });

    if (target.accountRole === "owner" && accountRole !== "owner") {
      const ownerCount = await prisma.parentAccount.count({ where: { householdId, accountRole: "owner" } });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: "At least one owner is required" }, { status: 400 });
      }
    }

    const updated = await prisma.parentAccount.update({
      where: { id: targetParentId },
      data: { accountRole },
      select: { id: true, email: true, accountRole: true, emailVerified: true, createdAt: true },
    });
    return NextResponse.json(updated);
  }

  if (action === "communityVisibility") {
    const groupId = cleanInt(body.groupId);
    const visibility = typeof body.visibility === "string" && COMMUNITY_VISIBILITIES.has(body.visibility)
      ? body.visibility
      : null;
    if (!groupId || !visibility) {
      return NextResponse.json({ error: "Community and visibility are required" }, { status: 400 });
    }
    await requireManageableCommunity(groupId, householdId);

    const group = await prisma.communityGroup.update({
      where: { id: groupId },
      data: { visibility },
      select: { id: true, visibility: true, updatedAt: true },
    });
    return NextResponse.json(group);
  }

  if (action === "communityMemberRole") {
    const groupId = cleanInt(body.groupId);
    const targetParentId = cleanInt(body.parentId);
    if (!groupId || !targetParentId) {
      return NextResponse.json({ error: "Community and member are required" }, { status: 400 });
    }
    await requireManageableCommunity(groupId, householdId);
    const role = cleanCommunityRole(body.role);

    const membership = await prisma.communityMember.findFirst({
      where: { groupId, parentId: targetParentId, parent: { householdId } },
      select: { id: true, role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Only members in this household can be changed here" }, { status: 404 });
    }
    if (membership.role === "owner" && role !== "owner") {
      const ownerCount = await prisma.communityMember.count({ where: { groupId, role: "owner", status: "active" } });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: "At least one community owner is required" }, { status: 400 });
      }
    }

    const updated = await prisma.communityMember.update({
      where: { id: membership.id },
      data: { role },
      include: { parent: { select: { id: true, email: true, householdId: true } } },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unsupported admin action" }, { status: 400 });
});
