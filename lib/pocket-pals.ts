export const PET_SPECIES = [
  { id: "dog", label: "Dog", name: "Mochi", names: ["Mochi", "Biscuit", "Waffles", "Teddy", "Pippin", "Nugget", "Peaches", "Bubbles", "Coco", "Sunny", "Toffee", "Button"], personality: "A loyal little sunshine who loves to play.", emoji: "🐶" },
  { id: "cat", label: "Cat", name: "Miso", names: ["Miso", "Moonbeam", "Nori", "Sprinkle", "Muffin", "Pebble", "Lulu", "Poppy", "Socks", "Tinker", "Cinnamon", "Twinkle"], personality: "A curious cuddlebug with a soft spot for naps.", emoji: "🐱" },
  { id: "monkey", label: "Monkey", name: "Kiki", names: ["Kiki", "Banjo", "Ziggy", "Boo", "Pickle", "Pip", "Jellybean", "Tango", "Chai", "Doodle", "Mango", "Nibbles"], personality: "A clever adventurer who learns with you.", emoji: "🐒" },
  { id: "guinea-pig", label: "Guinea pig", name: "Pudding", names: ["Pudding", "Biscotti", "Clover", "Fuzzball", "Marshmallow", "Pumpkin", "Bunny", "Truffle", "Pompom", "Daisy", "Cookie", "Honey"], personality: "A gentle fluffball who adores dumplings.", emoji: "🐹" },
] as const;
export type PetSpecies = typeof PET_SPECIES[number]["id"];
export const CARE_TASKS = ["feed", "clean", "play", "learn", "sleep"] as const;
export type CareTask = typeof CARE_TASKS[number];
export const PET_SHOP = [
  { id: "bow", name: "Cherry bow", cost: 40, kind: "accessory", emoji: "🎀" },
  { id: "crown", name: "Little crown", cost: 60, kind: "accessory", emoji: "👑" },
  { id: "sparkles", name: "Star halo", cost: 80, kind: "accessory", emoji: "✨" },
  { id: "garden", name: "Garden nook", cost: 100, kind: "room", emoji: "🌷" },
  { id: "library", name: "Storybook room", cost: 150, kind: "room", emoji: "📚" },
] as const;
export const PLAY_SYMBOLS = ["🍓", "🌸", "🍡", "⭐"];

type Lesson = { id: string; topic: string; question: string; choices: string[]; answer: number; explanation: string; minAge: number };
const LESSONS: Lesson[] = [
  { id: "two-paws", topic: "Counting", question: "One dumpling plus one dumpling makes…", choices: ["One", "Two", "Three"], answer: 1, explanation: "1 + 1 = 2. Two dumplings to share!", minAge: 0 },
  { id: "growing", topic: "Nature", question: "What helps a little plant grow?", choices: ["Water and sunlight", "Only darkness", "Candy"], answer: 0, explanation: "Plants use sunlight and water to grow.", minAge: 0 },
  { id: "kindness", topic: "Kindness", question: "Your friend is sad. What could you do?", choices: ["Ignore them", "Laugh at them", "Listen and offer help"], answer: 2, explanation: "Listening and offering help is a kind way to care for a friend.", minAge: 0 },
  { id: "shapes", topic: "Shapes", question: "How many sides does a triangle have?", choices: ["Four", "Three", "Five"], answer: 1, explanation: "A triangle has three straight sides.", minAge: 0 },
  { id: "sharing", topic: "Math", question: "You have 8 dumplings. Share them equally with your pet. How many each?", choices: ["Two", "Six", "Four"], answer: 2, explanation: "8 ÷ 2 = 4. Four dumplings each!", minAge: 6 },
  { id: "butterfly", topic: "Nature", question: "What does a caterpillar turn into?", choices: ["A butterfly or moth", "A fish", "A spider"], answer: 0, explanation: "Caterpillars grow into butterflies or moths through metamorphosis.", minAge: 6 },
  { id: "pattern", topic: "Patterns", question: "3, 6, 9, 12… what comes next?", choices: ["14", "15", "18"], answer: 1, explanation: "Add 3 each time. 12 + 3 = 15.", minAge: 6 },
  { id: "fraction", topic: "Fractions", question: "You eat 3 of 12 dumplings. What fraction did you eat?", choices: ["One half", "One third", "One quarter"], answer: 2, explanation: "3/12 simplifies to 1/4: one quarter.", minAge: 9 },
  { id: "gravity", topic: "Science", question: "What keeps your pet's ball coming back to the ground?", choices: ["Gravity", "Sound", "Sunlight"], answer: 0, explanation: "Gravity pulls objects toward Earth.", minAge: 9 },
  { id: "code", topic: "Logic", question: "A loop repeats a task 4 times and gives 2 treats each time. How many treats?", choices: ["6", "8", "12"], answer: 1, explanation: "4 repeats × 2 treats = 8 treats.", minAge: 9 },
];

