export type MemberRole = "parent" | "child";
export type Frequency = "daily" | "weekly" | "one-time";
export type Recurring = "none" | "weekly" | "monthly";

export type EventType =
  | "movie-night"
  | "game-night"
  | "tech"
  | "media"
  | "church"
  | "school"
  | "volunteer"
  | "cleaning-day"
  | "park"
  | "playdate"
  | "beach"
  | "sick-day"
  | "doctors-appointment"
  | "vacation"
  | "bible-study"
  | "work"
  | "yard-work"
  | "sports"
  | "date"
  | "rehearsal"
  | "training"
  | "other";

export const EVENT_TYPE_META: Record<
  EventType,
  { label: string; icon: string; color: string }
> = {
  "movie-night": { label: "Movie Night", icon: "🎬", color: "#6366f1" },
  "game-night": { label: "Game Night", icon: "🎮", color: "#8b5cf6" },
  tech: { label: "Tech", icon: "💻", color: "#0ea5e9" },
  media: { label: "Media", icon: "🎥", color: "#ec4899" },
  church: { label: "Church", icon: "⛪", color: "#fbbf24" },
  school: { label: "School Day", icon: "🏫", color: "#3b82f6" },
  volunteer: { label: "Volunteer", icon: "🤝", color: "#10b981" },
  "cleaning-day": { label: "Cleaning Day", icon: "🧹", color: "#f59e0b" },
  park: { label: "Park", icon: "🌳", color: "#22c55e" },
  playdate: { label: "Play Date", icon: "🧸", color: "#ec4899" },
  beach: { label: "Beach Day", icon: "🏖️", color: "#06b6d4" },
  "sick-day": { label: "Sick Day", icon: "🤒", color: "#94a3b8" },
  "doctors-appointment": { label: "Doctor's Appointment", icon: "🩺", color: "#06b6d4" },
  vacation: { label: "Vacation", icon: "✈️", color: "#0ea5e9" },
  "bible-study": { label: "Bible Study", icon: "📖", color: "#8b5cf6" },
  work: { label: "Work", icon: "💼", color: "#475569" },
  "yard-work": { label: "Yard Work", icon: "🌿", color: "#16a34a" },
  sports: { label: "Sports", icon: "⚽", color: "#f97316" },
  date: { label: "Date", icon: "❤️", color: "#ec4899" },
  rehearsal: { label: "Rehearsal", icon: "🎭", color: "#d946ef" },
  training: { label: "Training", icon: "🏋️", color: "#eab308" },
  other: { label: "Other", icon: "📅", color: "#a78bfa" },
};

export const CHORE_CATEGORIES = [
  { value: "cleaning", label: "Cleaning", icon: "🧹" },
  { value: "outdoor", label: "Outdoor", icon: "🌿" },
  { value: "pets", label: "Pet Care", icon: "🐾" },
  { value: "kitchen", label: "Kitchen", icon: "🍽️" },
  { value: "laundry", label: "Laundry", icon: "👕" },
  { value: "tech", label: "Tech", icon: "💻" },
  { value: "media", label: "Media", icon: "🎥" },
  { value: "faith", label: "Faith", icon: "🙏" },
  { value: "training", label: "Training", icon: "🏋️" },
  { value: "study", label: "Study", icon: "📚" },
  { value: "reading", label: "Reading", icon: "📖" },
  { value: "playing", label: "Playing", icon: "🎮" },
  { value: "resting", label: "Resting", icon: "😴" },
  { value: "other", label: "Other", icon: "✅" },
];

