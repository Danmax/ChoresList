export type FamilyStoryId = "garden" | "space" | "bakery" | "camp";
export type PretendContact = { id: string; name: string; emoji: string; story: FamilyStoryId; number: number[] };
type StoryNode = { text: string; choices: { label: string; next: number }[] };
export const FAMILY_STORIES: Record<FamilyStoryId, { title: string; emoji: string; nodes: StoryNode[] }> = {
  garden: { title: "Rainbow garden", emoji: "🌻", nodes: [
    { text: "Hello, little gardener! I'm growing a rainbow garden. What shall we plant together?", choices: [{ label: "🌼 Rainbow flowers", next: 1 }, { label: "🥕 Giant carrots", next: 2 }] },
    { text: "Our flowers are every color of the rainbow! Shall we give them a drink or sing them a growing song?", choices: [{ label: "💦 Sprinkle water", next: 3 }, { label: "🎵 Sing a song", next: 4 }] },
    { text: "These carrots are taller than a teddy bear! Shall we pull one up or invite a bunny for lunch?", choices: [{ label: "🥕 Pull together!", next: 3 }, { label: "🐰 Invite a bunny", next: 4 }] },
    { text: "One, two, three! We did it together! Let's stretch up like a growing flower. Thank you for helping in my pretend garden!", choices: [] },
    { text: "La la la! The garden is dancing! Can you wiggle like a happy little worm? What a wonderful garden team we make!", choices: [] },
  ] },
  space: { title: "Family moon trip", emoji: "🚀", nodes: [
    { text: "Hello from our pretend rocket! Buckle up, space explorer. Where should our family fly today?", choices: [{ label: "🌙 Visit the moon", next: 1 }, { label: "🪐 See Saturn", next: 2 }] },
    { text: "We landed on the moon! Everything feels floaty. Shall we bounce like astronauts or build a moon castle?", choices: [{ label: "🧑‍🚀 Moon jumps", next: 3 }, { label: "🏰 Moon castle", next: 4 }] },
    { text: "Look at Saturn's beautiful rings! A friendly alien is waving. How shall we say hello?", choices: [{ label: "👋 A big wave", next: 3 }, { label: "💃 A silly dance", next: 4 }] },
    { text: "Boing, boing! Three cheers for our space team! Stretch your arms like a rocket. Our pretend family adventure was out of this world!", choices: [] },
    { text: "Twinkle, twinkle, little explorer! We made a new space friend! Let's blow a pretend kiss to the stars before we fly home.", choices: [] },
  ] },
  bakery: { title: "Cookie kitchen", emoji: "🍪", nodes: [
    { text: "Hello, my little baker! I'm making pretend treats for our family. What shall we bake?", choices: [{ label: "🍪 Star cookies", next: 1 }, { label: "🧁 Rainbow cupcakes", next: 2 }] },
    { text: "Stir, stir, stir! Our star cookies need a little sparkle. What should we sprinkle on top?", choices: [{ label: "✨ Magic sprinkles", next: 3 }, { label: "🍓 Strawberry stars", next: 4 }] },
    { text: "Our cupcakes look like tiny rainbows! Shall we swirl the frosting or add a cherry?", choices: [{ label: "🌈 Swirl frosting", next: 3 }, { label: "🍒 Add a cherry", next: 4 }] },
    { text: "Ding! Our pretend treats are ready! Can you pretend to stir a giant mixing bowl? There is a lovely treat for everyone in our family!", choices: [] },
    { text: "Yum, yum! What a wonderful baker you are! Let's put our pretend treats on a plate and share them with someone we love.", choices: [] },
  ] },
  camp: { title: "Teddy bear camp", emoji: "🏕️", nodes: [
    { text: "Hello from teddy bear camp! Our pretend family is going on an adventure. What should we bring?", choices: [{ label: "🧸 My teddy bear", next: 1 }, { label: "🔦 A flashlight", next: 2 }] },
    { text: "Teddy is ready with a tiny backpack! Shall we have a picnic or look for animal tracks?", choices: [{ label: "🧺 Teddy picnic", next: 3 }, { label: "🐾 Find tracks", next: 4 }] },
    { text: "Click! Our flashlight makes a cozy glow. Shall we make shadow animals or look up at the stars?", choices: [{ label: "🐇 Shadow bunny", next: 3 }, { label: "⭐ Watch the stars", next: 4 }] },
    { text: "Hooray for our teddy bear team! Give yourself a big bear hug. Our pretend camp is full of happy little explorers!", choices: [] },
    { text: "Shh! A friendly owl says hello. Can you whisper hoo, hoo? Thank you for sharing this cozy adventure with our pretend family!", choices: [] },
  ] },
};