export type PetState = {
  species: PetSpecies; name: string; adoptedAt: number; updatedAt: number;
  hunger: number; happiness: number; cleanliness: number; energy: number; smarts: number; bond: number;
  xp: number; coins: number; dumplings: number; lessonsLearned: number; gamesPlayed: number;
  owned: string[]; accessory: string | null; room: string; sleepingUntil: number | null;
  lastActionAt: number; lastCareDay: string | null; streak: number;
  daily: { day: string; startedAt: number; tasks: CareTask[]; rewarded: boolean; playRewards: number; learnRewards: number };
  challenge: { kind: "play" | "learn"; id: string; startedAt: number; sequence?: number[]; lessonId?: string } | null;
};
export class PetActionError extends Error {}
export function petDay(now: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function isPetSpecies(value: unknown): value is PetSpecies { return PET_SPECIES.some((s) => s.id === value); }
export function petLevel(pet: PetState) { return 1 + Math.floor(pet.xp / 60); }
const clamp = (v: number) => Math.min(100, Math.max(0, v));
function markTask(pet: PetState, task: CareTask) {
  if (!pet.daily.tasks.includes(task)) {
    pet.daily.tasks.push(task);
    pet.xp += 10;
    pet.bond = clamp(pet.bond + 4);
  }
}
export function createPet(species: PetSpecies, name: string, now: number, day: string): PetState {
  return { species, name, adoptedAt: now, updatedAt: now, hunger: 65, happiness: 75, cleanliness: 60, energy: 70, smarts: 0, bond: 10,
    xp: 0, coins: 20, dumplings: 6, lessonsLearned: 0, gamesPlayed: 0, owned: [], accessory: null, room: "home",
    sleepingUntil: null, lastActionAt: 0, lastCareDay: null, streak: 0,
    daily: { day, startedAt: now, tasks: [], rewarded: false, playRewards: 0, learnRewards: 0 }, challenge: null };
}
export function advancePet(saved: PetState, now: number, day: string): PetState {
  const pet = structuredClone(saved);
  const elapsed = Math.max(0, now - pet.updatedAt);
  const hours = Math.min(24, elapsed / 3_600_000);
  if (pet.daily.day !== day) {
    pet.daily = { day, startedAt: now, tasks: [], rewarded: false, playRewards: 0, learnRewards: 0 };
    pet.dumplings = Math.min(20, pet.dumplings + 4);
    pet.challenge = null;
  }
  pet.hunger = Math.max(20, pet.hunger - hours * 2);
  pet.happiness = Math.max(20, pet.happiness - hours * 1.5);
  pet.cleanliness = Math.max(20, pet.cleanliness - hours * 1.8);
  if (pet.sleepingUntil) {
    const sleepStart = pet.sleepingUntil - 30_000;
    const rest = Math.max(0, Math.min(now, pet.sleepingUntil) - Math.max(pet.updatedAt, sleepStart));
    pet.energy = clamp(pet.energy + rest / 500);
    if (now >= pet.sleepingUntil) {
      pet.sleepingUntil = null;
      markTask(pet, "sleep");
    }
  } else { pet.energy = Math.max(20, pet.energy - hours * 2); }
  if (pet.challenge && now - pet.challenge.startedAt > 300_000) pet.challenge = null;
  pet.updatedAt = Math.max(now, pet.updatedAt);
  return pet;
}
export function currentLesson(pet: PetState, age: number) {
  const available = LESSONS.filter((l) => l.minAge <= age);
  return available[pet.lessonsLearned % available.length];
}
export function publicChallenge(pet: PetState, age: number) {
  const challenge = pet.challenge;
  if (!challenge) return null;
  if (challenge.kind === "play") return { ...challenge };
  const lesson = LESSONS.find((l) => l.id === challenge.lessonId) ?? currentLesson(pet, age);
  return { id: challenge.id, kind: challenge.kind, startedAt: challenge.startedAt, topic: lesson.topic, question: lesson.question, choices: lesson.choices };
}
export type PetAction = "feed" | "clean" | "sleep" | "wake" | "affection" | "start-play" | "finish-play" | "start-learn" | "answer" | "buy" | "equip" | "refill" | "rename";
export function applyPetAction(pet: PetState, action: PetAction, input: Record<string, unknown>, now: number, age: number, challengeId: string) {
  let message = "";
  const administrative = ["buy", "equip", "refill", "rename", "wake"].includes(action);
  if (pet.sleepingUntil && !administrative) throw new PetActionError(`${pet.name} is napping. Let them rest or wake them up.`);
  if (!administrative && now - pet.lastActionAt < 2_000) throw new PetActionError("Give your pal a moment before the next activity.");
  if (pet.challenge && !administrative && !["answer", "finish-play", "start-play", "start-learn"].includes(action)) pet.challenge = null;
  switch (action) {
    case "feed":
      if (pet.dumplings <= 0) throw new PetActionError("The dumpling basket is empty. Get a refill in the shop!");
      if (pet.hunger > 95) throw new PetActionError(`${pet.name} is full. Save that dumpling for later!`);
      pet.dumplings--; pet.hunger = clamp(pet.hunger + 25); pet.happiness = clamp(pet.happiness + 5);
      markTask(pet, "feed"); message = "Nom nom! A delicious dumpling."; break;
    case "clean":
      pet.cleanliness = clamp(pet.cleanliness + 35); pet.happiness = clamp(pet.happiness + 5);
      markTask(pet, "clean"); message = "Splish, splash. Fresh and fluffy!"; break;
    case "sleep":
      pet.sleepingUntil = now + 30_000; pet.challenge = null; message = "A cozy 30-second nap. Sweet dreams!"; break;
    case "wake":
      if (pet.sleepingUntil) { pet.sleepingUntil = null; message = "Good morning! A full nap completes the rest task."; }
      else message = "Bright-eyed and ready!";
      break;
    case "affection": pet.happiness = clamp(pet.happiness + 3); message = `${pet.name} loves a little cuddle.`; break;
    case "start-play":
      if (pet.energy < 15) throw new PetActionError("Time for a nap before playing!");
      pet.challenge = { kind: "play", id: challengeId, startedAt: now,
        sequence: Array.from({ length: age < 6 ? 3 : 4 }, (_, i) => (parseInt(challengeId.replaceAll("-", "").slice(i * 2, i * 2 + 2), 16) || 0) % PLAY_SYMBOLS.length) };
      message = "Remember the treats, then tap them in order."; break;
    case "finish-play": {
      const c = pet.challenge;
      if (!c || c.kind !== "play" || c.id !== input.challengeId) throw new PetActionError("Start a new play round.");
      if (now - c.startedAt < 4_000) throw new PetActionError("Take a moment to remember the pattern.");
      const answer = input.sequence;
      if (!Array.isArray(answer) || answer.length !== c.sequence?.length || answer.some((v, i) => v !== c.sequence?.[i])) {
        message = "Almost! Watch the treats and try again."; break;
      }
      pet.gamesPlayed++; pet.happiness = clamp(pet.happiness + 20); pet.energy = clamp(pet.energy - 6);
      if (pet.daily.playRewards < 3) { pet.coins += 8; pet.daily.playRewards++; }
      pet.challenge = null; markTask(pet, "play"); message = "Perfect pattern! Your pal is cheering for you."; break;
    }
    case "start-learn":
      if (pet.energy < 10) throw new PetActionError("Rest a little before learning.");
      pet.challenge = { kind: "learn", id: challengeId, startedAt: now, lessonId: currentLesson(pet, age).id };
      message = "Let's discover something together."; break;
    case "answer": {
      const c = pet.challenge;
      if (!c || c.kind !== "learn" || c.id !== input.challengeId) throw new PetActionError("Open a new lesson to learn together.");
      const lesson = LESSONS.find((l) => l.id === c.lessonId)!;
      if (input.choice !== lesson.answer) { message = "Good try! Think it over and choose again."; break; }
      pet.lessonsLearned++; pet.smarts = clamp(pet.smarts + 4); pet.happiness = clamp(pet.happiness + 8); pet.energy = clamp(pet.energy - 3);
      if (pet.daily.learnRewards < 3) { pet.coins += 6; pet.daily.learnRewards++; }
      pet.challenge = null; markTask(pet, "learn"); message = lesson.explanation; break;
    }
    case "refill":
      if (pet.coins < 5) throw new PetActionError("Earn 5 coins by playing or learning for a refill.");
      if (pet.dumplings > 14) throw new PetActionError("Your basket has plenty of dumplings already.");
      pet.coins -= 5; pet.dumplings += 6; message = "Six warm dumplings added to your basket."; break;
    case "buy": {
      const item = PET_SHOP.find((i) => i.id === input.itemId);
      if (!item) throw new PetActionError("Choose an item from the shop.");
      if (pet.owned.includes(item.id)) throw new PetActionError("You already own this item.");
      if (pet.coins < item.cost) throw new PetActionError("Keep caring for your pal to earn more coins.");
      pet.coins -= item.cost; pet.owned.push(item.id);
      if (item.kind === "accessory") pet.accessory = item.id; else pet.room = item.id;
      message = `${item.name} unlocked!`; break;
    }
    case "equip": {
      if (input.itemId === "home") { pet.room = "home"; break; }
      if (input.itemId === "none") { pet.accessory = null; break; }
      const item = PET_SHOP.find((i) => i.id === input.itemId);
      if (!item || !pet.owned.includes(item.id)) throw new PetActionError("Unlock this item first.");
      if (item.kind === "accessory") pet.accessory = item.id; else pet.room = item.id;
      message = `${item.name} equipped.`; break;
    }
    case "rename": {
      const name = typeof input.name === "string" ? input.name.trim().slice(0, 24) : "";
      if (!name) throw new PetActionError("Give your pal a name.");
      pet.name = name; message = `Hello, ${name}!`; break;
    }
    default: throw new PetActionError("Choose a care activity.");
  }
  if (!administrative) pet.lastActionAt = now;
  return message;
}
export function completeDailyCare(pet: PetState) {
  if (pet.daily.rewarded || !CARE_TASKS.every((task) => pet.daily.tasks.includes(task))) return false;
  const yesterday = new Date(`${pet.daily.day}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  pet.streak = pet.lastCareDay === yesterday.toISOString().slice(0, 10) ? pet.streak + 1 : 1;
  pet.lastCareDay = pet.daily.day; pet.daily.rewarded = true;
  pet.coins += 30 + Math.min(5, pet.streak - 1) * 2;
  pet.xp += 20; pet.bond = clamp(pet.bond + 8);
  return true;
}
export function petMood(pet: PetState) {
  if (pet.sleepingUntil) return { label: "Dreaming of dumplings", emoji: "💤" };
  if (pet.hunger < 40) return { label: "A little hungry", emoji: "🥟" };
  if (pet.energy < 40) return { label: "Ready for a cozy nap", emoji: "🌙" };
  if (pet.cleanliness < 40) return { label: "Bath time, please", emoji: "🫧" };
  if (pet.happiness < 40) return { label: "Could use a play date", emoji: "🧸" };
  if (pet.bond >= 60) return { label: "Your best little buddy", emoji: "💕" };
  return { label: "Happy to see you", emoji: "🌸" };
}
