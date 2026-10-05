"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Crown, Radio, RefreshCw, Swords } from "lucide-react";
import { toast } from "sonner";

type Player = { id: string; name: string };
type Match = {
  id: string;
  whiteMemberId: string;
  blackMemberId: string;
  currentTurn: "white" | "black";
  status: "active" | "completed";
  fen: string;
  result: string | null;
  moves: { san: string; ply: number }[];
  white: Player;
  black: Player;
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PIECES: Record<string, string> = { wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙", bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟" };

function applicationServerKey(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const decoded = atob(padded);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function ChessPushAlerts() {
  const [configured, setConfigured] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    void fetch("/api/device/push").then(async (response) => {
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.enabled || typeof data.publicKey !== "string") return;
      setConfigured(true); setPublicKey(data.publicKey);
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      setEnabled(Boolean(await registration.pushManager.getSubscription()));
    }).catch(() => undefined);
  }, []);

  async function enable() {
    if (!publicKey || Notification.permission === "denied") {
      toast.error("Allow notifications in this browser’s settings to receive chess move alerts.");
      return;
    }
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
      const response = await fetch("/api/device/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription) });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Could not enable alerts");
      setEnabled(true); toast.success("Chess move alerts are on for this device.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable alerts");
    } finally { setBusy(false); }
  }

  if (!configured) return null;
  return <button type="button" disabled={enabled || busy} onClick={() => void enable()} className="mt-4 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-black text-violet-800 disabled:cursor-default disabled:opacity-75">{enabled ? "✓ Move alerts are on" : busy ? "Turning on alerts…" : "Turn on move alerts"}</button>;
}

