const AMAZON_HOST = "www.amazon.com";

export function amazonSearchUrl(query: string) {
  const cleanQuery = query.trim().slice(0, 200);
  if (!cleanQuery) return "";
  const url = new URL("https://www.amazon.com/s");
  url.searchParams.set("k", cleanQuery);
  return url.toString();
}

export function walmartSearchUrl(query: string) {
  const cleanQuery = query.trim().slice(0, 200);
  if (!cleanQuery) return "";
  const url = new URL("https://www.walmart.com/search");
  url.searchParams.set("q", cleanQuery);
  return url.toString();
}

export function retailerForUrl(value: string | null | undefined) {
  if (!value) return "Amazon";
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "walmart.com" || hostname.endsWith(".walmart.com") ? "Walmart" : "Amazon";
  } catch {
    return "Amazon";
  }
}

export function cleanAmazonUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    const isAmazonHost = hostname === "amazon.com" || hostname.endsWith(".amazon.com") || hostname === "a.co";
    const isWalmartHost = hostname === "walmart.com" || hostname.endsWith(".walmart.com");
    if (url.protocol !== "https:" || !(isAmazonHost || isWalmartHost)) {
      return null;
    }
    url.hash = "";
    return url.toString().slice(0, 2048);
  } catch {
    return null;
  }
}

export function cleanAmazonImageUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    const allowed = hostname === "m.media-amazon.com" || hostname.endsWith(".ssl-images-amazon.com") || hostname === "i5.walmartimages.com" || hostname.endsWith(".walmartimages.com");
    if (url.protocol !== "https:" || !allowed) return null;
    url.hash = "";
    return url.toString().slice(0, 2048);
  } catch {
    return null;
  }
}
