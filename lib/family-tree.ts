import { prisma } from "@/lib/prisma";

const CHILD_RELATIONSHIPS = new Set(["child", "step-child", "adopted-child", "foster-child", "young-adult"]);

type MemberForTree = {
  id: number;
  householdId: number;
  name: string;
  role: string;
  relationshipToHousehold: string;
  avatar: string;
  color: string;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  familyNotes: string | null;
};

function parentAvatar(parentType: string) {
  if (parentType === "mom" || parentType === "stepmom") return "👩";
  if (parentType === "dad" || parentType === "stepdad") return "👨";
  if (parentType === "grandparent") return "👵";
  return "👤";
}

function isChildLike(member: Pick<MemberForTree, "role" | "relationshipToHousehold">) {
  return member.role === "child" || member.role === "young-adult" || CHILD_RELATIONSHIPS.has(member.relationshipToHousehold);
}

function relationshipTypeFor(parentType: string, memberRelationship: string) {
  if (parentType === "stepmom" || parentType === "stepdad" || memberRelationship === "step-child") return "step_parent";
  if (memberRelationship === "adopted-child") return "adoptive_parent";
  if (parentType === "guardian" || parentType === "grandparent" || memberRelationship === "foster-child") return "guardian";
  return "parent_child";
}

async function ensureMemberNode(member: MemberForTree) {
  return prisma.familyTreeNode.upsert({
    where: { householdId_familyMemberId: { householdId: member.householdId, familyMemberId: member.id } },
    create: {
      householdId: member.householdId,
      kind: "member",
      familyMemberId: member.id,
      name: member.name,
      avatar: member.avatar,
      color: member.color,
      birthdayMonth: member.birthdayMonth,
      birthdayDay: member.birthdayDay,
      notes: member.familyNotes,
    },
    update: {
      name: member.name,
      avatar: member.avatar,
      color: member.color,
      birthdayMonth: member.birthdayMonth,
      birthdayDay: member.birthdayDay,
      notes: member.familyNotes,
    },
  });
}

async function ensureParentNodes(householdId: number) {
  const parents = await prisma.parentAccount.findMany({
    where: { householdId },
    select: { id: true, email: true, displayName: true, parentType: true, relationshipLabel: true },
  });

  await Promise.all(
    parents.map((parent) =>
      prisma.familyTreeNode.upsert({
        where: { householdId_parentAccountId: { householdId, parentAccountId: parent.id } },
        create: {
          householdId,
          kind: "parent_account",
          parentAccountId: parent.id,
          name: parent.displayName || parent.relationshipLabel || parent.email.split("@")[0] || "Parent",
          avatar: parentAvatar(parent.parentType),
          color: "#14b8a6",
          notes: parent.relationshipLabel,
        },
        update: {
          name: parent.displayName || parent.relationshipLabel || parent.email.split("@")[0] || "Parent",
          avatar: parentAvatar(parent.parentType),
          notes: parent.relationshipLabel,
        },
      })
    )
  );

  return parents;
}

export async function syncFamilyTreeForMember(member: MemberForTree) {
  const memberNode = await ensureMemberNode(member);
  if (!isChildLike(member)) return memberNode;

  const parents = await ensureParentNodes(member.householdId);
  const parentNodes = await prisma.familyTreeNode.findMany({
    where: {
      householdId: member.householdId,
      parentAccountId: { in: parents.map((parent) => parent.id) },
    },
    select: { id: true, parentAccountId: true },
  });
  const parentTypeById = new Map(parents.map((parent) => [parent.id, parent.parentType]));

  if (parentNodes.length) {
    await prisma.familyTreeRelationship.createMany({
      data: parentNodes.map((parentNode) => ({
        householdId: member.householdId,
        fromNodeId: parentNode.id,
        toNodeId: memberNode.id,
        relationshipType: relationshipTypeFor(parentTypeById.get(parentNode.parentAccountId ?? 0) ?? "parent", member.relationshipToHousehold),
      })),
      skipDuplicates: true,
    });
  }

  return memberNode;
}

export async function syncHouseholdFamilyTree(householdId: number) {
  const members = await prisma.familyMember.findMany({
    where: { householdId },
    select: {
      id: true,
      householdId: true,
      name: true,
      role: true,
      relationshipToHousehold: true,
      avatar: true,
      color: true,
      birthdayMonth: true,
      birthdayDay: true,
      familyNotes: true,
    },
  });

  await ensureParentNodes(householdId);
  for (const member of members) {
    await syncFamilyTreeForMember(member);
  }
}