export const CHORE_TEMPLATES_BY_AGE = [
  {
    label: "Prayer, Bible & Worship",
    ageMin: 3,
    ageMax: 18,
    chores: [
      { name: "Prayer Time", icon: "🙏", color: "#ede9fe", pointsValue: 10, category: "faith", description: "Spend a quiet moment praying for family, friends, needs, and gratitude." },
      { name: "Bible Time", icon: "📖", color: "#dbeafe", pointsValue: 10, category: "faith", description: "Read or listen to an age-appropriate Bible passage and share one thing learned." },
      { name: "Worship Time", icon: "🎵", color: "#fef3c7", pointsValue: 10, category: "faith", description: "Spend time worshiping through a song, praise playlist, or family worship moment." },
    ],
  },
  {
    label: "Training, Study, Reading, Playing & Resting",
    ageMin: 3,
    ageMax: 18,
    chores: [
      { name: "Training Time", icon: "🏋️", color: "#dcfce7", pointsValue: 10, category: "training", description: "Practice an approved skill, sport, exercise, or personal growth activity." },
      { name: "Study Time", icon: "📚", color: "#dbeafe", pointsValue: 10, category: "study", description: "Spend focused time on homework, lessons, flashcards, or school review." },
      { name: "Reading Time", icon: "📖", color: "#ede9fe", pointsValue: 10, category: "reading", description: "Read independently or with family for an age-appropriate amount of time." },
      { name: "Playing Time", icon: "🎮", color: "#fce7f3", pointsValue: 10, category: "playing", description: "Enjoy approved free play, creative play, games, or outside play." },
      { name: "Resting Time", icon: "😴", color: "#e0f2fe", pointsValue: 10, category: "resting", description: "Take quiet time to rest, reset, nap, or calm the body and mind." },
    ],
  },
  {
    label: "Ages 3-5",
    ageMin: 3,
    ageMax: 5,
    chores: [
      { name: "Put Shoes Away", icon: "👟", color: "#dbeafe", pointsValue: 5, category: "other", description: "Put shoes in the right spot by the door." },
      { name: "Match Socks", icon: "🧦", color: "#fce7f3", pointsValue: 5, category: "laundry", description: "Match clean socks into pairs." },
    ],
  },
  {
    label: "Ages 6-8",
    ageMin: 6,
    ageMax: 8,
    chores: [
      { name: "Pack Backpack", icon: "🎒", color: "#ede9fe", pointsValue: 10, category: "other", description: "Pack homework, folder, lunch, and water bottle for school." },
      { name: "Put Away Clean Clothes", icon: "👕", color: "#cffafe", pointsValue: 10, category: "laundry", description: "Put folded clothes into drawers or closet." },
    ],
  },
  {
    label: "Ages 9-11",
    ageMin: 9,
    ageMax: 11,
    chores: [
      { name: "Charge Devices", icon: "🔌", color: "#e0f2fe", pointsValue: 10, category: "tech", description: "Plug in school tablet, headphones, and approved devices." },
      { name: "Wipe Screens", icon: "📱", color: "#fce7f3", pointsValue: 10, category: "tech", description: "Use a soft cloth to clean tablet, phone, or laptop screens." },
      { name: "Tidy Media Area", icon: "🎮", color: "#fae8ff", pointsValue: 15, category: "media", description: "Put remotes, controllers, games, and blankets back where they belong." },
    ],
  },
  {
    label: "Ages 12-14",
    ageMin: 12,
    ageMax: 14,
    chores: [
      { name: "Update Family Device", icon: "💻", color: "#dbeafe", pointsValue: 15, category: "tech", description: "Check approved family device updates and report anything that needs help." },
      { name: "Organize Cables", icon: "🔋", color: "#dcfce7", pointsValue: 15, category: "tech", description: "Wrap loose chargers and return cables to the tech drawer." },
      { name: "Choose Family Playlist", icon: "🎧", color: "#fef3c7", pointsValue: 10, category: "media", description: "Build a clean family playlist for dinner, chores, or a drive." },
    ],
  },
  {
    label: "Ages 15-18",
    ageMin: 15,
    ageMax: 18,
    chores: [
      { name: "Back Up Family Photos", icon: "📷", color: "#f0f9ff", pointsValue: 25, category: "media", description: "Help back up approved family photos to the shared storage location." },
      { name: "Check Wi-Fi Area", icon: "📶", color: "#e0e7ff", pointsValue: 15, category: "tech", description: "Check router area, organize cords, and report connection issues." },
    ],
  },
];

export type StarterChoreFrequency = "daily" | "weekly" | "monthly";

export type StarterChoreTemplate = {
  name: string;
  frequency: StarterChoreFrequency;
  icon: string;
  category: string;
  description: string;
  pointsValue: number;
};

export type StarterChoreAgeBand = {
  label: string;
  ageMin: number;
  ageMax: number;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  chores: StarterChoreTemplate[];
  lifeSkills: string[];
};

