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
    if (hostname === "walmart.com" || hostname.endsWith(".walmart.com")) return "Walmart";
    if (hostname === "amazon.com" || hostname.endsWith(".amazon.com") || hostname === "a.co") return "Amazon";
    return hostname.replace(/^www\./, "");
  } catch {
    return "Store";
  }
}

export function cleanProductUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    url.hash = "";
    return url.toString().slice(0, 2048);
  } catch {
    return null;
  }
}

export function cleanProductImageUrl(value: unknown) {
  return cleanProductUrl(value);
}

export function supportsProductPreview(value: string | null | undefined) {
  return cleanAmazonUrl(value) !== null;
}

export function looksLikeImageUrl(value: string) {
  try {
    const url = new URL(value);
    return /\.(avif|gif|jpe?g|png|webp)$/i.test(url.pathname);
  } catch {
    return false;
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
