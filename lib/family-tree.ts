import { prisma } from "@/lib/prisma";

const CHILD_RELATIONSHIPS = new Set(["child", "step-child", "adopted-child", "foster-child", "young-adult"]);

type MemberForTree = {
  id: string;
  householdId: string;
  parentAccountId: string | null;
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

function parentName(parent: { email: string; displayName: string | null; parentType: string; relationshipLabel: string | null }) {
  const fallback = parent.parentType === "mom" || parent.parentType === "stepmom"
    ? "Mom"
    : parent.parentType === "dad" || parent.parentType === "stepdad"
      ? "Dad"
      : parent.parentType === "grandparent"
        ? "Grandparent"
        : "Parent";
  return parent.displayName || parent.relationshipLabel || fallback || parent.email.split("@")[0] || "Parent";
}

function isChildLike(member: Pick<MemberForTree, "role" | "relationshipToHousehold">) {
  return member.role === "child" || member.role === "young-adult" || CHILD_RELATIONSHIPS.has(member.relationshipToHousehold);
}

function relationshipTypeFor(parentType: string, memberRelationship: string) {
  if (parentType === "stepmom" || parentType === "stepdad" || memberRelationship === "step-child") return "step_parent";
  if (memberRelationship === "adopted-child") return "adoptive_parent";
  if (parentType === "guardian" || memberRelationship === "foster-child") return "guardian";
  return "parent_child";
}

function isGrandparent(parent: { accountRole: string; parentType: string }) {
  return parent.accountRole === "grandparent" || parent.parentType === "grandparent";
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

async function ensureParentNodes(householdId: string) {
  const parents = await prisma.parentAccount.findMany({
    where: { householdId },
    select: { id: true, email: true, displayName: true, accountRole: true, parentType: true, relationshipLabel: true },
  });

  await Promise.all(
    parents.map((parent) =>
      prisma.familyTreeNode.upsert({
        where: { householdId_parentAccountId: { householdId, parentAccountId: parent.id } },
        create: {
          householdId,
          kind: "parent_account",
          parentAccountId: parent.id,
          name: parentName(parent),
          avatar: parentAvatar(parent.parentType),
          color: "#14b8a6",
          notes: parent.relationshipLabel,
        },
        update: {
          name: parentName(parent),
          avatar: parentAvatar(parent.parentType),
          notes: parent.relationshipLabel,
        },
      })
    )
  );

  return parents;
}

export async function syncFamilyTreeForMember(member: MemberForTree) {
  if (member.parentAccountId) {
    await ensureParentNodes(member.householdId);
    const parentNode = await prisma.familyTreeNode.findUnique({
      where: {
        householdId_parentAccountId: {
          householdId: member.householdId,
          parentAccountId: member.parentAccountId,
        },
      },
    });
    if (parentNode) return parentNode;
  }

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
  const grandparentIds = new Set(parents.filter(isGrandparent).map((parent) => parent.id));

  if (parentNodes.length) {
    await prisma.familyTreeRelationship.createMany({
      data: parentNodes.map((parentNode) => ({
        householdId: member.householdId,
        fromNodeId: parentNode.id,
        toNodeId: memberNode.id,
        relationshipType: parentNode.parentAccountId && grandparentIds.has(parentNode.parentAccountId)
          ? "grandparent_grandchild"
          : relationshipTypeFor(parentNode.parentAccountId ? parentTypeById.get(parentNode.parentAccountId) ?? "parent" : "parent", member.relationshipToHousehold),
      })),
      skipDuplicates: true,
    });
  }

  const siblings = await prisma.familyMember.findMany({
    where: {
      householdId: member.householdId,
      id: { not: member.id },
      parentAccountId: null,
      OR: [
        { role: { in: ["child", "young-adult"] } },
        { relationshipToHousehold: { in: Array.from(CHILD_RELATIONSHIPS) } },
      ],
    },
    select: {
      id: true,
      householdId: true,
      parentAccountId: true,
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

  const siblingNodes = await Promise.all(siblings.map(ensureMemberNode));
  if (siblingNodes.length) {
    await prisma.familyTreeRelationship.createMany({
      data: siblingNodes.map((siblingNode) => {
        const [fromNodeId, toNodeId] = [memberNode.id, siblingNode.id].sort();
        return {
          householdId: member.householdId,
          fromNodeId,
          toNodeId,
          relationshipType: "sibling",
        };
      }),
      skipDuplicates: true,
    });
  }

  return memberNode;
}

export async function syncHouseholdFamilyTree(householdId: string) {
  const members = await prisma.familyMember.findMany({
    where: { householdId },
    select: {
      id: true,
      householdId: true,
      parentAccountId: true,
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

  const parents = await ensureParentNodes(householdId);
  for (const member of members) {
    await syncFamilyTreeForMember(member);
  }

  const parentNodes = await prisma.familyTreeNode.findMany({
    where: { householdId, parentAccountId: { in: parents.map((parent) => parent.id) } },
    select: { id: true, parentAccountId: true },
  });
  const grandparentIds = new Set(parents.filter(isGrandparent).map((parent) => parent.id));
  const grandparentNodes = parentNodes.filter((node) => node.parentAccountId && grandparentIds.has(node.parentAccountId));
  const parentGenerationNodes = parentNodes.filter((node) => node.parentAccountId && !grandparentIds.has(node.parentAccountId));
  const childMemberIds = members.filter((member) => !member.parentAccountId && isChildLike(member)).map((member) => member.id);

  if (grandparentNodes.length && childMemberIds.length) {
    const childNodes = await prisma.familyTreeNode.findMany({
      where: { householdId, familyMemberId: { in: childMemberIds } },
      select: { id: true },
    });
    await prisma.familyTreeRelationship.deleteMany({
      where: {
        householdId,
        fromNodeId: { in: grandparentNodes.map((node) => node.id) },
        toNodeId: { in: childNodes.map((node) => node.id) },
        relationshipType: "guardian",
      },
    });
  }

  if (grandparentNodes.length && parentGenerationNodes.length) {
    await prisma.familyTreeRelationship.createMany({
      data: grandparentNodes.flatMap((grandparentNode) =>
        parentGenerationNodes.map((parentNode) => ({
          householdId,
          fromNodeId: grandparentNode.id,
          toNodeId: parentNode.id,
          relationshipType: "parent_child",
        }))
      ),
      skipDuplicates: true,
    });
  }
}
