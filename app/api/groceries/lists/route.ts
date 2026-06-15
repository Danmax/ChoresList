import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";

const LIST_STATUSES = new Set(["active", "completed", "archived"]);

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const lists = await prisma.groceryList.findMany({
    where: {
      householdId,
      ...(status && LIST_STATUSES.has(status) && { status }),
    },
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      sourceTemplate: { select: { id: true, title: true, cadence: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(lists);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const title = cleanText(body.title, 120);

  if (!title) return NextResponse.json({ error: "List title is required" }, { status: 400 });

  const list = await prisma.groceryList.create({
    data: { householdId, title },
    include: { items: true, sourceTemplate: true },
  });

  return NextResponse.json(list, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const id = Number.parseInt(String(body.id ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "List is required" }, { status: 400 });
  }

  if (body.status !== undefined && !LIST_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Invalid list status" }, { status: 400 });
  }

  const title = body.title !== undefined ? cleanText(body.title, 120) : undefined;
  if (title !== undefined && !title) {
    return NextResponse.json({ error: "List title is required" }, { status: 400 });
  }

  const status = typeof body.status === "string" ? body.status : undefined;
  const list = await prisma.groceryList.update({
    where: { id, householdId },
    data: {
      ...(title !== undefined && { title }),
      ...(status !== undefined && { status }),
      ...(status === "completed" && { completedAt: new Date() }),
      ...(status === "active" && { completedAt: null }),
    },
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      sourceTemplate: { select: { id: true, title: true, cadence: true } },
    },
  });

  return NextResponse.json(list);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const { searchParams } = new URL(req.url);
  const id = Number.parseInt(searchParams.get("id") ?? "0", 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "List is required" }, { status: 400 });
  }

  await prisma.groceryList.delete({ where: { id, householdId } });
  return NextResponse.json({ ok: true });
});