export const DEFAULT_PRETEND_CONTACTS: PretendContact[] = [
  { id: "mama", name: "Mama", emoji: "👩", story: "garden", number: [1, 2, 3] },
  { id: "papa", name: "Papa", emoji: "🧔", story: "space", number: [2, 3, 1] },
  { id: "grandma", name: "Grandma", emoji: "👵", story: "bakery", number: [3, 1, 2] },
  { id: "grandpa", name: "Grandpa", emoji: "👴", story: "camp", number: [4, 2, 1] },
];
export const CONTACT_NUMBERS = [[1, 2, 3], [2, 3, 1], [3, 1, 2], [4, 2, 1], [5, 1, 3], [2, 5, 4]];
export const CONTACT_FACES = ["👩", "🧔", "👵", "👴", "🧑", "👧", "👦", "🧒", "🧑‍🦱", "👩‍🦰", "🧑‍🚀", "🧸", "🐻", "🐱"];

export function readPretendContacts(value: unknown): PretendContact[] {
  if (!Array.isArray(value)) return DEFAULT_PRETEND_CONTACTS;
  const contacts: PretendContact[] = [];
  const ids = new Set<string>();
  for (const candidate of value.slice(0, 6)) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    if (typeof item.id !== "string" || !/^[a-zA-Z0-9-]{1,64}$/.test(item.id) || ids.has(item.id)
      || typeof item.name !== "string" || !item.name.trim() || typeof item.story !== "string"
      || !Object.hasOwn(FAMILY_STORIES, item.story) || !CONTACT_FACES.includes(String(item.emoji))) continue;
    ids.add(item.id);
    contacts.push({ id: item.id, name: item.name.trim().slice(0, 24), emoji: String(item.emoji), story: item.story as FamilyStoryId, number: CONTACT_NUMBERS[contacts.length] });
  }
  return contacts.length ? contacts : DEFAULT_PRETEND_CONTACTS;
}

export function telephoneSequence(round: number): number[] {
  const patterns = [[2, 1, 3, 2], [1, 3, 2, 1], [3, 2, 1, 3], [4, 1, 5, 2], [2, 5, 3, 4], [6, 0, 7, 9], [8, 3, 9, 0]];
  const safeRound = Math.max(0, Math.floor(Number.isFinite(round) ? round : 0));
  return patterns[safeRound % patterns.length].slice(0, Math.min(4, 2 + Math.floor(safeRound / 2)));
}

export const MELODY_LINES = {
  family: "Let's make believe! Pick someone from your pretend family, then dial their three little numbers.",
  selected: "Tap the three numbers on their card, then press the call button.",
  notFound: "That number isn't in our pretend phone book. Pick a family friend and try their three numbers!",
  dialing: "Let's see who's home! Our pretend phone is calling.",
  familyRinging: "Ring, ring! Someone from your pretend family is calling. Shall we say hello?",
  goodbye: "What a lovely pretend call! Send a big hug and say goodbye.",
  telephone: "Let's play telephone! Listen to a secret number, then dial it back in the same order.",
  listen: "Listen carefully!",
  repeat: "Your turn! Dial the secret number in the same order.",
  retry: "Let's listen once more. You can try again!",
  success: "You passed the secret number! What a wonderful telephone team!",
  preview: "Hello, little explorer! I'm Melody. Shall we play together?",
} as const;
