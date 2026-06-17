import { prisma } from "@/lib/prisma";

type ParentForMember = {
  id: string;
  householdId: string;
  email: string;
  displayName: string | null;
  parentType: string;
  relationshipLabel: string | null;
};

function parentMemberRole(parentType: string) {
  if (parentType === "mom" || parentType === "stepmom") return "mom";
  if (parentType === "dad" || parentType === "stepdad") return "dad";
  if (parentType === "grandparent") return "grandparent";
  if (parentType === "young-adult") return "young-adult";
  return "parent";
}

function parentAvatar(parentType: string) {
  if (parentType === "mom" || parentType === "stepmom") return "👩";
  if (parentType === "dad" || parentType === "stepdad") return "👨";
  if (parentType === "grandparent") return "👵";
  if (parentType === "young-adult") return "🧑";
  return "🧑";
}

function parentDisplayName(parent: ParentForMember) {
  const role = parentMemberRole(parent.parentType);
  const roleLabel = role === "mom" ? "Mom" : role === "dad" ? "Dad" : role === "grandparent" ? "Grandparent" : role === "young-adult" ? "Young Adult" : "Parent";
  return parent.displayName || parent.relationshipLabel || roleLabel || parent.email.split("@")[0] || "Parent";
}

async function parentRecord(parentId: string, householdId: string) {
  return prisma.parentAccount.findFirst({
    where: { id: parentId, householdId },
    select: {
      id: true,
      householdId: true,
      email: true,
      displayName: true,
      parentType: true,
      relationshipLabel: true,
    },
  });
}

export async function ensureParentFamilyMember(parentId: string, householdId: string) {
  const parent = await parentRecord(parentId, householdId);
  if (!parent) return null;

  const role = parentMemberRole(parent.parentType);
  const name = parentDisplayName(parent);
  const data = {
    name,
    role,
    relationshipToHousehold: role,
    avatar: parentAvatar(parent.parentType),
    color: "#14b8a6",
    familyNotes: parent.relationshipLabel,
  };

  const linked = await prisma.familyMember.findUnique({ where: { parentAccountId: parent.id } });
  if (linked) {
    return prisma.familyMember.update({
      where: { id: linked.id },
      data,
    });
  }

  const reusable = await prisma.familyMember.findFirst({
    where: {
      householdId,
      parentAccountId: null,
      role,
      name,
    },
    orderBy: { createdAt: "asc" },
  });

  if (reusable) {
    return prisma.familyMember.update({
      where: { id: reusable.id },
      data: { ...data, parentAccountId: parent.id },
    });
  }

  return prisma.familyMember.create({
    data: {
      householdId,
      parentAccountId: parent.id,
      age: 18,
      level: 1,
      totalPoints: 0,
      familyBranch: "primary",
      ...data,
    },
  });
}
