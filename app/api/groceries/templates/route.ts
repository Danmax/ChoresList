import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";

const CADENCES = new Set(["weekly", "biweekly", "monthly"]);

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanCadence(value: unknown) {
  return typeof value === "string" && CADENCES.has(value) ? value : "weekly";
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const templates = await prisma.groceryTemplate.findMany({
    where: {
      householdId,
      ...(activeOnly && { isActive: true }),
    },
    include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    orderBy: [{ isActive: "desc" }, { cadence: "asc" }, { title: "asc" }],
  });

  return NextResponse.json(templates);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const title = cleanText(body.title, 120);

  if (!title) return NextResponse.json({ error: "Template title is required" }, { status: 400 });

  const template = await prisma.groceryTemplate.create({
    data: {
      householdId,
      title,
      cadence: cleanCadence(body.cadence),
    },
    include: { items: true },
  });

  return NextResponse.json(template, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Template is required" }, { status: 400 });
  }

  const title = body.title !== undefined ? cleanText(body.title, 120) : undefined;
  if (title !== undefined && !title) {
    return NextResponse.json({ error: "Template title is required" }, { status: 400 });
  }

  if (body.cadence !== undefined && !CADENCES.has(body.cadence)) {
    return NextResponse.json({ error: "Invalid recurrence" }, { status: 400 });
  }

  const template = await prisma.groceryTemplate.update({
    where: { id, householdId },
    data: {
      ...(title !== undefined && { title }),
      ...(body.cadence !== undefined && { cadence: body.cadence }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
    },
    include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });

  return NextResponse.json(template);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "Template is required" }, { status: 400 });
  }

  await prisma.groceryTemplate.delete({ where: { id, householdId } });
  return NextResponse.json({ ok: true });
});
