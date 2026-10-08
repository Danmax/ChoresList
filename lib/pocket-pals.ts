export const PET_SPECIES = [
  { id: "dog", label: "Dog", name: "Mochi", names: ["Mochi", "Biscuit", "Waffles", "Teddy", "Pippin", "Nugget", "Peaches", "Bubbles", "Coco", "Sunny", "Toffee", "Button"], personality: "A loyal little sunshine who loves to play.", emoji: "🐶" },
  { id: "cat", label: "Cat", name: "Miso", names: ["Miso", "Moonbeam", "Nori", "Sprinkle", "Muffin", "Pebble", "Lulu", "Poppy", "Socks", "Tinker", "Cinnamon", "Twinkle"], personality: "A curious cuddlebug with a soft spot for naps.", emoji: "🐱" },
  { id: "monkey", label: "Monkey", name: "Kiki", names: ["Kiki", "Banjo", "Ziggy", "Boo", "Pickle", "Pip", "Jellybean", "Tango", "Chai", "Doodle", "Mango", "Nibbles"], personality: "A clever adventurer who learns with you.", emoji: "🐒" },
  { id: "guinea-pig", label: "Guinea pig", name: "Pudding", names: ["Pudding", "Biscotti", "Clover", "Fuzzball", "Marshmallow", "Pumpkin", "Bunny", "Truffle", "Pompom", "Daisy", "Cookie", "Honey"], personality: "A gentle fluffball who adores dumplings.", emoji: "🐹" },
] as const;
export type PetSpecies = typeof PET_SPECIES[number]["id"];
export type PetAppearance = {
  version: 1;
  baseColor: string;
  accentColor: string;
  pattern: string;
  texture: string;
  eyeColor: string;
  specialMark: string | null;
};

const APPEARANCE_OPTIONS: Record<PetSpecies, Omit<PetAppearance, "version">[]> = {
  dog: [
    { baseColor: "golden", accentColor: "cream", pattern: "socks", texture: "fluffy", eyeColor: "brown", specialMark: "heart-patch" },
    { baseColor: "cocoa", accentColor: "caramel", pattern: "mask", texture: "velvety", eyeColor: "hazel", specialMark: null },
    { baseColor: "snow", accentColor: "apricot", pattern: "ear-tips", texture: "cloud-soft", eyeColor: "blue", specialMark: "star-patch" },
  ],
  cat: [
    { baseColor: "cream", accentColor: "cinnamon", pattern: "tabby", texture: "silky", eyeColor: "amber", specialMark: "heart-patch" },
    { baseColor: "midnight", accentColor: "silver", pattern: "tuxedo", texture: "plush", eyeColor: "green", specialMark: null },
    { baseColor: "peach", accentColor: "white", pattern: "calico", texture: "fluffy", eyeColor: "blue", specialMark: "star-patch" },
  ],
  monkey: [
    { baseColor: "cocoa", accentColor: "peach", pattern: "face-mask", texture: "soft", eyeColor: "brown", specialMark: "heart-patch" },
    { baseColor: "golden", accentColor: "cream", pattern: "ear-rings", texture: "fuzzy", eyeColor: "hazel", specialMark: null },
    { baseColor: "chestnut", accentColor: "apricot", pattern: "freckles", texture: "velvety", eyeColor: "amber", specialMark: "star-patch" },
  ],
  "guinea-pig": [
    { baseColor: "caramel", accentColor: "white", pattern: "patchwork", texture: "fluffy", eyeColor: "brown", specialMark: "heart-patch" },
    { baseColor: "smoke", accentColor: "cream", pattern: "rosette", texture: "plush", eyeColor: "black", specialMark: null },
    { baseColor: "honey", accentColor: "cinnamon", pattern: "stripe", texture: "silky", eyeColor: "amber", specialMark: "star-patch" },
  ],
};

export function createPetAppearance(species: PetSpecies, seed = Date.now()): PetAppearance {
  const options = APPEARANCE_OPTIONS[species];
  const selected = options[Math.abs(seed) % options.length];
  return { version: 1, ...selected };
}

