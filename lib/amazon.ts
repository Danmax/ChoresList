const AMAZON_HOST = "www.amazon.com";

export function amazonSearchUrl(query: string) {
  const cleanQuery = query.trim().slice(0, 200);
  if (!cleanQuery) return "";
  const url = new URL("https://www.amazon.com/s");
  url.searchParams.set("k", cleanQuery);
  return url.toString();
}

export function cleanAmazonUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    const isAmazonHost = hostname === "amazon.com" || hostname.endsWith(".amazon.com") || hostname === "a.co";
    if (url.protocol !== "https:" || !isAmazonHost) {
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
    const allowed = hostname === "m.media-amazon.com" || hostname.endsWith(".ssl-images-amazon.com");
    if (url.protocol !== "https:" || !allowed) return null;
    url.hash = "";
    return url.toString().slice(0, 2048);
  } catch {
    return null;
  }
}