export const STARTER_CHORE_TEMPLATES_BY_AGE: StarterChoreAgeBand[] = [
  {
    label: "Ages 3-6",
    ageMin: 3,
    ageMax: 6,
    dailyLimit: 4,
    weeklyLimit: 3,
    monthlyLimit: 2,
    chores: [
      { name: "Make Their Bed", frequency: "daily", icon: "🛏️", category: "cleaning", description: "Pull up the blanket and place pillows neatly.", pointsValue: 5 },
      { name: "Put Toys Away", frequency: "daily", icon: "🧸", category: "other", description: "Put toys back after playing.", pointsValue: 5 },
      { name: "Dirty Clothes in Basket", frequency: "daily", icon: "🧺", category: "laundry", description: "Place dirty clothes in the laundry basket.", pointsValue: 5 },
      { name: "Feed Pet with Supervision", frequency: "daily", icon: "🐾", category: "pets", description: "Help feed a family pet with adult help.", pointsValue: 5 },
      { name: "Prayer Time", frequency: "daily", icon: "🙏", category: "faith", description: "Say a short prayer with help from an adult.", pointsValue: 5 },
      { name: "Bible Story Time", frequency: "daily", icon: "📖", category: "faith", description: "Listen to a short Bible story and share one favorite part.", pointsValue: 5 },
      { name: "Reading Time", frequency: "daily", icon: "📖", category: "reading", description: "Look at books or read with an adult.", pointsValue: 5 },
      { name: "Playing Time", frequency: "daily", icon: "🎮", category: "playing", description: "Enjoy approved play time and clean up after.", pointsValue: 5 },
      { name: "Resting Time", frequency: "daily", icon: "😴", category: "resting", description: "Take quiet rest, nap, or calm-down time.", pointsValue: 5 },
      { name: "Sort Laundry by Color", frequency: "weekly", icon: "👕", category: "laundry", description: "Help sort laundry into color groups.", pointsValue: 10 },
      { name: "Wipe Bedroom Furniture", frequency: "weekly", icon: "🧽", category: "cleaning", description: "Wipe bedroom furniture with help.", pointsValue: 10 },
      { name: "Worship Song Time", frequency: "weekly", icon: "🎵", category: "faith", description: "Sing or listen to a worship song with the family.", pointsValue: 10 },
      { name: "Training Time", frequency: "weekly", icon: "🏋️", category: "training", description: "Practice a simple skill, sport, or movement activity with help.", pointsValue: 10 },
      { name: "Set and Clear Dinner Table", frequency: "weekly", icon: "🍽️", category: "kitchen", description: "Help set and clear the dinner table.", pointsValue: 10 },
      { name: "Organize Toy Bin", frequency: "monthly", icon: "📦", category: "other", description: "Organize toys and choose unused toys to donate.", pointsValue: 15 },
      { name: "Check Books and Art Supplies", frequency: "monthly", icon: "🎨", category: "other", description: "Help clean and inspect books and art supplies.", pointsValue: 15 },
    ],
    lifeSkills: ["Learn name, address, and phone number", "Practice saying please and thank you"],
  },
  {
    label: "Ages 7-10",
    ageMin: 7,
    ageMax: 10,
    dailyLimit: 4,
    weeklyLimit: 3,
    monthlyLimit: 2,
    chores: [
      { name: "Make Bed and Tidy Bedroom", frequency: "daily", icon: "🛏️", category: "cleaning", description: "Make the bed and tidy the bedroom.", pointsValue: 10 },
      { name: "Empty Lunchbox", frequency: "daily", icon: "🎒", category: "kitchen", description: "Empty lunchbox and put dishes in the sink or dishwasher.", pointsValue: 10 },
      { name: "Feed Pets and Refresh Water", frequency: "daily", icon: "🐾", category: "pets", description: "Feed pets and refresh their water.", pointsValue: 10 },
      { name: "Homework Before Screen Time", frequency: "daily", icon: "📚", category: "other", description: "Finish homework before screen time.", pointsValue: 10 },
      { name: "Prayer Time", frequency: "daily", icon: "🙏", category: "faith", description: "Pray for family, friends, and one thing you are thankful for.", pointsValue: 10 },
      { name: "Bible Time", frequency: "daily", icon: "📖", category: "faith", description: "Read or listen to a short Bible passage and share one thing learned.", pointsValue: 10 },
      { name: "Study Time", frequency: "daily", icon: "📚", category: "study", description: "Spend focused time on homework, spelling, math, or school review.", pointsValue: 10 },
      { name: "Reading Time", frequency: "daily", icon: "📖", category: "reading", description: "Read independently or with family.", pointsValue: 10 },
      { name: "Resting Time", frequency: "daily", icon: "😴", category: "resting", description: "Take quiet time to rest and reset.", pointsValue: 10 },
      { name: "Fold and Put Away Laundry", frequency: "weekly", icon: "👕", category: "laundry", description: "Fold clean laundry and put it away.", pointsValue: 15 },
      { name: "Worship Time", frequency: "weekly", icon: "🎵", category: "faith", description: "Spend time worshiping through a song or family worship moment.", pointsValue: 15 },
      { name: "Training Time", frequency: "weekly", icon: "🏋️", category: "training", description: "Practice a sport, instrument, exercise, or approved skill.", pointsValue: 15 },
      { name: "Playing Time", frequency: "weekly", icon: "🎮", category: "playing", description: "Enjoy approved play time, games, or outside play.", pointsValue: 15 },
      { name: "Vacuum or Sweep Room", frequency: "weekly", icon: "🧹", category: "cleaning", description: "Vacuum or sweep an assigned room.", pointsValue: 15 },
      { name: "Take Out Small Trash Cans", frequency: "weekly", icon: "🗑️", category: "cleaning", description: "Empty small trash cans around the house.", pointsValue: 15 },
      { name: "Organize Closet and Dresser", frequency: "monthly", icon: "🧥", category: "cleaning", description: "Organize closet and dresser drawers.", pointsValue: 20 },
      { name: "Wash Vehicle or Bicycles", frequency: "monthly", icon: "🚲", category: "outdoor", description: "Help wash the family vehicle or bicycles.", pointsValue: 20 },
    ],
    lifeSkills: ["Pack school bag independently", "Learn basic food preparation"],
  },
  {
    label: "Ages 11-14",
    ageMin: 11,
    ageMax: 14,
    dailyLimit: 4,
    weeklyLimit: 3,
    monthlyLimit: 2,
    chores: [
      { name: "Keep Bedroom Organized", frequency: "daily", icon: "🛏️", category: "cleaning", description: "Keep bedroom clean and organized.", pointsValue: 15 },
      { name: "Dishes or Dishwasher", frequency: "daily", icon: "🍽️", category: "kitchen", description: "Wash dishes or load and unload the dishwasher.", pointsValue: 15 },
      { name: "School Planning", frequency: "daily", icon: "📚", category: "other", description: "Complete homework and school planning.", pointsValue: 15 },
      { name: "Prayer Time", frequency: "daily", icon: "🙏", category: "faith", description: "Pray intentionally for family, friends, needs, and gratitude.", pointsValue: 15 },
      { name: "Bible Time", frequency: "daily", icon: "📖", category: "faith", description: "Read a Bible passage and write or share one takeaway.", pointsValue: 15 },
      { name: "Study Time", frequency: "daily", icon: "📚", category: "study", description: "Spend focused time on homework, class review, or test prep.", pointsValue: 15 },
      { name: "Reading Time", frequency: "daily", icon: "📖", category: "reading", description: "Read a book, article, devotional, or assigned material.", pointsValue: 15 },
      { name: "Resting Time", frequency: "daily", icon: "😴", category: "resting", description: "Take a quiet reset without screens or distractions.", pointsValue: 15 },
      { name: "Assist with Meal Prep", frequency: "daily", icon: "🍳", category: "kitchen", description: "Assist with meal preparation.", pointsValue: 15 },
      { name: "Clean Bathroom Sink and Counters", frequency: "weekly", icon: "🚿", category: "cleaning", description: "Clean bathroom sink, mirror, and counters.", pointsValue: 20 },
      { name: "Yard Work", frequency: "weekly", icon: "🌿", category: "outdoor", description: "Mow lawn or assist with yard work.", pointsValue: 20 },
      { name: "Personal Laundry", frequency: "weekly", icon: "🧺", category: "laundry", description: "Wash and fold personal laundry.", pointsValue: 20 },
      { name: "Worship Time", frequency: "weekly", icon: "🎵", category: "faith", description: "Choose a worship song or devotional song and spend time reflecting.", pointsValue: 20 },
      { name: "Training Time", frequency: "weekly", icon: "🏋️", category: "training", description: "Practice a sport, workout, instrument, or personal growth skill.", pointsValue: 20 },
      { name: "Playing Time", frequency: "weekly", icon: "🎮", category: "playing", description: "Enjoy approved recreation, creative play, games, or time outside.", pointsValue: 20 },
      { name: "Deep Clean Bedroom and Study Area", frequency: "monthly", icon: "🧹", category: "cleaning", description: "Deep clean bedroom and study area.", pointsValue: 30 },
      { name: "Inventory Household Supplies", frequency: "monthly", icon: "📋", category: "other", description: "Help inventory pantry or household supplies.", pointsValue: 30 },
    ],
    lifeSkills: ["Create a simple budget", "Learn basic cooking and kitchen safety"],
  },
  {
    label: "Ages 15-18",
    ageMin: 15,
    ageMax: 18,
    dailyLimit: 4,
    weeklyLimit: 3,
    monthlyLimit: 2,
    chores: [
      { name: "Maintain Personal Spaces", frequency: "daily", icon: "🏠", category: "cleaning", description: "Maintain bedroom and personal spaces.", pointsValue: 20 },
      { name: "Manage Laundry Schedule", frequency: "daily", icon: "🧺", category: "laundry", description: "Manage personal laundry schedule.", pointsValue: 20 },
      { name: "Prepare Family Meal", frequency: "daily", icon: "🍳", category: "kitchen", description: "Prepare or assist with a family meal.", pointsValue: 20 },
      { name: "Complete Responsibilities", frequency: "daily", icon: "✅", category: "other", description: "Complete school, work, or family responsibilities.", pointsValue: 20 },
      { name: "Prayer Time", frequency: "daily", icon: "🙏", category: "faith", description: "Spend focused time praying for personal growth, family, friends, and needs.", pointsValue: 20 },
      { name: "Bible Time", frequency: "daily", icon: "📖", category: "faith", description: "Read Scripture and note one practical application for the day.", pointsValue: 20 },
      { name: "Study Time", frequency: "daily", icon: "📚", category: "study", description: "Complete focused academic, work, or certification study.", pointsValue: 20 },
      { name: "Reading Time", frequency: "daily", icon: "📖", category: "reading", description: "Read for growth, school, faith, or personal development.", pointsValue: 20 },
      { name: "Resting Time", frequency: "daily", icon: "😴", category: "resting", description: "Take intentional rest to reset and manage energy.", pointsValue: 20 },
      { name: "Clean Full Bathroom", frequency: "weekly", icon: "🛁", category: "cleaning", description: "Clean a full bathroom.", pointsValue: 30 },
      { name: "Worship Time", frequency: "weekly", icon: "🎵", category: "faith", description: "Spend time in worship through music, reflection, or family worship.", pointsValue: 30 },
      { name: "Training Time", frequency: "weekly", icon: "🏋️", category: "training", description: "Practice fitness, job skills, sport, instrument, or personal growth training.", pointsValue: 30 },
      { name: "Playing Time", frequency: "weekly", icon: "🎮", category: "playing", description: "Enjoy approved recreation, hobbies, games, or social downtime.", pointsValue: 30 },
      { name: "Meal Planning or Grocery Help", frequency: "weekly", icon: "🛒", category: "kitchen", description: "Help with grocery shopping or meal planning.", pointsValue: 30 },
      { name: "Yard Maintenance or Repairs", frequency: "weekly", icon: "🔧", category: "outdoor", description: "Mow lawn, do yard maintenance, or help with repairs.", pointsValue: 30 },
      { name: "Manage Household Project", frequency: "monthly", icon: "📦", category: "other", description: "Manage a household project such as organization, cleaning, or repairs.", pointsValue: 40 },
      { name: "Review Budget Goals", frequency: "monthly", icon: "💵", category: "other", description: "Review personal budget, savings, or financial goals.", pointsValue: 40 },
    ],
    lifeSkills: ["Open and manage a savings account", "Learn job skills, resume building, and interview preparation"],
  },
];

