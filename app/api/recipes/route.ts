import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { requirePluginActive } from "@/lib/plugins/registry";

const VISIBILITIES = new Set(["private", "public"]);

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function cleanRequiredText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanVisibility(value: unknown) {
  return typeof value === "string" && VISIBILITIES.has(value) ? value : "private";
}

function cleanInt(value: unknown, fallback: number | null, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function cleanIngredients(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 80)
    .map((item, index) => {
      const raw = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        name: cleanRequiredText(raw.name, 120),
        quantity: cleanText(raw.quantity, 64),
        unit: cleanText(raw.unit, 64),
        category: cleanText(raw.category, 64) ?? "pantry",
        note: cleanText(raw.note, 500),
        sortOrder: index,
      };
    })
    .filter((item) => item.name);
}

const recipeInclude = {
  household: { select: { id: true, name: true } },
  createdBy: { select: { id: true, email: true, displayName: true } },
  ingredients: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
};

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  await requirePluginActive(householdId, "recipes");

  const [recipes, publicRecipes, potluckEvents] = await Promise.all([
    prisma.recipe.findMany({
      where: { householdId },
      include: recipeInclude,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.recipe.findMany({
      where: { visibility: "public", householdId: { not: householdId } },
      include: recipeInclude,
      orderBy: { updatedAt: "desc" },
      take: 80,
    }),
    prisma.communityEvent.findMany({
      where: {
        eventType: "potluck",
        date: { gte: new Date() },
        group: {
          members: {
            some: {
              parentId,
              status: "active",
              role: { in: ["owner", "manager"] },
            },
          },
        },
      },
      include: { group: { select: { id: true, name: true } } },
      orderBy: { date: "asc" },
      take: 40,
    }),
  ]);

  return NextResponse.json({ recipes, publicRecipes, potluckEvents });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  await requirePluginActive(householdId, "recipes");
  const body = await req.json();
  const title = cleanRequiredText(body.title, 120);
  if (!title) return NextResponse.json({ error: "Recipe title is required" }, { status: 400 });

  const ingredients = cleanIngredients(body.ingredients);
  const recipe = await prisma.recipe.create({
    data: {
      householdId,
      createdByParentId: parentId,
      title,
      description: cleanText(body.description, 1000),
      servings: cleanInt(body.servings, 4, 1, 200) ?? 4,
      prepMinutes: cleanInt(body.prepMinutes, null, 0, 1440),
      cookMinutes: cleanInt(body.cookMinutes, null, 0, 1440),
      photoUrl: cleanText(body.photoUrl, 512),
      instructions: cleanText(body.instructions, 10000),
      visibility: cleanVisibility(body.visibility),
      ingredients: { create: ingredients },
    },
    include: recipeInclude,
  });

  return NextResponse.json(recipe, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  await requirePluginActive(householdId, "recipes");
  const body = await req.json();
  const id = Number.parseInt(String(body.id ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Recipe is required" }, { status: 400 });
  }

  const existing = await prisma.recipe.findFirst({ where: { id, householdId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  const title = body.title !== undefined ? cleanRequiredText(body.title, 120) : undefined;
  if (title !== undefined && !title) return NextResponse.json({ error: "Recipe title is required" }, { status: 400 });

  const replaceIngredients = body.ingredients !== undefined;
  const recipe = await prisma.$transaction(async (tx) => {
    if (replaceIngredients) {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
    }
    return tx.recipe.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(body.description !== undefined && { description: cleanText(body.description, 1000) }),
        ...(body.servings !== undefined && { servings: cleanInt(body.servings, 4, 1, 200) ?? 4 }),
        ...(body.prepMinutes !== undefined && { prepMinutes: cleanInt(body.prepMinutes, null, 0, 1440) }),
        ...(body.cookMinutes !== undefined && { cookMinutes: cleanInt(body.cookMinutes, null, 0, 1440) }),
        ...(body.photoUrl !== undefined && { photoUrl: cleanText(body.photoUrl, 512) }),
        ...(body.instructions !== undefined && { instructions: cleanText(body.instructions, 10000) }),
        ...(body.visibility !== undefined && { visibility: cleanVisibility(body.visibility) }),
        ...(replaceIngredients && { ingredients: { create: cleanIngredients(body.ingredients) } }),
      },
      include: recipeInclude,
    });
  });

  return NextResponse.json(recipe);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  await requirePluginActive(householdId, "recipes");
  const { searchParams } = new URL(req.url);
  const id = Number.parseInt(searchParams.get("id") ?? "0", 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Recipe is required" }, { status: 400 });
  }

  const existing = await prisma.recipe.findFirst({ where: { id, householdId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  await prisma.recipe.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
