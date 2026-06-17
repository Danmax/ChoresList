import { prisma } from "@/lib/prisma";

type ChildAccessWhere =
  | {}
  | { parentAccountId: number }
  | { OR: Array<{ id: { in: number[] } } | { parentAccountId: number }> };

function idsFromJson(value: unknown) {
  return Array.isArray(value)
    ? value.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];
}

export async function childAccessWhere(parentId: number, householdId: number): Promise<ChildAccessWhere> {
  const parent = await prisma.parentAccount.findFirst({
    where: { id: parentId, householdId },
    select: { childAccessMode: true, childAccessMemberIds: true },
  });

  if (!parent || parent.childAccessMode === "all") return {};
  if (parent.childAccessMode === "none") return { parentAccountId: parentId };

  const ids = idsFromJson(parent.childAccessMemberIds);
  return { OR: [{ id: { in: ids.length ? ids : [-1] } }, { parentAccountId: parentId }] };
}

export async function canAccessMember(parentId: number, householdId: number, memberId: number) {
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
