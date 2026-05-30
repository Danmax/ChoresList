import { NextRequest, NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

type GeocodeResult = {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country_code?: string;
};

type GeocodeResponse = {
  results?: GeocodeResult[];
};

type ForecastResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    precipitation?: number;
  };
};

function conditionFromCode(code: number) {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Storms";
  return "Weather";
}

export const GET = withErrors(async (req: NextRequest) => {
  const limited = rateLimit(req, { key: "weather", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ error: "Enter a city or ZIP code." }, { status: 400 });
  }

  const geoParams = new URLSearchParams({
    name: query,
    count: "1",
    language: "en",
    format: "json",
  });
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${geoParams.toString()}`, {
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!geoRes.ok) {
    return NextResponse.json({ error: "Could not find that location." }, { status: 502 });
  }

  const geoData = (await geoRes.json()) as GeocodeResponse;
  const place = geoData.results?.[0];
  if (!place) {
    return NextResponse.json({ error: "Could not find that location." }, { status: 404 });
  }

  const forecastParams = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,apparent_temperature,weather_code,precipitation",
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
    timezone: "auto",
  });
  const forecastRes = await fetch(`https://api.open-meteo.com/v1/forecast?${forecastParams.toString()}`, {
    next: { revalidate: 60 * 15 },
  });
  if (!forecastRes.ok) {
    return NextResponse.json({ error: "Could not load weather." }, { status: 502 });
  }

  const forecast = (await forecastRes.json()) as ForecastResponse;
  const current = forecast.current;
  if (!current || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code)) {
    return NextResponse.json({ error: "Weather is unavailable." }, { status: 502 });
  }

  return NextResponse.json({
    location: [place.name, place.admin1].filter(Boolean).join(", "),
    temperature: Math.round(current.temperature_2m ?? 0),
    feelsLike: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 0),
    condition: conditionFromCode(current.weather_code ?? -1),
    precipitation: current.precipitation ?? 0,
  });
});
