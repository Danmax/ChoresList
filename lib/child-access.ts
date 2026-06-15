import { prisma } from "@/lib/prisma";

type ChildAccessWhere = {} | { id: -1 } | { id: { in: number[] } };

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
  if (parent.childAccessMode === "none") return { id: -1 };

  const ids = idsFromJson(parent.childAccessMemberIds);
  return { id: { in: ids.length ? ids : [-1] } };
}

export async function canAccessMember(parentId: number, householdId: number, memberId: number) {
  const where = await childAccessWhere(parentId, householdId);
  if (!("id" in where)) return true;
  if (where.id === -1) return false;
  return where.id.in.includes(memberId);
}
