import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, withErrors } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export const POST = withErrors(async (req: NextRequest, ctx?: unknown) => {
  const { householdId } = await requireParentSession(req);
  const { params } = ctx as Params;
  const { id } = await params;
  const templateId = id;
  if (!templateId) {
    return NextResponse.json({ error: "Recurring list is required" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const template = await prisma.groceryTemplate.findFirst({
    where: { id: templateId, householdId, isActive: true },
    include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
  if (!template) return NextResponse.json({ error: "Recurring list not found" }, { status: 404 });

  const customTitle = cleanText(body.title, 120);
  const list = await prisma.$transaction(async (tx) => {
    const created = await tx.groceryList.create({
      data: {
        householdId,
        title: customTitle || template.title,
        sourceTemplateId: template.id,
        items: {
          create: template.items.map((item) => ({
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            note: item.note,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: {
        items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        sourceTemplate: { select: { id: true, title: true, cadence: true } },
      },
    });
    await tx.groceryTemplate.update({
      where: { id: template.id },
      data: { lastUsedAt: new Date() },
    });
    return created;
  });

  return NextResponse.json(list, { status: 201 });
});
