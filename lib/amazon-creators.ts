type CachedToken = { value: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

export type AmazonProduct = { asin: string; title: string; url: string; imageUrl: string | null; price: string | null; description?: string | null; seller?: string | null };

function productFromItem(item: any): AmazonProduct | null {
  const title = item?.itemInfo?.title?.displayValue;
  const url = item?.detailPageURL;
  if (typeof item?.asin !== "string" || typeof title !== "string" || typeof url !== "string") return null;
  const offer = item?.offersV2?.listings?.[0];
  const features = item?.itemInfo?.features?.displayValues;
  return { asin: item.asin, title, url,
    imageUrl: item?.images?.primary?.medium?.url ?? item?.images?.primary?.small?.url ?? null,
    price: typeof offer?.price?.money?.displayAmount === "string" ? offer.price.money.displayAmount : null,
    description: Array.isArray(features) ? features.filter((value: unknown) => typeof value === "string").slice(0, 2).join(" ").slice(0, 400) || null : null,
    seller: typeof offer?.merchantInfo?.name === "string" ? offer.merchantInfo.name : null,
  };
}

function credentials() {
  const clientId = process.env.AMAZON_CREATORS_CLIENT_ID?.trim();
  const clientSecret = process.env.AMAZON_CREATORS_CLIENT_SECRET?.trim();
  const partnerTag = process.env.AMAZON_CREATORS_PARTNER_TAG?.trim();
  return clientId && clientSecret && partnerTag ? { clientId, clientSecret, partnerTag } : null;
}

async function accessToken(clientId: string, clientSecret: string) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret, scope: "creatorsapi::default" }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || typeof data?.access_token !== "string") throw new Error("Amazon authentication failed");
  cachedToken = { value: data.access_token, expiresAt: Date.now() + Math.max(300, Number(data.expires_in) || 3600) * 1000 };
  return cachedToken.value;
}

export async function searchAmazonProducts(query: string): Promise<AmazonProduct[] | null> {
  const config = credentials();
  if (!config) return null;
  const token = await accessToken(config.clientId, config.clientSecret);
  const res = await fetch("https://creatorsapi.amazon/catalog/v1/searchItems", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-marketplace": "www.amazon.com" },
    body: JSON.stringify({
      keywords: query,
      marketplace: "www.amazon.com",
      partnerTag: config.partnerTag,
      searchIndex: "All",
      itemCount: 8,
      resources: ["images.primary.medium", "itemInfo.title", "itemInfo.features", "offersV2.listings.price", "offersV2.listings.merchantInfo"],
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.errors?.[0]?.message ?? "Amazon product search failed");
  const items = Array.isArray(data?.searchResult?.items) ? data.searchResult.items : [];
  return items.flatMap((item: any) => productFromItem(item) ?? []);
}

export async function getAmazonProduct(asin: string): Promise<AmazonProduct | null> {
  if (!/^[A-Z0-9]{10}$/i.test(asin)) return null;
  const config = credentials();
  if (!config) return null;
  const token = await accessToken(config.clientId, config.clientSecret);
  const res = await fetch("https://creatorsapi.amazon/catalog/v1/getItems", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-marketplace": "www.amazon.com" }, body: JSON.stringify({ itemIds: [asin], itemIdType: "ASIN", marketplace: "www.amazon.com", partnerTag: config.partnerTag, resources: ["images.primary.small", "itemInfo.title", "offersV2.listings.price"] }), cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.errors?.[0]?.message ?? "Amazon item lookup failed");
  const item = Array.isArray(data?.itemsResult?.items) ? data.itemsResult.items[0] : null;
  return productFromItem(item);
}
