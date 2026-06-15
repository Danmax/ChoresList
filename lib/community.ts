import { ForbiddenError } from "@/lib/auth-error";
import { prisma } from "@/lib/prisma";

export type CommunityRole = "owner" | "manager" | "member";

const ROLE_RANK: Record<CommunityRole, number> = {
  member: 1,
  manager: 2,
  owner: 3,
};

export function cleanCommunityRole(value: unknown): CommunityRole {
  return value === "owner" || value === "manager" || value === "member" ? value : "member";
}

export async function getCommunityMembership(groupId: number, parentId: number) {
  return prisma.communityMember.findFirst({
    where: { groupId, parentId, status: "active" },
    include: { parent: { select: { id: true, email: true } } },
  });
}

export async function requireCommunityRole(groupId: number, parentId: number, minimum: CommunityRole) {
  const membership = await getCommunityMembership(groupId, parentId);
  if (!membership) throw new ForbiddenError("Join this community group before doing that");

  const role = cleanCommunityRole(membership.role);
  if (ROLE_RANK[role] < ROLE_RANK[minimum]) {
    throw new ForbiddenError("You do not have permission to manage this community group");
  }

  return { ...membership, role };
}

export async function requireEventCommunityRole(eventId: number, parentId: number, minimum: CommunityRole) {
  const event = await prisma.communityEvent.findUnique({
    where: { id: eventId },
    select: { id: true, groupId: true },
  });
  if (!event) throw new Error("Community event not found");
  const membership = await requireCommunityRole(event.groupId, parentId, minimum);
  return { event, membership };
}
