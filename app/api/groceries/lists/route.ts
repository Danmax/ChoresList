import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { requirePluginAccess } from "@/lib/plugins/registry";

const LIST_STATUSES = new Set(["active", "completed", "archived"]);
const RECEIPTS_ROOT = path.resolve(process.cwd(), "storage", "grocery-receipts");

function receiptFilePath(receiptPath: string) {
  const filePath = path.resolve(RECEIPTS_ROOT, receiptPath);
  return filePath.startsWith(RECEIPTS_ROOT + path.sep) ? filePath : null;
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  await requirePluginAccess(householdId, parentId, "grocery-pantry");
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
  const { householdId, parentId } = await requireParentSession(req);
  await requirePluginAccess(householdId, parentId, "grocery-pantry");
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
  const { householdId, parentId } = await requireParentSession(req);
  await requirePluginAccess(householdId, parentId, "grocery-pantry");
  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
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
  const completionNote = body.completionNote !== undefined ? cleanText(body.completionNote, 2000) || null : undefined;
  const list = await prisma.groceryList.update({
    where: { id, householdId },
    data: {
      ...(title !== undefined && { title }),
      ...(status !== undefined && { status }),
      ...(status === "completed" && { completedAt: new Date() }),
      ...(status === "completed" && completionNote !== undefined && { completionNote }),
      ...(status === "active" && { completedAt: null, completionNote: null, receiptPath: null }),
    },
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      sourceTemplate: { select: { id: true, title: true, cadence: true } },
    },
  });

  return NextResponse.json(list);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  await requirePluginAccess(householdId, parentId, "grocery-pantry");
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "List is required" }, { status: 400 });
  }

  const list = await prisma.groceryList.findUnique({ where: { id, householdId }, select: { receiptPath: true } });
  if (!list) return NextResponse.json({ error: "Shopping list not found" }, { status: 404 });
  await prisma.groceryList.delete({ where: { id, householdId } });
  if (list.receiptPath) {
    const filePath = receiptFilePath(list.receiptPath);
    if (filePath) await unlink(filePath).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
});
