import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, withErrors } from "@/lib/api";
import { requireEventCommunityRole } from "@/lib/community";
import { requirePluginActive } from "@/lib/plugins/registry";

function cleanInt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function recipeNote(recipe: { description: string | null; instructions: string | null; photoUrl: string | null }) {
  const parts = [
    recipe.description ? `Recipe notes: ${recipe.description}` : "",
    recipe.instructions ? `Instructions: ${recipe.instructions}` : "",
    recipe.photoUrl ? `Photo: ${recipe.photoUrl}` : "",
  ].filter(Boolean);
  return parts.join("\n\n").slice(0, 2000) || null;
}

async function findAccessibleRecipe(recipeId: number, householdId: number) {
  return prisma.recipe.findFirst({
    where: {
      id: recipeId,
      OR: [{ householdId }, { visibility: "public" }],
    },
    include: { ingredients: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
}

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  await requirePluginActive(householdId, "recipes");
  const body = await req.json();
  const action = typeof body.action === "string" ? body.action : "";
  const recipeId = cleanInt(body.recipeId);
  if (!recipeId || recipeId <= 0) return NextResponse.json({ error: "Recipe is required" }, { status: 400 });

  const recipe = await findAccessibleRecipe(recipeId, householdId);
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  if (action === "shopping-list") {
    const list = await prisma.$transaction(async (tx) => {
      const created = await tx.groceryList.create({
        data: {
          householdId,
          title: `${recipe.title} Ingredients`,
          items: {
            create: recipe.ingredients.map((ingredient, index) => ({
              name: ingredient.name,
              category: ingredient.category || "pantry",
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              note: ingredient.note,
              sortOrder: index,
            })),
          },
        },
        include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }, sourceTemplate: true },
      });
      return created;
    });
    return NextResponse.json({ list }, { status: 201 });
  }

  if (action === "potluck-item") {
    const eventId = cleanInt(body.eventId);
    if (!eventId || eventId <= 0) return NextResponse.json({ error: "Potluck event is required" }, { status: 400 });
    const { event } = await requireEventCommunityRole(eventId, parentId, "manager");
    const potluck = await prisma.communityEvent.findUnique({
      where: { id: event.id },
      select: { id: true, eventType: true },
    });
    if (!potluck || potluck.eventType !== "potluck") {
      return NextResponse.json({ error: "Choose a potluck event" }, { status: 400 });
    }

    const sortOrder = await prisma.communityEventItem.count({ where: { eventId } });
    const item = await prisma.communityEventItem.create({
      data: {
        eventId,
        title: recipe.title,
        quantity: `${recipe.servings} servings`,
        note: recipeNote(recipe),
        claimedByParentId: parentId,
        status: "claimed",
        sortOrder,
      },
      include: {
        assignedTo: { select: { id: true, email: true } },
        claimedBy: { select: { id: true, email: true } },
        event: { select: { id: true, groupId: true } },
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown recipe action" }, { status: 400 });
});
