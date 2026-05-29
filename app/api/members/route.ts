import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLevelFromPoints } from "@/lib/points";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";

type BirthdayInput = {
  birthdayMonth?: unknown;
  birthdayDay?: unknown;
};

const ADULT_ROLES = new Set(["mom", "dad", "parent"]);

function cleanRole(value: unknown) {
  return typeof value === "string" && ADULT_ROLES.has(value) ? value : "child";
}

function cleanInt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
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
  const members = await prisma.familyMember.findMany({
    where: { householdId },
    include: {
      assignments: { where: { isActive: true }, include: { chore: true, completions: true } },
      skills: { include: { skill: true } },
      allowanceSetting: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    members,
    currentParent: { id: parentId, email },
  });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const birthday = birthdayFields(body);
  const member = await prisma.familyMember.create({
    data: {
      householdId,
      name: body.name,
      age: body.age,
      ...birthday,
      lastBirthdayAgeUpdateYear: birthdayAgeUpdateYear(birthday.birthdayMonth, birthday.birthdayDay),
      role: cleanRole(body.role),
      avatar: body.avatar ?? "🧒",
      color: body.color ?? "#a78bfa",
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
    ? existing.role === "child"
      ? "child"
      : cleanRole(body.role)
    : undefined;
  const level = body.totalPoints !== undefined ? getLevelFromPoints(body.totalPoints) : undefined;
  const birthday = body.birthdayMonth !== undefined || body.birthdayDay !== undefined ? birthdayFields(body) : undefined;
  const member = await prisma.familyMember.update({
    where: { id, householdId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.age !== undefined && { age: body.age }),
      ...(role !== undefined && { role }),
      ...(birthday !== undefined && {
        ...birthday,
        lastBirthdayAgeUpdateYear: birthdayAgeUpdateYear(birthday.birthdayMonth, birthday.birthdayDay),
      }),
      ...(body.avatar !== undefined && { avatar: body.avatar }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.totalPoints !== undefined && { totalPoints: body.totalPoints }),
      ...(level !== undefined && { level }),
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
