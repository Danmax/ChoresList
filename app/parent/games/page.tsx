"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Gamepad2, Puzzle, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { ParentPageHeader } from "@/components/parent-management-shell";

type Game = {
  key: string;
  title: string;
  description: string;
  ageMin: number;
  ageMax: number;
  playTime: string;
  color: string;
  bg: string;
};

type GameSetting = {
  id: string;
  gameKey: string;
  enabled: boolean;
  rewardType: "none" | "points" | "tickets";
  rewardPoints: number;
  rewardTickets: number;
  requiresChoresComplete: boolean;
  dailyPlayLimit: number;
};

type GameSession = {
  id: string;
  gameKey: string;
  score: number;
  durationSeconds: number;
  rewardType: string;
  rewardPoints: number;
  rewardTickets: number;
  playedAt: string;
  member: { id: string; name: string; avatar: string; color: string };
};

function iconForGame(key: string) {
  if (key === "bible-trivia") return BookOpen;
  if (key === "memory-match") return Puzzle;
  return Gamepad2;
}

function gameLabel(key: string) {
  if (key === "bible-trivia") return "Bible Trivia";
  if (key === "memory-match") return "Memory Match";
  return key;
}

export default function ParentGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<Record<string, GameSetting>>({});
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");

  const enabledCount = useMemo(() => Object.values(settings).filter((setting) => setting.enabled).length, [settings]);
  const pointsRewardCount = useMemo(() => Object.values(settings).filter((setting) => setting.rewardType === "points" && setting.rewardPoints > 0).length, [settings]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/games");
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not load games");
      setLoading(false);
      return;
    }
    setGames(Array.isArray(data?.games) ? data.games : []);
    const nextSettings: Record<string, GameSetting> = {};
    for (const setting of Array.isArray(data?.settings) ? data.settings : []) {
      nextSettings[setting.gameKey] = setting;
    }
    setSettings(nextSettings);
    setSessions(Array.isArray(data?.recentSessions) ? data.recentSessions : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateSetting(gameKey: string, patch: Partial<GameSetting>) {
    setSettings((previous) => ({
      ...previous,
      [gameKey]: { ...previous[gameKey], ...patch },
    }));
  }

  async function save(gameKey: string) {
    const setting = settings[gameKey];
    if (!setting) return;
    setSavingKey(gameKey);
    try {
      const res = await fetch("/api/games", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setting),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save game settings");
        return;
      }
      setSettings((previous) => ({ ...previous, [gameKey]: data.setting }));
      toast.success("Game settings saved");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <>
      <ParentPageHeader
        title="Games"
        description="Manage simple kid games, chore gates, daily limits, and point rewards."
        actions={
          <button
            type="button"
            onClick={load}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw size={18} /> Refresh
          </button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Enabled games</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{enabledCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Point rewards</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{pointsRewardCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Recent plays</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{sessions.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center font-bold text-slate-400">Loading games...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {games.map((game) => {
              const setting = settings[game.key];
              const Icon = iconForGame(game.key);
              if (!setting) return null;

              return (
                <section key={game.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: game.bg }}>
                        <Icon size={22} style={{ color: game.color }} />
                      </div>
                      <div>
                        <h2 className="font-black text-slate-950">{game.title}</h2>
                        <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{game.description}</p>
                        <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-400">
                          Ages {game.ageMin}-{game.ageMax} · {game.playTime}
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
                      <input
                        type="checkbox"
                        checked={setting.enabled}
                        onChange={(event) => updateSetting(game.key, { enabled: event.target.checked })}
                        className="size-4 accent-slate-900"
                      />
                      Enabled
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-400">Reward</span>
                      <select
                        value={setting.rewardType}
                        onChange={(event) => updateSetting(game.key, { rewardType: event.target.value as GameSetting["rewardType"] })}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-slate-400"
                      >
                        <option value="none">No reward</option>
                        <option value="points">Points</option>
                        <option value="tickets">Tickets</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-400">Points</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={setting.rewardPoints}
                        onChange={(event) => updateSetting(game.key, { rewardPoints: Number(event.target.value) })}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-slate-400"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-400">Daily plays</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={setting.dailyPlayLimit}
                        onChange={(event) => updateSetting(game.key, { dailyPlayLimit: Number(event.target.value) })}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-slate-400"
                      />
                    </label>
                    <label className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">
                      <input
                        type="checkbox"
                        checked={setting.requiresChoresComplete}
                        onChange={(event) => updateSetting(game.key, { requiresChoresComplete: event.target.checked })}
                        className="mb-1 size-4 accent-slate-900"
                      />
                      Chores first
                    </label>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => save(game.key)}
                      disabled={savingKey === game.key}
                      className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                    >
                      <Save size={16} /> {savingKey === game.key ? "Saving..." : "Save"}
                    </button>
                  </div>
                </section>
              );
            })}
          </div>

          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-black text-slate-950">Recent Activity</h2>
            <div className="mt-4 space-y-3">
              {sessions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm font-bold text-slate-400">No game sessions yet.</p>
              ) : sessions.map((session) => (
                <div key={session.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-slate-800">{session.member.avatar} {session.member.name}</p>
                    <span className="text-xs font-black text-slate-400">{session.score}</span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {gameLabel(session.gameKey)} · {new Date(session.playedAt).toLocaleDateString()}
                  </p>
                  {(session.rewardPoints > 0 || session.rewardTickets > 0) && (
                    <p className="mt-1 text-xs font-black text-emerald-600">
                      Earned {session.rewardPoints > 0 ? `${session.rewardPoints} pts` : `${session.rewardTickets} tickets`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
