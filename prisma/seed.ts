import { PrismaClient } from "@prisma/client";
import { hashPassword, normalizeEmail } from "../lib/auth";

const prisma = new PrismaClient();

const skills = [
  { name: "Responsibility", icon: "⭐" },
  { name: "Cleanliness", icon: "✨" },
  { name: "Outdoor", icon: "🌿" },
  { name: "Pet Care", icon: "🐾" },
  { name: "Cooking", icon: "🍳" },
  { name: "Laundry", icon: "👕" },
];

const chores = [
  // Ages 3-5
  { name: "Pick Up Toys", icon: "🧸", color: "#fde68a", ageMin: 3, ageMax: 5, pointsValue: 5, category: "other", description: "Put all toys back in their place", skill: "Responsibility" },
  { name: "Put Books Away", icon: "📚", color: "#bbf7d0", ageMin: 3, ageMax: 5, pointsValue: 5, category: "other", description: "Return books to the bookshelf", skill: "Responsibility" },
  { name: "Feed Pet", icon: "🐾", color: "#fecaca", ageMin: 3, ageMax: 18, pointsValue: 10, category: "pets", description: "Give pet food and fresh water", skill: "Pet Care" },
  // Ages 6-8
  { name: "Set Dinner Table", icon: "🍽️", color: "#bfdbfe", ageMin: 6, ageMax: 18, pointsValue: 10, category: "kitchen", description: "Set plates, cups, and silverware for everyone", skill: "Cooking" },
  { name: "Clear Dinner Table", icon: "🥄", color: "#ddd6fe", ageMin: 6, ageMax: 18, pointsValue: 10, category: "kitchen", description: "Clear dishes and wipe down the table after dinner", skill: "Cleaning" },
  { name: "Make Bed", icon: "🛏️", color: "#fce7f3", ageMin: 6, ageMax: 18, pointsValue: 10, category: "cleaning", description: "Straighten sheets, fluff pillows, and tidy the bed", skill: "Cleanliness" },
  { name: "Sort Laundry", icon: "👕", color: "#cffafe", ageMin: 6, ageMax: 18, pointsValue: 10, category: "laundry", description: "Sort clothes into lights and darks", skill: "Laundry" },
  // Ages 9-11
  { name: "Vacuum Room", icon: "🌀", color: "#e9d5ff", ageMin: 9, ageMax: 18, pointsValue: 15, category: "cleaning", description: "Vacuum the floor of your bedroom", skill: "Cleanliness" },
  { name: "Wash Dishes", icon: "🫧", color: "#a7f3d0", ageMin: 9, ageMax: 18, pointsValue: 15, category: "kitchen", description: "Wash, rinse, and dry all dishes", skill: "Cleaning" },
  { name: "Take Out Recycling", icon: "♻️", color: "#bbf7d0", ageMin: 9, ageMax: 18, pointsValue: 10, category: "outdoor", description: "Collect recyclables and take the bin outside", skill: "Outdoor" },
  { name: "Clean Bathroom Sink", icon: "🚿", color: "#bae6fd", ageMin: 9, ageMax: 18, pointsValue: 15, category: "cleaning", description: "Scrub and rinse the bathroom sink and counter", skill: "Cleanliness" },
  { name: "Water Plants", icon: "🌱", color: "#d1fae5", ageMin: 9, ageMax: 18, pointsValue: 10, category: "outdoor", description: "Water all indoor and outdoor plants", skill: "Outdoor" },
  // Ages 12-14
  { name: "Clean Full Bathroom", icon: "🛁", color: "#c7d2fe", ageMin: 12, ageMax: 18, pointsValue: 25, category: "cleaning", description: "Clean toilet, sink, shower, and floor", skill: "Cleanliness", requiresPhoto: true },
  { name: "Take Out Trash", icon: "🗑️", color: "#f3f4f6", ageMin: 12, ageMax: 18, pointsValue: 15, category: "outdoor", description: "Empty all trash bins and take bags outside", skill: "Responsibility" },
  { name: "Mow Lawn", icon: "🌾", color: "#d1fae5", ageMin: 12, ageMax: 18, pointsValue: 30, category: "outdoor", description: "Mow the front and back yard", skill: "Outdoor", requiresPhoto: true },
  { name: "Wash the Dog", icon: "🐕", color: "#fde68a", ageMin: 12, ageMax: 18, pointsValue: 25, category: "pets", description: "Give the dog a bath and dry them off", skill: "Pet Care", requiresPhoto: true },
  // Ages 15+
  { name: "Cook a Meal", icon: "🍳", color: "#fef3c7", ageMin: 15, ageMax: 18, pointsValue: 35, category: "kitchen", description: "Plan and cook a full meal for the family", skill: "Cooking", requiresPhoto: true },
  { name: "Do Laundry", icon: "🧺", color: "#ede9fe", ageMin: 15, ageMax: 18, pointsValue: 25, category: "laundry", description: "Wash, dry, fold, and put away a load of laundry", skill: "Laundry" },
  { name: "Clean Kitchen", icon: "🫙", color: "#fef9c3", ageMin: 15, ageMax: 18, pointsValue: 30, category: "cleaning", description: "Deep clean counters, appliances, and floor", skill: "Cleanliness", requiresPhoto: true },
  { name: "Pick Up Dog Poo", icon: "💩", color: "#d1fae5", ageMin: 12, ageMax: 18, pointsValue: 20, category: "outdoor", description: "Pick up and dispose of all dog waste in the yard", skill: "Pet Care", requiresPhoto: true },
  // Universal
  { name: "Sweep Floor", icon: "🧹", color: "#f0fdf4", ageMin: 8, ageMax: 18, pointsValue: 15, category: "cleaning", description: "Sweep the kitchen or living room floor", skill: "Cleanliness" },
  { name: "Unload Dishwasher", icon: "🍶", color: "#ecfdf5", ageMin: 8, ageMax: 18, pointsValue: 10, category: "kitchen", description: "Put all clean dishes away in their right spots", skill: "Cooking" },
  { name: "Wipe Down Counters", icon: "🧽", color: "#f0f9ff", ageMin: 8, ageMax: 18, pointsValue: 10, category: "cleaning", description: "Wipe kitchen and bathroom counters clean", skill: "Cleanliness" },
];

async function main() {
  console.log("🌱 Seeding database...");

  const parentEmail = normalizeEmail(process.env.PARENT_EMAIL ?? "parent@example.com");
  const parentPassword = process.env.PARENT_PASSWORD ?? "ChangeMe123!";
  const { passwordHash, passwordSalt } = hashPassword(parentPassword);

  await prisma.parentAccount.upsert({
    where: { email: parentEmail },
    update: {},
    create: {
      email: parentEmail,
      passwordHash,
      passwordSalt,
    },
  });

  await prisma.choreSkill.deleteMany();
  await prisma.chore.deleteMany();
  await prisma.skillCategory.deleteMany();

  const createdSkills: Record<string, number> = {};
  for (const skill of skills) {
    const s = await prisma.skillCategory.create({ data: skill });
    createdSkills[skill.name] = s.id;
  }

  for (const chore of chores) {
    const { skill, requiresPhoto = false, ...choreData } = chore;
    const created = await prisma.chore.create({ data: { ...choreData, requiresPhoto } });
    if (skill && createdSkills[skill]) {
      await prisma.choreSkill.create({
        data: { choreId: created.id, skillId: createdSkills[skill] },
      });
    }
  }

  console.log(`✅ Seeded parent login, ${chores.length} chores, and ${skills.length} skill categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
