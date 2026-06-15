import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { childAccessWhere } from "@/lib/child-access";

type BirthdayInput = {
  birthdayMonth?: unknown;
  birthdayDay?: unknown;
};

const ADULT_ROLES = new Set(["mom", "dad", "parent"]);
const MEMBER_ROLES = new Set(["child", "young-adult", "mom", "dad", "parent"]);
const RELATIONSHIPS = new Set(["child", "step-child", "adopted-child", "foster-child", "young-adult", "other"]);
const FAMILY_BRANCHES = new Set(["primary", "mom-side", "dad-side", "shared", "blended", "guardian"]);

function cleanRole(value: unknown) {
  return typeof value === "string" && MEMBER_ROLES.has(value) ? value : "child";
}

function cleanAdultRole(value: unknown, fallback: string) {
  return typeof value === "string" && ADULT_ROLES.has(value) ? value : fallback;
}

function cleanChildProfileRole(value: unknown, fallback: string) {
  return value === "young-adult" || value === "child" ? value : fallback;
}

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

function cleanInt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function cleanAge(value: unknown) {
  const n = cleanInt(value);
  return n === null ? null : Math.min(120, Math.max(0, n));
}

function cleanShortText(value: unknown, fallback: string, max = 32) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function cleanOptionalText(value: unknown, max = 255) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function cleanRelationship(value: unknown, fallback = "child") {
  return typeof value === "string" && RELATIONSHIPS.has(value) ? value : fallback;
}

function cleanFamilyBranch(value: unknown) {
  return typeof value === "string" && FAMILY_BRANCHES.has(value) ? value : "primary";
}

function validBirthday(month: number | null, day: number | null) {
  if (month === null && day === null) return { birthdayMonth: null, birthdayDay: null };
  if (month === null || day === null || month < 1 || month > 12) return { birthdayMonth: null, birthdayDay: null };

  const maxDay = new Date(2024, month, 0).getDate();
  if (day < 1 || day > maxDay) return { birthdayMonth: null, birthdayDay: null };

  return { birthdayMonth: month, birthdayDay: day };
}

function birthdayFields(body: BirthdayInput) {
  return validBirthday(cleanInt(body.birthdayMonth), cleanInt(body.birthdayDay));
}

function birthdayHasOccurredThisYear(birthdayMonth: number | null, birthdayDay: number | null) {
  if (birthdayMonth === null || birthdayDay === null) return false;
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  return birthdayMonth < month || (birthdayMonth === month && birthdayDay <= day);
}

function birthdayAgeUpdateYear(birthdayMonth: number | null, birthdayDay: number | null) {
  return birthdayHasOccurredThisYear(birthdayMonth, birthdayDay) ? new Date().getFullYear() : null;
}

async function syncBirthdayAges(householdId: number) {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const year = today.getFullYear();

  try {
    await prisma.familyMember.updateMany({
      where: {
        householdId,
        birthdayMonth: { not: null, lte: month },
        birthdayDay: { not: null },
        OR: [
          { lastBirthdayAgeUpdateYear: null },
          { lastBirthdayAgeUpdateYear: { lt: year } },
        ],
        NOT: {
          AND: [
            { birthdayMonth: month },
            { birthdayDay: { gt: day } },
          ],
        },
      },
      data: {
        age: { increment: 1 },
        lastBirthdayAgeUpdateYear: year,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unknown argument `birthdayMonth`") || message.includes("Unknown column")) return;
    throw error;
  }
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId, email } = requireSession(req);
  await syncBirthdayAges(householdId);
  const currentParent = await prisma.parentAccount.findFirst({
    where: { id: parentId, householdId },
    select: {
      id: true,
      email: true,
      accountRole: true,
      displayName: true,
      parentType: true,
      relationshipLabel: true,
      childAccessMode: true,
      childAccessMemberIds: true,
    },
  });
  const accessWhere = await childAccessWhere(parentId, householdId);
  const members = await prisma.familyMember.findMany({
    where: { householdId, ...accessWhere },
    include: {
      assignments: { where: { isActive: true }, include: { chore: true, completions: true } },
      skills: { include: { skill: true } },
      allowanceSetting: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    members,
    currentParent: currentParent ?? { id: parentId, email },
  });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const name = cleanName(body.name);
  const age = cleanAge(body.age);
  if (!name || age === null) {
    return NextResponse.json({ error: "Name and age are required" }, { status: 400 });
  }
  const birthday = birthdayFields(body);
  const member = await prisma.familyMember.create({
    data: {
      householdId,
      name,
      age,
      ...birthday,
      lastBirthdayAgeUpdateYear: birthdayAgeUpdateYear(birthday.birthdayMonth, birthday.birthdayDay),
      role: cleanRole(body.role),
      relationshipToHousehold: cleanRelationship(body.relationshipToHousehold, cleanRole(body.role) === "young-adult" ? "young-adult" : "child"),
      familyBranch: cleanFamilyBranch(body.familyBranch),
      custodySchedule: cleanOptionalText(body.custodySchedule, 128),
      familyNotes: cleanOptionalText(body.familyNotes, 255),
      avatar: cleanShortText(body.avatar, "🧒"),
      color: cleanShortText(body.color, "#a78bfa"),
    },
  });
  return NextResponse.json(member, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const { id } = body;
  const existing = await prisma.familyMember.findFirst({ where: { id, householdId }, select: { role: true } });
  if (!existing) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  const role = body.role !== undefined
    ? existing.role === "child" || existing.role === "young-adult"
      ? cleanChildProfileRole(body.role, existing.role)
      : cleanAdultRole(body.role, existing.role)
    : undefined;
  const name = body.name !== undefined ? cleanName(body.name) : undefined;
  const age = body.age !== undefined ? cleanAge(body.age) : undefined;
  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (age === null) {
    return NextResponse.json({ error: "Age must be a number" }, { status: 400 });
  }
  const birthday = body.birthdayMonth !== undefined || body.birthdayDay !== undefined ? birthdayFields(body) : undefined;
  const member = await prisma.familyMember.update({
    where: { id, householdId },
    data: {
      ...(name !== undefined && { name }),
      ...(age !== undefined && { age }),
      ...(role !== undefined && { role }),
      ...(body.relationshipToHousehold !== undefined && { relationshipToHousehold: cleanRelationship(body.relationshipToHousehold, existing.role === "young-adult" ? "young-adult" : "child") }),
      ...(body.familyBranch !== undefined && { familyBranch: cleanFamilyBranch(body.familyBranch) }),
      ...(body.custodySchedule !== undefined && { custodySchedule: cleanOptionalText(body.custodySchedule, 128) }),
      ...(body.familyNotes !== undefined && { familyNotes: cleanOptionalText(body.familyNotes, 255) }),
      ...(birthday !== undefined && {
        ...birthday,
        lastBirthdayAgeUpdateYear: birthdayAgeUpdateYear(birthday.birthdayMonth, birthday.birthdayDay),
      }),
      ...(body.avatar !== undefined && { avatar: cleanShortText(body.avatar, "🧒") }),
      ...(body.color !== undefined && { color: cleanShortText(body.color, "#a78bfa") }),
    },
  });
  return NextResponse.json(member);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");
  await prisma.familyMember.delete({ where: { id, householdId } });
  return NextResponse.json({ ok: true });
});
