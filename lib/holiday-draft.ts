import { cleanAmazonImageUrl, cleanAmazonUrl } from "./amazon";
import type { AmazonProduct } from "./amazon-creators";

export const HOLIDAY_DRAFT_KEY = "choreslist-holiday-draft-v1";
export type HolidayList = { id: string; title: string; items: AmazonProduct[] };
export function parseHolidayDraft(value: unknown): HolidayList[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).flatMap((list) => {
    if (!list || typeof list.id !== "string" || !/^[a-f0-9-]{36}$/i.test(list.id) || typeof list.title !== "string") return [];
    const items: AmazonProduct[] = Array.isArray(list.items) ? list.items.slice(0, 2).flatMap((item: any) => {
      if (!item || typeof item.title !== "string" || !item.title.trim()) return [];
      return [{ asin: typeof item.asin === "string" ? item.asin.slice(0, 100) : "", title: item.title.slice(0, 255),
        url: cleanAmazonUrl(item.url) ?? "", imageUrl: cleanAmazonImageUrl(item.imageUrl), price: typeof item.price === "string" ? item.price.slice(0, 50) : null }];
    }) : [];
    return [{ id: list.id, title: list.title.slice(0, 120), items }];
  });
}
