import { NextRequest, NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

type NominatimPlace = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

function compactAddress(place: NominatimPlace) {
  const address = place.address;
  if (!address) return place.display_name;

  const street = [address.house_number, address.road].filter(Boolean).join(" ");
  const city = address.city ?? address.town ?? address.village ?? address.suburb ?? address.neighbourhood;
  const region = [address.state, address.postcode].filter(Boolean).join(" ");
  return [street, city, region].filter(Boolean).join(", ") || place.display_name;
}

export const GET = withErrors(async (req: NextRequest) => {
  const limited = rateLimit(req, { key: "location-lookup", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 4) return NextResponse.json({ results: [] });

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "6",
    countrycodes: "us",
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "ChoresList family calendar address lookup",
    },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) {
    return NextResponse.json({ results: [] }, { status: 502 });
  }

  const places = (await res.json()) as NominatimPlace[];
  const results = places.map((place) => ({
    id: String(place.place_id),
    label: compactAddress(place),
    fullAddress: place.display_name,
    latitude: Number(place.lat),
    longitude: Number(place.lon),
  }));

  return NextResponse.json({ results });
});
