import { NextRequest, NextResponse } from "next/server";
import { requireSession, withErrors } from "@/lib/api";
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

type CensusMatch = {
  matchedAddress: string;
  coordinates: { x: number; y: number };
};

type CensusResponse = {
  result?: { addressMatches?: CensusMatch[] };
};

type LocationResult = {
  id: string;
  label: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  matchType: "address" | "street";
};

function compactAddress(place: NominatimPlace, requestedHouseNumber?: string) {
  const address = place.address;
  if (!address) return requestedHouseNumber ? `${requestedHouseNumber} ${place.display_name}` : place.display_name;

  const street = [address.house_number ?? requestedHouseNumber, address.road].filter(Boolean).join(" ");
  const city = address.city ?? address.town ?? address.village ?? address.suburb ?? address.neighbourhood;
  const region = [address.state, address.postcode].filter(Boolean).join(" ");
  return [street, city, region].filter(Boolean).join(", ") || place.display_name;
}

async function censusResults(query: string): Promise<LocationResult[]> {
  const params = new URLSearchParams({
    address: query,
    benchmark: "Public_AR_Current",
    format: "json",
  });
  const res = await fetch(`https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${params.toString()}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) return [];
  const data = await res.json() as CensusResponse;
  return (data.result?.addressMatches ?? []).slice(0, 4).map((match, index) => ({
    id: `census-${match.coordinates.x}-${match.coordinates.y}-${index}`,
    label: match.matchedAddress,
    fullAddress: match.matchedAddress,
    latitude: Number(match.coordinates.y),
    longitude: Number(match.coordinates.x),
    matchType: "address" as const,
  }));
}

async function nominatimResults(query: string, requestedHouseNumber?: string): Promise<LocationResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "8",
    countrycodes: "us",
    dedupe: "1",
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ChoresList family calendar address lookup",
    },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) return [];

  const places = (await res.json()) as NominatimPlace[];
  return places.map((place) => ({
    id: `osm-${place.place_id}`,
    label: compactAddress(place, requestedHouseNumber),
    fullAddress: compactAddress(place, requestedHouseNumber),
    latitude: Number(place.lat),
    longitude: Number(place.lon),
    matchType: place.address?.house_number ? "address" as const : "street" as const,
  }));
}

export const GET = withErrors(async (req: NextRequest) => {
  requireSession(req);
  const limited = rateLimit(req, { key: "location-lookup", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 4) return NextResponse.json({ results: [] });

  const houseNumber = query.match(/^\s*(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\s+/)?.[1];
  const [census, nominatim] = await Promise.allSettled([
    houseNumber ? censusResults(query) : Promise.resolve([]),
    nominatimResults(query, houseNumber),
  ]);
  const combined = [
    ...(census.status === "fulfilled" ? census.value : []),
    ...(nominatim.status === "fulfilled" ? nominatim.value : []),
  ];
  const seen = new Set<string>();
  const results = combined.filter((result) => {
    const key = result.label.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key) || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);

  return NextResponse.json({ results });
});
