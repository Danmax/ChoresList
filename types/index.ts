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

export const AVATAR_OPTIONS = [
  "🧒", "👦", "👧", "🧑", "👶", "🦸", "🧙", "🐶",
  "🐱", "🦊", "🐸", "🐼", "🦁", "🐯", "🐻", "🐨",
];

export const KID_COLORS = [
  "#a78bfa", "#60a5fa", "#34d399", "#f87171",
  "#fbbf24", "#f472b6", "#38bdf8", "#4ade80",
];
