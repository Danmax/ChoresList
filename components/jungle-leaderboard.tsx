"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, RefreshCw, Trophy, X } from "lucide-react";
import type { RunnerDifficulty } from "@/lib/jungle-runner";

type Entry = {
  memberId: string;
  name: string;
  avatar: string;
  color: string;
  score: number;
  durationSeconds: number;
  levelsCompleted: number;
  gems: number;
  rank: number;
};

type Response = { entries: Entry[]; player: Entry | null };

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

export function JungleLeaderboard({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const [difficulty, setDifficulty] = useState<RunnerDifficulty>("medium");
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const response = await fetch(`/api/games/leaderboard?difficulty=${difficulty}&memberId=${encodeURIComponent(memberId)}`);
    const next = await response.json().catch(() => null);
    if (!response.ok) setError(next?.error ?? "Could not load the leaderboard.");
    else setData(next);
    setLoading(false);
  }, [difficulty, memberId]);
  useEffect(() => { void load(); }, [load]);

  return <section className="fixed inset-0 z-[60] overflow-y-auto bg-emerald-950/95 p-4 text-white backdrop-blur-sm" aria-label="Jungle Top 100 leaderboard">
    <div className="mx-auto max-w-2xl rounded-3xl border-2 border-yellow-300/60 bg-[#073d33] p-4 shadow-2xl sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-yellow-200"><Trophy size={16} /> Household records</p><h2 className="mt-1 text-2xl font-black">Jungle Top 100</h2><p className="mt-1 text-sm font-semibold text-emerald-100">Best Adventure Mode run for each player.</p></div>
        <button type="button" onClick={onClose} className="rounded-xl bg-white/10 p-2" aria-label="Close leaderboard"><X size={20} /></button>
      </header>
      <div className="mt-5 flex flex-wrap gap-2">{(["easy", "medium", "hard"] as RunnerDifficulty[]).map((value) => <button key={value} type="button" onClick={() => setDifficulty(value)} className={`rounded-xl px-4 py-2 text-sm font-black capitalize ${difficulty === value ? "bg-yellow-300 text-emerald-950" : "bg-white/10 text-white"}`}>{value}</button>)}<button type="button" onClick={() => void load()} className="ml-auto rounded-xl bg-white/10 p-2" aria-label="Refresh leaderboard"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button></div>
      {error ? <p role="alert" className="mt-5 rounded-2xl bg-red-500/20 p-4 font-bold text-red-100">{error}</p> : loading && !data ? <p className="mt-5 p-6 text-center font-bold text-emerald-100">Finding the champions…</p> : data?.entries.length ? <ol className="mt-5 space-y-2">{data.entries.map((entry) => <li key={entry.memberId} className={`flex items-center gap-3 rounded-2xl p-3 ${entry.memberId === memberId ? "bg-yellow-300 text-emerald-950 ring-2 ring-white" : "bg-white/10"}`}><strong className="w-8 text-center text-lg">{entry.rank <= 3 ? <Crown size={21} className="mx-auto text-yellow-300" fill="currentColor" /> : `#${entry.rank}`}</strong><span className="flex size-10 items-center justify-center rounded-full text-lg" style={{ backgroundColor: entry.color }}>{entry.avatar}</span><span className="min-w-0 flex-1"><strong className="block truncate">{entry.name}{entry.memberId === memberId ? " (You)" : ""}</strong><small className="font-bold opacity-80">{entry.levelsCompleted}/8 stages · {entry.gems}/8 gems · {duration(entry.durationSeconds)}</small></span><strong className="text-right text-lg">{entry.score.toLocaleString()}<small className="block text-[10px] uppercase tracking-wide">pts</small></strong></li>)}</ol> : <div className="mt-5 rounded-2xl bg-white/10 p-6 text-center"><p className="font-black">No Adventure Mode scores yet.</p><p className="mt-1 text-sm font-semibold text-emerald-100">Finish a {difficulty} Adventure run to set the first record.</p></div>}
      {data?.player && data.player.rank > 100 && <p className="mt-4 rounded-2xl bg-cyan-300 px-4 py-3 text-center font-black text-emerald-950">Your best: #{data.player.rank} · {data.player.score.toLocaleString()} pts</p>}
    </div>
  </section>;
}
