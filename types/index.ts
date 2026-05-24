export type MemberRole = "parent" | "child";
export type Frequency = "daily" | "weekly" | "one-time";
export type Recurring = "none" | "weekly" | "monthly";

export type EventType =
  | "movie-night"
  | "game-night"
  | "church"
  | "school"
  | "volunteer"
  | "cleaning-day"
  | "park"
  | "playdate"
  | "beach"
  | "sick-day"
  | "other";

export const EVENT_TYPE_META: Record<
  EventType,
  { label: string; icon: string; color: string }
> = {
  "movie-night": { label: "Movie Night", icon: "🎬", color: "#6366f1" },
  "game-night": { label: "Game Night", icon: "🎮", color: "#8b5cf6" },
  church: { label: "Church", icon: "⛪", color: "#fbbf24" },
  school: { label: "School Day", icon: "🏫", color: "#3b82f6" },
  volunteer: { label: "Volunteer", icon: "🤝", color: "#10b981" },
  "cleaning-day": { label: "Cleaning Day", icon: "🧹", color: "#f59e0b" },
  park: { label: "Park", icon: "🌳", color: "#22c55e" },
  playdate: { label: "Play Date", icon: "🧸", color: "#ec4899" },
  beach: { label: "Beach Day", icon: "🏖️", color: "#06b6d4" },
  "sick-day": { label: "Sick Day", icon: "🤒", color: "#94a3b8" },
  other: { label: "Other", icon: "📅", color: "#a78bfa" },
};

export const CHORE_CATEGORIES = [
  { value: "cleaning", label: "Cleaning", icon: "🧹" },
  { value: "outdoor", label: "Outdoor", icon: "🌿" },
  { value: "pets", label: "Pet Care", icon: "🐾" },
  { value: "kitchen", label: "Kitchen", icon: "🍽️" },
  { value: "laundry", label: "Laundry", icon: "👕" },
  { value: "other", label: "Other", icon: "✅" },
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
  "🧹","🧽","🫧","📦","🛒","♻️","🗑️","📬","🏠","🪤",
];

export const REWARD_PRESETS = [
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