// Kid avatars with skin tone variants
export const AVATAR_OPTIONS = [
  // Default (no skin tone)
  "🧒", "👦", "👧",
  // Light skin 🏻
  "🧒🏻", "👦🏻", "👧🏻",
  // Medium-light 🏼
  "🧒🏼", "👦🏼", "👧🏼",
  // Medium 🏽
  "🧒🏽", "👦🏽", "👧🏽",
  // Medium-dark 🏾
  "🧒🏾", "👦🏾", "👧🏾",
  // Baby/toddler
  "👶", "👶🏻", "👶🏼", "👶🏽", "👶🏾", 
  // Fun characters (no skin tone)
  "🦸", "🧙", "🐶", "🐱", "🦊", "🐸", "🐼", "🦁", "🐯", "🐻", "🐨",
];

// Parent/adult avatars with skin tone variants
export const PARENT_AVATARS = [
  // Woman — all skin tones
  "👩", "👩🏻", "👩🏼", "👩🏽", "👩🏾", 
  // Man — all skin tones
  "👨", "👨🏻", "👨🏼", "👨🏽", "👨🏾", 
  // Person — all skin tones
  "🧑", "🧑🏻", "🧑🏼", "🧑🏽", "🧑🏾", 
  // Curly hair
  "👩‍🦱", "👩🏻‍🦱", "👩🏼‍🦱", "👩🏽‍🦱", "👩🏾‍🦱", 
  "👨‍🦱", "👨🏻‍🦱", "👨🏼‍🦱", "👨🏽‍🦱", "👨🏾‍🦱", 
  // White/grey hair
  "👩‍🦳", "👩🏻‍🦳", "👩🏼‍🦳", "👩🏽‍🦳", "👩🏾‍🦳", 
  "👨‍🦳", "👨🏻‍🦳", "👨🏼‍🦳", "👨🏽‍🦳", "👨🏾‍🦳", 
  // Red hair
  "👩‍🦰", "👩🏻‍🦰", "👩🏼‍🦰", "👩🏽‍🦰", "👩🏾‍🦰", 
  "👨‍🦰", "👨🏻‍🦰", "👨🏼‍🦰", "👨🏽‍🦰", "👨🏾‍🦰", 
  // Blonde
  "👱‍♀️", "👱🏻‍♀️", "👱🏼‍♀️", "👱🏽‍♀️", "👱🏾‍♀️", 
  "👱‍♂️", "👱🏻‍♂️", "👱🏼‍♂️", "👱🏽‍♂️", "👱🏾‍♂️", 
  // Bald
  "👩‍🦲", "👩🏻‍🦲", "👩🏼‍🦲", "👩🏽‍🦲", "👩🏾‍🦲", 
  "👨‍🦲", "👨🏻‍🦲", "👨🏼‍🦲", "👨🏽‍🦲", "👨🏾‍🦲", 
];

