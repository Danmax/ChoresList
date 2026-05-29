"use client";

import { FormEvent, useEffect, useState } from "react";
import { CloudSun, Loader2, MapPin, Pencil } from "lucide-react";

const STORAGE_KEY = "choreslist-weather-location";

type WeatherData = {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  precipitation: number;
};

export function TinyWeather({ className = "" }: { className?: string }) {
  const [location, setLocation] = useState("");
  const [draft, setDraft] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function loadWeather(nextLocation: string) {
    const query = nextLocation.trim();
    if (query.length < 2) {
      setEditing(true);
      return;
    }

    setStatus("loading");
    try {
      const params = new URLSearchParams({ q: query });
      const res = await fetch(`/api/weather?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Weather unavailable");
      setWeather(data);
      setLocation(query);
      setDraft(query);
      localStorage.setItem(STORAGE_KEY, query);
      setEditing(false);
      setStatus("idle");
    } catch {
      setStatus("error");
      setEditing(true);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? "";
    setLocation(saved);
    setDraft(saved);
    if (saved) {
      loadWeather(saved);
    } else {
      setEditing(true);
    }
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadWeather(draft);
  }

  if (editing) {
    return (
      <form
        onSubmit={submit}
        className={`flex h-10 min-w-0 items-center gap-2 rounded-2xl bg-white px-3 shadow-sm sm:min-w-[13rem] ${className}`}
      >
        <MapPin size={15} className="shrink-0 text-slate-400" />
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Weather city"
          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={status === "loading" || draft.trim().length < 2}
          className="rounded-xl bg-violet-500 px-2 py-1 text-xs font-black text-white disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Set"}
        </button>
      </form>
    );
  }

  return (
    <div className={`flex h-10 min-w-0 items-center gap-2 rounded-2xl bg-white px-3 shadow-sm ${className}`}>
      <CloudSun size={17} className="shrink-0 text-amber-500" />
      {status === "loading" && !weather ? (
        <Loader2 size={16} className="animate-spin text-slate-400" />
      ) : weather ? (
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-black text-slate-800">
            {weather.temperature}° <span className="font-bold text-slate-500">{weather.condition}</span>
          </p>
          <p className="truncate text-[11px] font-bold text-slate-400">{weather.location}</p>
        </div>
      ) : (
        <p className="text-sm font-bold text-slate-500">Weather</p>
      )}
      <button
        type="button"
        onClick={() => {
          setDraft(location);
          setEditing(true);
        }}
        className="ml-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        title="Change weather location"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}
