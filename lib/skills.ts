import { Prisma, PrismaClient } from "@prisma/client";

type Db = Prisma.TransactionClient | PrismaClient;

export type SkillSourceType =
  | "chore_completion"
  | "education_attempt"
  | "education_project"
  | "community_attendance"
  | "skill_test"
  | "merit_badge"
  | "manual_award";

export function getSkillLevelFromXp(xp: number) {
  if (xp >= 500) return 5 + Math.floor((xp - 500) / 250);
  if (xp >= 300) return 4;
  if (xp >= 150) return 3;
  if (xp >= 50) return 2;
  return 1;
}

const SUBJECT_SKILL_NAMES: Record<string, string> = {
  "sight-words": "Reading",
  vocabulary: "Study",
  facts: "Study",
  history: "Study",
  metrics: "Study",
  trivia: "Study",
  exercise: "Training",
  project: "Training",
};

export async function resolveSkillId(
  db: Db,
  input: {
    householdId: string;
    skillId?: string | null;
    subject?: string | null;
  }
) {
  if (input.skillId) {
    const direct = await db.skillCategory.findFirst({
      where: { id: input.skillId, householdId: input.householdId },
      select: { id: true },
    });
    if (direct) return direct.id;
  }

  const skillName = input.subject ? SUBJECT_SKILL_NAMES[input.subject] : null;
  if (!skillName) return null;

  const skill = await db.skillCategory.findFirst({
    where: { householdId: input.householdId, name: skillName },
    select: { id: true },
  });
  return skill?.id ?? null;
}

export async function resolveHouseholdSkillByName(
  db: Db,
  input: {
    householdId: string;
    skillName?: string | null;
  }
) {
  if (!input.skillName) return null;
  const skill = await db.skillCategory.findFirst({
    where: { householdId: input.householdId, name: input.skillName },
    select: { id: true },
  });
  return skill?.id ?? null;
}

export async function awardSkillXp(
  db: Db,
  input: {
    householdId: string;
    memberId: string;
    skillId: string;
    xp: number;
    sourceType: SkillSourceType;
    sourceId: string;
    note?: string | null;
    awardedByParentId?: string | null;
  }
) {
  const xp = Math.max(0, Math.round(input.xp));
  if (xp <= 0) return null;

  const created = await db.skillXpEvent.createMany({
    data: {
      householdId: input.householdId,
      memberId: input.memberId,
      skillId: input.skillId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      xp,
      note: input.note ?? null,
      awardedByParentId: input.awardedByParentId ?? null,
    },
    skipDuplicates: true,
  });

  if (created.count === 0) return null;

  const current = await db.memberSkill.findUnique({
    where: { memberId_skillId: { memberId: input.memberId, skillId: input.skillId } },
    select: { xp: true },
  });
  const nextXp = (current?.xp ?? 0) + xp;
  const nextLevel = getSkillLevelFromXp(nextXp);

  return db.memberSkill.upsert({
    where: { memberId_skillId: { memberId: input.memberId, skillId: input.skillId } },
    create: {
      memberId: input.memberId,
      skillId: input.skillId,
      xp,
      level: nextLevel,
    },
    update: {
      xp: nextXp,
      level: nextLevel,
    },
    include: { skill: true },
  });
}

export async function awardSkillXpForSkills(
  db: Db,
  input: {
    householdId: string;
    memberId: string;
    skillIds: string[];
    xp: number;
    sourceType: SkillSourceType;
    sourceId: string;
    note?: string | null;
    awardedByParentId?: string | null;
  }
) {
  const uniqueSkillIds = [...new Set(input.skillIds)].filter(Boolean);
  const awards = [];
  for (const skillId of uniqueSkillIds) {
    const award = await awardSkillXp(db, { ...input, skillId });
    if (award) awards.push(award);
  }
  return awards;
}

export async function awardChoreSkillXp(
  db: Db,
  input: {
    householdId: string;
    memberId: string;
    choreId: string;
    completionId: string;
    xp: number;
  }
) {
  const links = await db.choreSkill.findMany({
    where: { choreId: input.choreId },
    select: { skillId: true },
  });

  return awardSkillXpForSkills(db, {
    householdId: input.householdId,
    memberId: input.memberId,
    skillIds: links.map((link) => link.skillId),
    xp: input.xp,
    sourceType: "chore_completion",
    sourceId: input.completionId,
    note: "Chore completed",
  });
}

export async function awardMemberBadge(
  db: Db,
  input: {
    householdId: string;
    memberId: string;
    badgeId: string;
    communityGroupId?: string | null;
    awardedByParentId?: string | null;
    evidence?: Prisma.InputJsonValue;
    note?: string | null;
  }
) {
  const badge = await db.meritBadge.findFirst({
    where: {
      id: input.badgeId,
      isActive: true,
      OR: [
        { householdId: input.householdId },
        { householdId: null },
        ...(input.communityGroupId ? [{ communityGroupId: input.communityGroupId }] : []),
      ],
    },
    select: { id: true, skillId: true, xpReward: true },
  });
  if (!badge) return null;

  const created = await db.memberBadge.createMany({
    data: {
      householdId: input.householdId,
      memberId: input.memberId,
      badgeId: badge.id,
      communityGroupId: input.communityGroupId ?? null,
      awardedByParentId: input.awardedByParentId ?? null,
      evidence: input.evidence ?? Prisma.JsonNull,
      note: input.note ?? null,
    },
    skipDuplicates: true,
  });
  if (created.count === 0) return null;

  if (badge.skillId && badge.xpReward > 0) {
    const badgeSkill = await db.skillCategory.findUnique({
      where: { id: badge.skillId },
      select: { name: true },
    });
    const targetSkillId = await resolveHouseholdSkillByName(db, {
      householdId: input.householdId,
      skillName: badgeSkill?.name,
    });
    if (!targetSkillId) return db.memberBadge.findFirst({
      where: {
        householdId: input.householdId,
        memberId: input.memberId,
        badgeId: badge.id,
        communityGroupId: input.communityGroupId ?? null,
      },
      include: { badge: { include: { skill: true } } },
    });

    await awardSkillXp(db, {
      householdId: input.householdId,
      memberId: input.memberId,
      skillId: targetSkillId,
      xp: badge.xpReward,
      sourceType: "merit_badge",
      sourceId: badge.id,
      note: input.note ?? "Merit badge earned",
      awardedByParentId: input.awardedByParentId ?? null,
    });
  }

  return db.memberBadge.findFirst({
    where: {
      householdId: input.householdId,
      memberId: input.memberId,
      badgeId: badge.id,
      communityGroupId: input.communityGroupId ?? null,
    },
    include: { badge: { include: { skill: true } } },
  });
}