export function petSerial(id: string) {
  return `PP-${id.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}
export const CARE_TASKS = ["feed", "clean", "play", "learn", "sleep"] as const;
export type CareTask = typeof CARE_TASKS[number];
export const PET_SHOP = [
  { id: "bow", name: "Cherry bow", cost: 40, kind: "accessory", emoji: "🎀" },
  { id: "sunny-cap", name: "Sunny cap", cost: 45, kind: "accessory", emoji: "🧢" },
  { id: "bookish-glasses", name: "Bookish glasses", cost: 55, kind: "accessory", emoji: "👓" },
  { id: "crown", name: "Little crown", cost: 60, kind: "accessory", emoji: "👑" },
  { id: "cozy-scarf", name: "Cozy scarf", cost: 65, kind: "accessory", emoji: "🧣" },
  { id: "tiny-backpack", name: "Tiny backpack", cost: 75, kind: "accessory", emoji: "🎒" },
  { id: "sparkles", name: "Star halo", cost: 80, kind: "accessory", emoji: "✨" },
  { id: "rainbow-cape", name: "Rainbow cape", cost: 90, kind: "accessory", emoji: "🦸" },
  { id: "garden", name: "Garden nook", cost: 100, kind: "room", emoji: "🌷" },
  { id: "library", name: "Storybook room", cost: 150, kind: "room", emoji: "📚" },
  { id: "stargazer", name: "Stargazer room", cost: 180, kind: "room", emoji: "🌌" },
  { id: "sunroom", name: "Sunny sunroom", cost: 210, kind: "room", emoji: "☀️" },
  { id: "flower-wall", name: "Flower wall art", cost: 35, kind: "decor", emoji: "🖼️" },
  { id: "potted-palm", name: "Potted palm", cost: 45, kind: "decor", emoji: "🌿" },
  { id: "cozy-sofa", name: "Cozy sofa", cost: 70, kind: "decor", emoji: "🛋️" },
  { id: "reading-lamp", name: "Reading lamp", cost: 55, kind: "decor", emoji: "💡" },
  { id: "tea-table", name: "Tea table", cost: 60, kind: "decor", emoji: "🪑" },
  { id: "wall-shelves", name: "Wall shelves", cost: 80, kind: "decor", emoji: "🗄️" },
] as const;
export const PLAY_SYMBOLS = ["🍓", "🌸", "🍡", "⭐"];

type Lesson = { id: string; topic: string; question: string; choices: string[]; answer: number; explanation: string; minAge: number; maxAge: number };
const LESSONS: Lesson[] = [
  // Ages 3–5: concrete, short prompts with familiar ideas.
  { id: "count-three", topic: "Counting", question: "Mochi has 2 treats. You give 1 more. How many treats now?", choices: ["2", "3", "4"], answer: 1, explanation: "2 treats plus 1 treat makes 3 treats.", minAge: 3, maxAge: 5 },
  { id: "triangle-sides", topic: "Shapes", question: "How many sides does a triangle have?", choices: ["Two", "Three", "Four"], answer: 1, explanation: "A triangle has three straight sides.", minAge: 3, maxAge: 5 },
  { id: "plant-needs", topic: "Nature", question: "What does a little plant need to grow?", choices: ["Water and sunlight", "Candy", "A pillow"], answer: 0, explanation: "Plants use water and sunlight to grow.", minAge: 3, maxAge: 5 },
  { id: "kind-friend", topic: "Kindness", question: "A friend drops their crayons. What is kind to do?", choices: ["Help pick them up", "Hide them", "Laugh"], answer: 0, explanation: "Helping is a kind way to care for a friend.", minAge: 3, maxAge: 5 },
  { id: "color-mix", topic: "Colors", question: "What color can you make with red and yellow?", choices: ["Green", "Orange", "Purple"], answer: 1, explanation: "Red and yellow mix to make orange.", minAge: 3, maxAge: 5 },
  { id: "day-sun", topic: "Sky", question: "What do you usually see in the sky during the day?", choices: ["The sun", "The moon", "Fireflies"], answer: 0, explanation: "The sun lights the sky during the day.", minAge: 3, maxAge: 5 },
  { id: "five-fingers", topic: "Body", question: "How many fingers are on one hand?", choices: ["3", "5", "10"], answer: 1, explanation: "One hand has five fingers.", minAge: 3, maxAge: 5 },
  { id: "sort-big", topic: "Comparing", question: "Which is bigger: an elephant or a mouse?", choices: ["A mouse", "They are the same", "An elephant"], answer: 2, explanation: "An elephant is much bigger than a mouse.", minAge: 3, maxAge: 5 },

  // Ages 6–8: early elementary math, science, and reading skills.
  { id: "share-eight", topic: "Math", question: "You have 8 dumplings and share them equally with your pal. How many does each get?", choices: ["2", "4", "6"], answer: 1, explanation: "8 split between 2 is 4 each.", minAge: 6, maxAge: 8 },
  { id: "butterfly-change", topic: "Nature", question: "What can a caterpillar grow into?", choices: ["A butterfly or moth", "A fish", "A frog"], answer: 0, explanation: "Caterpillars change into butterflies or moths.", minAge: 6, maxAge: 8 },
  { id: "pattern-fives", topic: "Patterns", question: "5, 10, 15, 20… what comes next?", choices: ["21", "25", "30"], answer: 1, explanation: "The pattern adds 5 each time, so 20 + 5 = 25.", minAge: 6, maxAge: 8 },
  { id: "sentence-punctuation", topic: "Reading", question: "Which mark belongs at the end of a question?", choices: ["?", ".", "!"], answer: 0, explanation: "A question mark shows that a sentence is asking something.", minAge: 6, maxAge: 8 },
  { id: "solid-ice", topic: "Science", question: "What happens when water gets very cold and freezes?", choices: ["It becomes ice", "It becomes a cloud", "It disappears"], answer: 0, explanation: "Frozen water is ice, a solid.", minAge: 6, maxAge: 8 },
  { id: "quarter-hour", topic: "Time", question: "How many minutes are in a quarter of an hour?", choices: ["10", "15", "25"], answer: 1, explanation: "An hour has 60 minutes, and one quarter of 60 is 15.", minAge: 6, maxAge: 8 },
  { id: "habitat-fish", topic: "Habitats", question: "Where does a fish usually live?", choices: ["In water", "In a nest", "In a tree"], answer: 0, explanation: "Fish live in water, such as ponds, rivers, lakes, and oceans.", minAge: 6, maxAge: 8 },
  { id: "word-synonym", topic: "Words", question: "Which word means almost the same as “happy”?", choices: ["Glad", "Sleepy", "Tiny"], answer: 0, explanation: "Glad is another word for happy.", minAge: 6, maxAge: 8 },

  // Ages 9–12: upper-elementary reasoning and curriculum-friendly concepts.
  { id: "fraction-quarter", topic: "Fractions", question: "You eat 3 of 12 dumplings. What fraction did you eat?", choices: ["One half", "One third", "One quarter"], answer: 2, explanation: "3/12 simplifies to 1/4, or one quarter.", minAge: 9, maxAge: 12 },
  { id: "gravity-ball", topic: "Science", question: "What force brings a ball back to the ground after it is tossed?", choices: ["Gravity", "Sound", "Sunlight"], answer: 0, explanation: "Gravity pulls objects toward Earth.", minAge: 9, maxAge: 12 },
  { id: "perimeter-garden", topic: "Geometry", question: "A square garden has sides that are 4 feet long. What is its perimeter?", choices: ["8 feet", "12 feet", "16 feet"], answer: 2, explanation: "A square has four equal sides: 4 + 4 + 4 + 4 = 16 feet.", minAge: 9, maxAge: 12 },
  { id: "ecosystem-role", topic: "Ecosystems", question: "What do plants provide for many animals in an ecosystem?", choices: ["Food and oxygen", "Only shadows", "Metal"], answer: 0, explanation: "Plants can provide food and release oxygen that animals use.", minAge: 9, maxAge: 12 },
  { id: "decimal-money", topic: "Math", question: "A toy costs $3.75. You pay $5.00. How much change should you get?", choices: ["$1.25", "$1.75", "$2.25"], answer: 0, explanation: "$5.00 − $3.75 = $1.25.", minAge: 9, maxAge: 12 },
  { id: "main-idea", topic: "Reading", question: "What is the main idea of a paragraph?", choices: ["Its most important point", "The first word", "Every tiny detail"], answer: 0, explanation: "The main idea is the central message the paragraph is mostly about.", minAge: 9, maxAge: 12 },
  { id: "code-loop", topic: "Logic", question: "A loop repeats a task 4 times and gives 2 treats each time. How many treats are given?", choices: ["6", "8", "12"], answer: 1, explanation: "4 groups of 2 equals 8 treats.", minAge: 9, maxAge: 12 },
  { id: "states-matter", topic: "Science", question: "Which state of matter has a fixed shape and fixed volume?", choices: ["Solid", "Liquid", "Gas"], answer: 0, explanation: "A solid keeps both its shape and volume.", minAge: 9, maxAge: 12 },

  // Ages 13–18: middle/high-school level analysis, numeracy, and digital literacy.
  { id: "percent-discount", topic: "Math", question: "A $40 backpack is 25% off. What is the sale price?", choices: ["$10", "$30", "$35"], answer: 1, explanation: "25% of $40 is $10, so the sale price is $30.", minAge: 13, maxAge: 18 },
  { id: "variable-solve", topic: "Algebra", question: "Solve 3x + 5 = 20. What is x?", choices: ["3", "5", "7"], answer: 1, explanation: "Subtract 5 to get 3x = 15, then divide by 3: x = 5.", minAge: 13, maxAge: 18 },
  { id: "claim-evidence", topic: "Research", question: "What best supports a claim in a school project?", choices: ["A reliable source and evidence", "A guess", "The loudest opinion"], answer: 0, explanation: "Claims are strongest when they are backed by credible evidence.", minAge: 13, maxAge: 18 },
  { id: "carbon-cycle", topic: "Science", question: "Which process moves carbon dioxide from the air into plants?", choices: ["Photosynthesis", "Evaporation", "Erosion"], answer: 0, explanation: "During photosynthesis, plants take in carbon dioxide.", minAge: 13, maxAge: 18 },
  { id: "average-data", topic: "Data", question: "What is the mean of 6, 8, and 10?", choices: ["7", "8", "9"], answer: 1, explanation: "(6 + 8 + 10) ÷ 3 = 8.", minAge: 13, maxAge: 18 },
  { id: "password-safety", topic: "Digital safety", question: "Which is the safest choice for a new password?", choices: ["A long, unique passphrase", "Your first name", "123456"], answer: 0, explanation: "Long, unique passphrases are much harder for others to guess.", minAge: 13, maxAge: 18 },
  { id: "slope-change", topic: "Graphs", question: "On a distance-versus-time graph, what does a steeper upward line usually show?", choices: ["Faster speed", "No movement", "Less time"], answer: 0, explanation: "A steeper upward distance line means distance is increasing more quickly.", minAge: 13, maxAge: 18 },
  { id: "opportunity-cost", topic: "Decision-making", question: "What is an opportunity cost?", choices: ["The next-best option you give up", "A free reward", "A type of tax"], answer: 0, explanation: "Choosing one option means giving up the next-best alternative.", minAge: 13, maxAge: 18 },
];

export type PetState = {
  species: PetSpecies; name: string; adoptedAt: number; updatedAt: number;
  serialNumber?: string; appearance?: PetAppearance;
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
export function createPet(species: PetSpecies, name: string, now: number, day: string, serialNumber?: string, appearance = createPetAppearance(species, now)): PetState {
  return { species, name, adoptedAt: now, updatedAt: now, hunger: 65, happiness: 75, cleanliness: 60, energy: 70, smarts: 0, bond: 10,
    xp: 0, coins: 20, dumplings: 6, lessonsLearned: 0, gamesPlayed: 0, owned: [], accessory: null, room: "home",
    serialNumber, appearance,
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
  // Keep each learner in their own age band instead of mixing in questions
  // written for younger students as they get older. Clamping also keeps the
  // game safe if a household config allows an age outside its normal 3–18 range.
  const lessonAge = Math.min(18, Math.max(3, age));
  const available = LESSONS.filter((l) => l.minAge <= lessonAge && lessonAge <= l.maxAge);
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
      if (item.kind === "accessory") pet.accessory = item.id;
      if (item.kind === "room") pet.room = item.id;
      message = `${item.name} unlocked!`; break;
    }
    case "equip": {
      if (input.itemId === "home") { pet.room = "home"; break; }
      if (input.itemId === "none") { pet.accessory = null; break; }
      const item = PET_SHOP.find((i) => i.id === input.itemId);
      if (!item || !pet.owned.includes(item.id)) throw new PetActionError("Unlock this item first.");
      if (item.kind === "accessory") { pet.accessory = item.id; message = `${item.name} equipped.`; break; }
      if (item.kind === "room") { pet.room = item.id; message = `${pet.name} moved to the ${item.name}.`; break; }
      throw new PetActionError("Decorations are placed automatically in every room.");
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
