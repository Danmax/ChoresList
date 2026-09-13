export const WISH_LIST_TYPES = ["general", "christmas", "birthday"] as const;
export type WishListType = (typeof WISH_LIST_TYPES)[number];

export const GIFT_PURCHASE_STATUSES = ["not_ordered", "ordered", "obtained"] as const;
export type GiftPurchaseStatus = (typeof GIFT_PURCHASE_STATUSES)[number];

export const GIFT_PURCHASE_STATUS_META: Record<GiftPurchaseStatus, { label: string; shortLabel: string; emoji: string }> = {
  not_ordered: { label: "Not ordered", shortLabel: "Idea", emoji: "💭" },
  ordered: { label: "Ordered", shortLabel: "Ordered", emoji: "📦" },
  obtained: { label: "Obtained · ready to give", shortLabel: "Obtained", emoji: "🎁" },
};

export function cleanGiftPurchaseStatus(value: unknown): GiftPurchaseStatus | null {
  return typeof value === "string" && GIFT_PURCHASE_STATUSES.includes(value as GiftPurchaseStatus)
    ? value as GiftPurchaseStatus
    : null;
}

export function parseEstimatedCostCents(value: unknown): { valid: boolean; value?: number | null } {
  if (value === undefined) return { valid: true };
  if (value === null || value === "") return { valid: true, value: null };
  const amount = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) return { valid: false };
  return { valid: true, value: Math.round(amount * 100) };
}

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

export function wishListEventYear(type: WishListType, birthdayMonth?: number | null, birthdayDay?: number | null, now = new Date()) {
  if (type === "christmas") return now.getMonth() === 11 && now.getDate() > 25 ? now.getFullYear() + 1 : now.getFullYear();
  if (type !== "birthday" || !birthdayMonth || !birthdayDay) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const birthday = new Date(now.getFullYear(), birthdayMonth - 1, birthdayDay);
  return birthday < today ? now.getFullYear() + 1 : now.getFullYear();
}