// Chore emoji picker options
export const CHORE_EMOJIS = [
  // Cleaning
  "🧹", "🧽", "🫧", "🪣", "🧺", "🧻", "🪥", "🧴", "🛁", "🚿", "🪠",
  // Kitchen
  "🍳", "🥘", "🍽️", "🧑‍🍳", "🥄", "🫕", "🥗", "🍵", "☕", "🧂",
  // Outdoor / yard
  "🌿", "🌱", "🌻", "🍂", "🌳", "🏡", "🚰", "⛏️", "🔨", "🪴",
  // Pets
  "🐕", "🦮", "🐈", "🐾", "🐠", "🐹", "🐇", "🦜",
  // Laundry
  "👕", "👖", "🧣", "🧥",
  // General task
  "⭐", "✅", "🌟", "💪", "📚", "🎒", "🔧", "🚗", "🏠", "📦", "🪜",
  "🛒", "♻️", "🗑️", "📬", "🖥️", "🎵", "🎨",
  // Faith
  "🙏", "📖", "⛪",
  // Growth and routines
  "🏋️", "📚", "🎮", "😴", "🧘", "📝",
];

export const COMPLETION_EMOJIS = [
  "😄",
  "🥳",
  "💪",
  "⭐",
  "🎉",
  "🙌",
  "😎",
  "❤️",
  "🙏",
  "😕",
  "😓",
  "😣",
  "😞",
  "😴",
  "🔥",
  "✅",
  "🏆",
];

