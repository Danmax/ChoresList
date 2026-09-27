import { NextRequest, NextResponse } from "next/server";
import { searchAmazonProducts } from "@/lib/amazon-creators";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { key: "guest-gift-search", limit: 10, windowMs: 60_000 })
    ?? rateLimit(req, { key: "guest-gift-search-global", bucket: "all", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 200) return NextResponse.json({ error: "Enter 2–200 characters" }, { status: 400 });
  try {
    const products = await searchAmazonProducts(query);
    return products ? NextResponse.json({ products }, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json({ configured: false }, { status: 503 });
  } catch {
    return NextResponse.json({ error: "Product search is unavailable. Try again shortly." }, { status: 503 });
  }
}