export function FamilyChess({ player, opponents }: { player: Player; opponents: Player[] }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [openedMatchId, setOpenedMatchId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/family-chess?memberId=${encodeURIComponent(player.id)}`);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      toast.error(data?.error ?? "Could not load family chess");
      return;
    }
    setMatches(Array.isArray(data?.matches) ? data.matches : []);
  }, [player.id]);

  useEffect(() => { void refresh().finally(() => setLoading(false)); }, [refresh]);

  const match = matches.find((item) => item.id === openedMatchId) ?? null;
  const chess = useMemo(() => match ? new Chess(match.fen) : null, [match]);
  const myColor = match?.whiteMemberId === player.id ? "white" : match?.blackMemberId === player.id ? "black" : null;
  const myTurn = Boolean(match && myColor === match.currentTurn && match.status === "active");
  const targets = useMemo(() => selected && chess ? chess.moves({ square: selected as Square, verbose: true }).map((move) => move.to) : [], [chess, selected]);

  useEffect(() => {
    if (!openedMatchId) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/chess`);
    socketRef.current = socket;
    socket.addEventListener("open", () => { setLive(true); socket.send(JSON.stringify({ type: "subscribe", matchId: openedMatchId })); });
    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "match-updated" && message.matchId === openedMatchId) void refresh();
      } catch { /* Ignore malformed socket messages. */ }
    });
    socket.addEventListener("close", () => setLive(false));
    socket.addEventListener("error", () => setLive(false));
    const fallbackRefresh = window.setInterval(() => void refresh(), 5000);
    return () => { window.clearInterval(fallbackRefresh); socket.close(); socketRef.current = null; setLive(false); };
  }, [openedMatchId, refresh]);

  async function request(body: Record<string, string>) {
    setBusy(true);
    const response = await fetch("/api/family-chess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      toast.error(data?.error ?? "Could not update the chess game");
      await refresh();
      return null;
    }
    await refresh();
    return data;
  }

  async function startMatch() {
    if (!opponentId) return;
    const data = await request({ action: "start", whiteMemberId: player.id, blackMemberId: opponentId });
    if (data?.match?.id) {
      setOpenedMatchId(data.match.id);
      setSelected(null);
    }
  }

  async function chooseSquare(square: string) {
    if (!match || !chess || !myTurn || busy) return;
    const occupied = chess.get(square as Square);
    const pieceIsMine = Boolean(occupied && ((chess.turn() === "w" && occupied.color === "w") || (chess.turn() === "b" && occupied.color === "b")));
    if (!selected) {
      if (pieceIsMine) setSelected(square);
      return;
    }
    if (square === selected) { setSelected(null); return; }
    if (!targets.includes(square as Square)) { setSelected(pieceIsMine ? square : null); return; }
    const data = await request({ action: "move", matchId: match.id, memberId: player.id, from: selected, to: square, promotion: "q" });
    if (data) setSelected(null);
  }

  if (match && chess) {
    const board = chess.board();
    const opponent = match.whiteMemberId === player.id ? match.black : match.white;
    const lastMove = match.moves.at(-1);
    return <section className="mt-5 overflow-hidden rounded-3xl bg-white p-5 shadow-sm"><button type="button" onClick={() => { setOpenedMatchId(null); setSelected(null); }} className="text-sm font-black text-violet-700">← Family chess games</button><div className="mt-3 flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-xl font-black text-slate-800"><Crown size={21}/> {match.white.name} vs {match.black.name}</h3><p className="mt-1 text-sm font-bold text-slate-500">{match.status === "completed" ? `Game complete · ${match.result ?? "draw"}` : myTurn ? "Your turn — make your move!" : `Waiting for ${opponent.name}'s move`}</p></div><button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700"><RefreshCw size={15}/> Refresh</button></div><div className="mt-5 grid max-w-xl grid-cols-8 overflow-hidden rounded-2xl border-4 border-violet-900">{board.flatMap((rank, row) => rank.map((piece, col) => { const square = `${FILES[col]}${8 - row}`; const light = (row + col) % 2 === 0; const target = targets.includes(square as Square); return <button key={square} type="button" disabled={!myTurn || busy} onClick={() => void chooseSquare(square)} aria-label={square} className={`relative aspect-square text-[clamp(1.4rem,7vw,3.3rem)] ${light ? "bg-[#f8e7bf]" : "bg-[#ab754b]"} ${selected === square ? "ring-4 ring-inset ring-yellow-300" : ""} ${target ? "after:absolute after:inset-[36%] after:rounded-full after:bg-violet-700/60" : ""}`}><span className={`relative z-10 ${piece?.color === "w" ? "text-white [text-shadow:0_1px_0_#334155,1px_0_0_#334155,-1px_0_0_#334155]" : "text-slate-950 [text-shadow:0_1px_0_#f8e7bf,1px_0_0_#f8e7bf,-1px_0_0_#f8e7bf]"}`}>{piece ? PIECES[`${piece.color}${piece.type}`] : ""}</span></button>; }))}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-bold"><span className={live ? "text-emerald-600" : "text-amber-600"}><Radio className="mr-1 inline size-3"/>{live ? "Live connection" : "Checking for moves every 5 seconds"}</span><span className="text-slate-500">{lastMove ? `Last move: ${lastMove.san}` : "White to move"}</span></div></section>;
  }

  return <section className="mt-5 rounded-3xl border border-violet-200 bg-violet-50 p-5"><div className="flex items-start gap-3"><span className="rounded-2xl bg-violet-700 p-3 text-white"><Swords size={22}/></span><div><h3 className="text-xl font-black text-violet-950">Real-time family chess</h3><p className="mt-1 text-sm font-semibold leading-5 text-violet-800">Start a game here, then your family member can open Chess Quest on their own paired device. Every move appears immediately.</p><ChessPushAlerts /></div></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><select aria-label="Choose a family member" value={opponentId} onChange={(event) => setOpponentId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2 font-bold text-violet-950"><option value="">Choose a player for Black</option>{opponents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" disabled={!opponentId || busy} onClick={() => void startMatch()} className="rounded-xl bg-violet-700 px-4 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">Start live game</button></div><div className="mt-4 border-t border-violet-200 pt-4"><div className="flex items-center justify-between gap-3"><h4 className="font-black text-violet-950">Your games</h4><button type="button" onClick={() => void refresh()} className="text-sm font-black text-violet-700">Refresh</button></div>{loading ? <p className="mt-2 text-sm font-semibold text-violet-700">Loading games…</p> : matches.length ? <div className="mt-2 space-y-2">{matches.map((item) => <button key={item.id} type="button" onClick={() => { setOpenedMatchId(item.id); setSelected(null); }} className="flex w-full items-center justify-between rounded-2xl bg-white p-3 text-left shadow-sm transition hover:bg-violet-100"><span><span className="block font-black text-slate-800">{item.white.name} vs {item.black.name}</span><span className="text-xs font-bold text-slate-500">{item.status === "active" ? `${item.currentTurn} to move` : item.result ?? "Completed"}</span></span><span className="text-sm font-black text-violet-700">Open →</span></button>)}</div> : <p className="mt-2 text-sm font-semibold text-violet-700">No live family games yet.</p>}</div></section>;
}
