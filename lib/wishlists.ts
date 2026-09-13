export const WISH_LIST_TYPES = ["general", "christmas", "birthday"] as const;
export type WishListType = (typeof WISH_LIST_TYPES)[number];

export const WISH_LIST_TYPE_META: Record<WishListType, { label: string; emoji: string; description: string }> = {
  general: { label: "Wish List", emoji: "✨", description: "Gift ideas for any time of year" },
  christmas: { label: "Christmas List", emoji: "🎄", description: "Christmas gift ideas" },
  birthday: { label: "Birthday List", emoji: "🎂", description: "Available six weeks before the birthday" },
};

export function cleanWishListType(value: unknown): WishListType | null {
  return typeof value === "string" && WISH_LIST_TYPES.includes(value as WishListType)
    ? value as WishListType
    : null;
}

export function daysUntilBirthday(month: number | null | undefined, day: number | null | undefined, now = new Date()) {
  if (!month || !day) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let birthday = new Date(today.getFullYear(), month - 1, day);
  if (birthday < today) birthday = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.round((birthday.getTime() - today.getTime()) / 86_400_000);
}

export function canCreateBirthdayList(month: number | null | undefined, day: number | null | undefined, now = new Date()) {
  const days = daysUntilBirthday(month, day, now);
  return days !== null && days <= 42;
}

export function defaultWishListTitle(type: WishListType, memberName: string, now = new Date()) {
  if (type === "birthday") return `${memberName}'s Birthday List`;
  if (type === "christmas") {
    const christmasYear = now.getMonth() === 11 && now.getDate() > 25 ? now.getFullYear() + 1 : now.getFullYear();
    return `Christmas ${christmasYear}`;
  }
  return `${memberName}'s Wish List`;
}