export const KID_COLORS = [
  "#a78bfa", "#60a5fa", "#34d399", "#f87171",
  "#fbbf24", "#f472b6", "#38bdf8", "#4ade80",
];

export const WISH_CATEGORIES = [
  { value: "toy", label: "Toy / Game", emoji: "🎮", color: "#a78bfa", bg: "#ede9fe" },
  { value: "clothes", label: "Clothes / Shoes", emoji: "👟", color: "#60a5fa", bg: "#dbeafe" },
  { value: "outing", label: "Outing / Activity", emoji: "🎉", color: "#34d399", bg: "#d1fae5" },
  { value: "food", label: "Food / Treat", emoji: "🍕", color: "#fbbf24", bg: "#fef3c7" },
  { value: "other", label: "Other", emoji: "⭐", color: "#f472b6", bg: "#fce7f3" },
];

export const PROJECT_CATEGORIES = [
  { value: "repair", label: "Repair", emoji: "🔧" },
  { value: "car-wash", label: "Car Wash", emoji: "🚗" },
  { value: "construct", label: "Construct", emoji: "🏗️" },
  { value: "build", label: "Build", emoji: "🔨" },
  { value: "present", label: "Present", emoji: "🗣️" },
  { value: "yard", label: "Yard Work", emoji: "🌿" },
  { value: "painting", label: "Painting", emoji: "🎨" },
  { value: "cleaning", label: "Deep Clean", emoji: "🧹" },
  { value: "assembly", label: "Assembly", emoji: "📦" },
  { value: "garden", label: "Garden", emoji: "🌱" },
  { value: "other", label: "Other", emoji: "✨" },
];

