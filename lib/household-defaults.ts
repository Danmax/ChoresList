import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

const skills = [
  { name: "Responsibility", icon: "⭐" },
  { name: "Cleanliness", icon: "✨" },
  { name: "Outdoor", icon: "🌿" },
  { name: "Pet Care", icon: "🐾" },
  { name: "Cooking", icon: "🍳" },
  { name: "Laundry", icon: "👕" },
];

const chores = [
  { name: "Pick Up Toys", icon: "🧸", color: "#fde68a", ageMin: 3, ageMax: 5, pointsValue: 5, category: "other", description: "Put all toys back in their place", skill: "Responsibility" },
  { name: "Feed Pet", icon: "🐾", color: "#fecaca", ageMin: 3, ageMax: 18, pointsValue: 10, category: "pets", description: "Give pet food and fresh water", skill: "Pet Care" },
  { name: "Set Dinner Table", icon: "🍽️", color: "#bfdbfe", ageMin: 6, ageMax: 18, pointsValue: 10, category: "kitchen", description: "Set plates, cups, and silverware for everyone", skill: "Cooking" },
  { name: "Make Bed", icon: "🛏️", color: "#fce7f3", ageMin: 6, ageMax: 18, pointsValue: 10, category: "cleaning", description: "Straighten sheets, fluff pillows, and tidy the bed", skill: "Cleanliness" },
  { name: "Sort Laundry", icon: "👕", color: "#cffafe", ageMin: 6, ageMax: 18, pointsValue: 10, category: "laundry", description: "Sort clothes into lights and darks", skill: "Laundry" },
  { name: "Vacuum Room", icon: "🌀", color: "#e9d5ff", ageMin: 9, ageMax: 18, pointsValue: 15, category: "cleaning", description: "Vacuum the floor of your bedroom", skill: "Cleanliness" },
  { name: "Take Out Recycling", icon: "♻️", color: "#bbf7d0", ageMin: 9, ageMax: 18, pointsValue: 10, category: "outdoor", description: "Collect recyclables and take the bin outside", skill: "Outdoor" },
  { name: "Water Plants", icon: "🌱", color: "#d1fae5", ageMin: 9, ageMax: 18, pointsValue: 10, category: "outdoor", description: "Water all indoor and outdoor plants", skill: "Outdoor" },
  { name: "Clean Full Bathroom", icon: "🛁", color: "#c7d2fe", ageMin: 12, ageMax: 18, pointsValue: 25, category: "cleaning", description: "Clean toilet, sink, shower, and floor", skill: "Cleanliness", requiresPhoto: true },
  { name: "Take Out Trash", icon: "🗑️", color: "#f3f4f6", ageMin: 12, ageMax: 18, pointsValue: 15, category: "outdoor", description: "Empty all trash bins and take bags outside", skill: "Responsibility" },
  { name: "Mow Lawn", icon: "🌾", color: "#d1fae5", ageMin: 12, ageMax: 18, pointsValue: 30, category: "outdoor", description: "Mow the front and back yard", skill: "Outdoor", requiresPhoto: true },
  { name: "Cook a Meal", icon: "🍳", color: "#fef3c7", ageMin: 15, ageMax: 18, pointsValue: 35, category: "kitchen", description: "Plan and cook a full meal for the family", skill: "Cooking", requiresPhoto: true },
  { name: "Do Laundry", icon: "🧺", color: "#ede9fe", ageMin: 15, ageMax: 18, pointsValue: 25, category: "laundry", description: "Wash, dry, fold, and put away a load of laundry", skill: "Laundry" },
  { name: "Sweep Floor", icon: "🧹", color: "#f0fdf4", ageMin: 8, ageMax: 18, pointsValue: 15, category: "cleaning", description: "Sweep the kitchen or living room floor", skill: "Cleanliness" },
  { name: "Unload Dishwasher", icon: "🍶", color: "#ecfdf5", ageMin: 8, ageMax: 18, pointsValue: 10, category: "kitchen", description: "Put all clean dishes away in their right spots", skill: "Cooking" },
];

export async function seedHouseholdDefaults(db: Db, householdId: number) {
  const createdSkills: Record<string, number> = {};

  for (const skill of skills) {
    const created = await db.skillCategory.create({ data: { ...skill, householdId } });
    createdSkills[skill.name] = created.id;
  }

  for (const chore of chores) {
    const { skill, requiresPhoto = false, ...choreData } = chore;
    const created = await db.chore.create({ data: { ...choreData, requiresPhoto, householdId } });

    if (createdSkills[skill]) {
      await db.choreSkill.create({
        data: { choreId: created.id, skillId: createdSkills[skill] },
      });
    }
  }
}
