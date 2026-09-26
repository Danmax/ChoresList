import { cleanAmazonImageUrl, cleanAmazonUrl } from "@/lib/amazon";

function metaContent(html: string, property: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key = /\b(?:property|name)\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1]?.toLowerCase();
    if (key !== property) continue;
    const value = /\bcontent\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2] ?? /\bcontent\s*=\s*([^\s>]+)/i.exec(tag)?.[1];
    if (value) return value.replace(/&amp;/g, "&");
  }
  return null;
}

async function fetchRetailerPage(url: string, redirects = 0): Promise<string | null> {
  if (redirects > 3) return null;
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "manual",
    headers: { "User-Agent": "ChoresList product preview/1.0", Accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(8_000),
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) return null;
    const next = cleanAmazonUrl(new URL(location, url).toString());
    return next ? fetchRetailerPage(next, redirects + 1) : null;
  }
  if (!response.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) return null;
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > 1_500_000) return null;
  return (await response.text()).slice(0, 1_500_000);
}

export async function fetchProductPreview(value: unknown) {
  const url = cleanAmazonUrl(value);
  if (!url) return null;
  const html = await fetchRetailerPage(url);
  if (!html) return null;
  const imageUrl = cleanAmazonImageUrl(metaContent(html, "og:image"));
  const title = metaContent(html, "og:title")?.slice(0, 120) ?? null;
  return imageUrl ? { imageUrl, title } : null;
}