export const PROJECT_EMOJIS = [
  "🔧","🪛","🔨","🪚","🪜","🪣","🧰","⚙️","🔩","🪝",
  "🌿","🍂","🌳","🌱","🌻","🪴","🏡","🚰","⛏️","🌾",
  "🎨","🖌️","🖼️","✨","💡","🪟","🚪","🛋️","🪞","🛁",
  "🧹","🧽","🫧","📦","🛒","♻️","🗑️","📬","🏠","🪤","🚗","🏗️","🗣️",
];

export const REWARD_PRESETS = [
  { emoji: "🎁", title: "Gift Card" },
  { emoji: "💵", title: "Cash" },
  { emoji: "🍰", title: "Dessert" },
  { emoji: "🍦", title: "Ice Cream Treat" },
  { emoji: "🍩", title: "Dessert of Choice" },
  { emoji: "🍕", title: "Pick Tonight's Dinner" },
  { emoji: "🦶", title: "Foot Massage" },
  { emoji: "💆", title: "Back / Shoulder Rub" },
  { emoji: "🎬", title: "Movie Night Pick" },
  { emoji: "🎮", title: "Extra Screen Time" },
  { emoji: "🛍️", title: "Small Shopping Trip" },
  { emoji: "💤", title: "Stay Up 30 Min Later" },
  { emoji: "🎪", title: "Fun Day Out" },
  { emoji: "🥂", title: "Date Night" },
  { emoji: "🧁", title: "Bake Something Together" },
  { emoji: "🎉", title: "Pick a Family Activity" },
];

export const WISH_EMOJIS: Record<string, string[]> = {
  toy:     ["🎮", "🧸", "🎲", "🪀", "🎯", "🎁", "🚀", "🦕", "🤖", "🧩", "🎪", "🎠", "🪁", "🏀", "⚽", "🎸"],
  clothes: ["👟", "👕", "👗", "🧢", "👒", "🧣", "🧤", "🎒", "👗", "🩴", "🧦", "🕶️"],
  outing:  ["🎬", "⛸️", "🏞️", "🎡", "🏖️", "🎳", "🎭", "🏊", "🎨", "🎤", "🎢", "🏟️", "🌋", "🏕️"],
  food:    ["🍕", "🍦", "🍰", "🍩", "🍿", "🌮", "🍣", "🥤", "🧋", "🍜", "🥞", "🍔"],
  other:   ["⭐", "🌟", "💝", "🎀", "💎", "🌈", "🦋", "🌺", "🎵", "📱", "💻", "📷"],
};
