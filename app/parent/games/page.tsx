"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChefHat, Copy, Crown, Gamepad2, Grid3X3, KeyRound, PawPrint, Puzzle, QrCode, RefreshCw, Save, Shapes, Swords, TreePine, Users } from "lucide-react";
import { toast } from "sonner";
import { LocalQrCode } from "@/components/local-qr-code";
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
  ageMin: number;
  ageMax: number;
};

type Member = { id: string; name: string; avatar: string };

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

type GameShareGroup = { id: string; name: string; events: Array<{ id: string; title: string; date: string }> };
type GameConnection = { id: string; householdName: string; createdAt: string };

function iconForGame(key: string) {
  if (key === "pocket-pals") return PawPrint;
  if (key === "rock-paper-scissors-shoot") return Swords;
  if (key === "bible-trivia") return BookOpen;
  if (key === "memory-match") return Puzzle;
  if (key === "shape-safari") return Shapes;
  if (key === "codebreaker-quest") return KeyRound;
  if (key === "tic-tac-toe") return Grid3X3;
  if (key === "burger-rush") return ChefHat;
  if (key === "jungle-vine-swing") return TreePine;
  if (key === "chess-quest") return Crown;
  return Gamepad2;
}

function gameLabel(key: string) {
  if (key === "pocket-pals") return "Pocket Pals";
  if (key === "rock-paper-scissors-shoot") return "Rock Paper Scissors Shoot";
  if (key === "bible-trivia") return "Bible Trivia";
  if (key === "memory-match") return "Memory Match";
  if (key === "shape-safari") return "Shape Safari";
  if (key === "codebreaker-quest") return "Codebreaker Quest";
  if (key === "tic-tac-toe") return "Tic-Tac-Toe";
  if (key === "burger-rush") return "Burger Rush";
  if (key === "jungle-vine-swing") return "Jungle Runner";
  if (key === "chess-quest") return "Chess Quest";
  return key;
}

export default function ParentGamesPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<Record<string, GameSetting>>({});
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [launchMemberId, setLaunchMemberId] = useState("");
  const [shareGroups, setShareGroups] = useState<GameShareGroup[]>([]);
  const [connections, setConnections] = useState<GameConnection[]>([]);
  const [shareGroupId, setShareGroupId] = useState("");
  const [shareEventId, setShareEventId] = useState("");
  const [gameInviteUrl, setGameInviteUrl] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);

  const enabledCount = useMemo(() => Object.values(settings).filter((setting) => setting.enabled).length, [settings]);
  const pointsRewardCount = useMemo(() => Object.values(settings).filter((setting) => setting.rewardType === "points" && setting.rewardPoints > 0).length, [settings]);

  const load = useCallback(async () => {
    setLoading(true);
    const [res, inviteRes] = await Promise.all([fetch("/api/games"), fetch("/api/game-invites")]);
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
    const nextMembers = Array.isArray(data?.members) ? data.members : [];
    setMembers(nextMembers);
    setLaunchMemberId((current) => current || nextMembers[0]?.id || "");
    const inviteData = await inviteRes.json().catch(() => null);
    if (inviteRes.ok) {
      setShareGroups(Array.isArray(inviteData?.groups) ? inviteData.groups : []);
      setConnections(Array.isArray(inviteData?.connections) ? inviteData.connections : []);
    }
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

  const shareEvents = shareGroups.find((group) => group.id === shareGroupId)?.events ?? [];

  async function createGameInvite() {
    setCreatingInvite(true);
    try {
      const res = await fetch("/api/game-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: shareGroupId || null, eventId: shareEventId || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.inviteUrl) return toast.error(data?.error ?? "Could not create a game invite");
      setGameInviteUrl(data.inviteUrl);
      toast.success("Game invite QR code is ready");
    } finally {
      setCreatingInvite(false);
    }
  }

  return (
    <>
      <ParentPageHeader
        title="Games"
        description="Manage simple kid games, chore gates, daily limits, and point rewards."
        actions={<div className="flex flex-wrap items-center gap-2">
          {members.length > 0 && <><select value={launchMemberId} onChange={(event) => setLaunchMemberId(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"><option value="">Choose a player</option>{members.map((member) => <option key={member.id} value={member.id}>{member.avatar} {member.name}</option>)}</select><button type="button" disabled={!launchMemberId} onClick={() => router.push(`/kid/${launchMemberId}/games?returnTo=parent-games`)} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"><Gamepad2 size={18} /> Launch games</button></>}
          <button type="button" onClick={load} className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"><RefreshCw size={18} /> Refresh</button>
        </div>}
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

      <section className="mb-6 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-indigo-700"><QrCode size={15}/> Game invite</div><h2 className="mt-3 text-xl font-black text-slate-900">Invite another household to play</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Share a QR code with a parent. They can create an account in one flow, and their household becomes a game connection. If you choose a group event, they’ll also join that group and event.</p><p className="mt-2 text-xs font-bold leading-5 text-slate-500">Child friendships and private multiplayer still require each parent’s approval.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Group (optional)</span><select value={shareGroupId} onChange={(event) => { setShareGroupId(event.target.value); setShareEventId(""); setGameInviteUrl(""); }} className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"><option value="">Just connect households</option>{shareGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Group game event (optional)</span><select disabled={!shareGroupId} value={shareEventId} onChange={(event) => { setShareEventId(event.target.value); setGameInviteUrl(""); }} className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"><option value="">No specific event</option>{shareEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label></div>
            <button type="button" disabled={creatingInvite} onClick={() => void createGameInvite()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-800 disabled:opacity-50"><QrCode size={17}/>{creatingInvite ? "Creating invite…" : "Create QR invite"}</button>
            {connections.length > 0 && <p className="mt-4 inline-flex items-center gap-2 text-sm font-black text-indigo-800"><Users size={17}/> {connections.length} connected game {connections.length === 1 ? "household" : "households"}: {connections.slice(0, 3).map((connection) => connection.householdName).join(", ")}{connections.length > 3 ? "…" : ""}</p>}
          </div>
          {gameInviteUrl && <div className="w-full max-w-60 rounded-2xl border border-indigo-100 bg-white p-3 text-center shadow-sm"><LocalQrCode value={gameInviteUrl} alt="QR code to join this household's game network" size={208} className="mx-auto aspect-square w-full rounded-xl bg-white object-contain"/><button type="button" onClick={() => void navigator.clipboard.writeText(gameInviteUrl).then(() => toast.success("Invite link copied"))} className="mt-3 inline-flex items-center gap-2 text-sm font-black text-indigo-700 hover:text-indigo-900"><Copy size={16}/> Copy link</button><p className="mt-2 break-all text-[10px] font-semibold leading-4 text-slate-400">Expires in 14 days</p></div>}
        </div>
      </section>

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
                        {game.key === "pocket-pals" && <p className="mt-2 text-xs font-bold text-rose-600">Rewards apply once a day after feeding, cleaning, playing, learning, and a full nap. Care stays available after collecting the badge.</p>}
                        <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-400">
                          Ages {setting.ageMin}-{setting.ageMax} · {game.playTime}
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

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
                      <span className="text-xs font-black uppercase tracking-wide text-slate-400">Minimum age</span>
                      <input type="number" min={0} max={120} value={setting.ageMin} onChange={(event) => updateSetting(game.key, { ageMin: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-slate-400" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-400">Maximum age</span>
                      <input type="number" min={0} max={120} value={setting.ageMax} onChange={(event) => updateSetting(game.key, { ageMax: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-slate-400" />
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
