import { prisma } from "@/lib/prisma";

type ChildAccessWhere =
  | {}
  | { parentAccountId: string }
  | { OR: Array<{ id: { in: string[] } } | { parentAccountId: string }> };

function idsFromJson(value: unknown) {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
}

export async function childAccessWhere(parentId: string, householdId: string): Promise<ChildAccessWhere> {
  const parent = await prisma.parentAccount.findFirst({
    where: { id: parentId, householdId },
    select: { childAccessMode: true, childAccessMemberIds: true },
  });

  if (!parent || parent.childAccessMode === "all") return {};
  if (parent.childAccessMode === "none") return { parentAccountId: parentId };

  const ids = idsFromJson(parent.childAccessMemberIds);
  return { OR: [{ id: { in: ids.length ? ids : [""] } }, { parentAccountId: parentId }] };
}

export async function canAccessMember(parentId: string, householdId: string, memberId: string) {
  const member = await prisma.familyMember.findFirst({
    where: { id: memberId, householdId },
    select: { parentAccountId: true },
  });
  if (member?.parentAccountId === parentId) return true;

  const where = await childAccessWhere(parentId, householdId);
  if (!("OR" in where) && !("parentAccountId" in where)) return true;
  if ("parentAccountId" in where) return false;
  return where.OR.some((clause) => "id" in clause && clause.id.in.includes(memberId));
}
