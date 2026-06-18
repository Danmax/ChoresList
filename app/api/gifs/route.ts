import { NextRequest, NextResponse } from "next/server";
import { requireSession, withErrors } from "@/lib/api";

type GiphyImage = { url?: string };
type GiphyItem = {
  id?: string;
  title?: string;
  images?: {
    fixed_width_small?: GiphyImage;
    fixed_width?: GiphyImage;
    downsized_medium?: GiphyImage;
    original?: GiphyImage;
    preview_gif?: GiphyImage;
  };
};

function cleanQuery(value: string | null) {
  return value?.trim().slice(0, 80) ?? "";
}

function httpsUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export const GET = withErrors(async (req: NextRequest) => {
  requireSession(req);

  const apiKey = process.env.GIPHY_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GIF search is not configured. Set GIPHY_API_KEY, or paste an HTTPS GIF URL." },
      { status: 501 }
    );
  }

  const query = cleanQuery(req.nextUrl.searchParams.get("q"));
  if (query.length < 2) return NextResponse.json({ results: [] });

  const params = new URLSearchParams({
    api_key: apiKey,
    q: query,
    limit: "12",
    rating: "g",
    lang: "en",
  });
  const res = await fetch(`https://api.giphy.com/v1/gifs/search?${params.toString()}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Could not search GIFs" }, { status: 502 });
  }

  const data = (await res.json()) as { data?: GiphyItem[] };
  const results = (Array.isArray(data.data) ? data.data : [])
    .map((item) => {
      const gifUrl = httpsUrl(item.images?.downsized_medium?.url) ?? httpsUrl(item.images?.original?.url);
      const previewUrl =
        httpsUrl(item.images?.fixed_width_small?.url) ??
        httpsUrl(item.images?.preview_gif?.url) ??
        httpsUrl(item.images?.fixed_width?.url) ??
        gifUrl;
      if (!item.id || !gifUrl || !previewUrl) return null;
      return {
        id: item.id,
        title: item.title?.trim() || "GIF",
        previewUrl,
        gifUrl,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ results });
});
