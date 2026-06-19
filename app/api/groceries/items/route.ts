import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, withErrors } from "@/lib/api";

const SCOPES = new Set(["list", "template"]);

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function cleanRequiredText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanCategory(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 64) : "other";
}

function cleanScope(value: unknown) {
  return typeof value === "string" && SCOPES.has(value) ? value : null;
}

function cleanId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const scope = cleanScope(body.scope);
  const name = cleanRequiredText(body.name, 120);

  if (!scope) return NextResponse.json({ error: "Item scope is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Item name is required" }, { status: 400 });

  const data = {
    name,
    category: cleanCategory(body.category),
    quantity: cleanText(body.quantity, 64),
    unit: cleanText(body.unit, 64),
    note: cleanText(body.note, 500),
  };

  if (scope === "list") {
    const listId = cleanId(body.listId);
    if (!listId) {
      return NextResponse.json({ error: "Shopping list is required" }, { status: 400 });
    }
    const list = await prisma.groceryList.findFirst({ where: { id: listId, householdId }, select: { id: true } });
    if (!list) return NextResponse.json({ error: "Shopping list not found" }, { status: 404 });

    const sortOrder = await prisma.groceryListItem.count({ where: { listId } });
    const item = await prisma.groceryListItem.create({ data: { ...data, listId, sortOrder } });
    return NextResponse.json(item, { status: 201 });
  }

  const templateId = cleanId(body.templateId);
  if (!templateId) {
    return NextResponse.json({ error: "Recurring list is required" }, { status: 400 });
  }
  const template = await prisma.groceryTemplate.findFirst({ where: { id: templateId, householdId }, select: { id: true } });
  if (!template) return NextResponse.json({ error: "Recurring list not found" }, { status: 404 });

  const sortOrder = await prisma.groceryTemplateItem.count({ where: { templateId } });
  const item = await prisma.groceryTemplateItem.create({ data: { ...data, templateId, sortOrder } });
  return NextResponse.json(item, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const scope = cleanScope(body.scope);
  const id = cleanId(body.id);

  if (!scope) return NextResponse.json({ error: "Item scope is required" }, { status: 400 });
  if (!id) {
    return NextResponse.json({ error: "Item is required" }, { status: 400 });
  }

  const name = body.name !== undefined ? cleanRequiredText(body.name, 120) : undefined;
  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }

  const data = {
    ...(name !== undefined && { name }),
    ...(body.category !== undefined && { category: cleanCategory(body.category) }),
    ...(body.quantity !== undefined && { quantity: cleanText(body.quantity, 64) }),
    ...(body.unit !== undefined && { unit: cleanText(body.unit, 64) }),
    ...(body.note !== undefined && { note: cleanText(body.note, 500) }),
    ...(body.sortOrder !== undefined && { sortOrder: Math.max(0, Math.round(Number(body.sortOrder) || 0)) }),
  };

  if (scope === "list") {
    const existing = await prisma.groceryListItem.findFirst({
      where: { id, list: { householdId } },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const checked = body.checked !== undefined ? Boolean(body.checked) : undefined;
    const onHand = body.onHand !== undefined ? Boolean(body.onHand) : undefined;
    const item = await prisma.groceryListItem.update({
      where: { id },
      data: {
        ...data,
        ...(checked !== undefined && { checked }),
        ...(onHand !== undefined && { onHand }),
        ...(checked === true && { onHand: false }),
        ...(onHand === true && { checked: false }),
      },
    });
    return NextResponse.json(item);
  }

  const existing = await prisma.groceryTemplateItem.findFirst({
    where: { id, template: { householdId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const item = await prisma.groceryTemplateItem.update({ where: { id }, data });
  return NextResponse.json(item);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const { searchParams } = new URL(req.url);
  const scope = cleanScope(searchParams.get("scope"));
  const id = searchParams.get("id") ?? "";

  if (!scope) return NextResponse.json({ error: "Item scope is required" }, { status: 400 });
  if (!id) {
    return NextResponse.json({ error: "Item is required" }, { status: 400 });
  }

  if (scope === "list") {
    const existing = await prisma.groceryListItem.findFirst({
      where: { id, list: { householdId } },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    await prisma.groceryListItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  const existing = await prisma.groceryTemplateItem.findFirst({
    where: { id, template: { householdId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  await prisma.groceryTemplateItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
