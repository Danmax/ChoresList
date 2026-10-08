"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Crown, RefreshCw, Swords } from "lucide-react";
import { toast } from "sonner";

export type LobbyChild = { id: string; name: string; avatar: string; color: string };
export type LobbyFriendship = { id: string; requesterParentId: string; recipientParentId: string; childAId: string; childBId: string; status: string };
export type OnlineChessMatch = { id: string; friendshipId: string; whiteMemberId: string; blackMemberId: string; currentTurn: string; status: string; fen: string; result?: string | null; lastMoveAt: string; moves: { san: string }[] };

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const GLYPHS: Record<string, string> = { wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙", bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟" };

function playerName(id: string, mine: LobbyChild[], others: Record<string, LobbyChild[]>) {
  return mine.find((child) => child.id === id)?.name ?? Object.values(others).flat().find((child) => child.id === id)?.name ?? "Player";
}

export function OnlineChessLobby({ groupId, friendships, myChildren, childrenByParent, matches, onRefresh }: {
  groupId: string; friendships: LobbyFriendship[]; myChildren: LobbyChild[]; childrenByParent: Record<string, LobbyChild[]>; matches: OnlineChessMatch[]; onRefresh: () => Promise<void>;
}) {
  const [openedMatchId, setOpenedMatchId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const activeFriends = friendships.filter((friendship) => friendship.status === "active");
  const openedMatch = matches.find((match) => match.id === openedMatchId) ?? null;

  useEffect(() => {
    if (!openedMatchId) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/chess`);
    socketRef.current = socket;
    socket.addEventListener("open", () => { setLive(true); socket.send(JSON.stringify({ type: "subscribe", matchId: openedMatchId })); });
    socket.addEventListener("message", (event) => { try { const message = JSON.parse(event.data); if (message.type === "match-updated" && message.matchId === openedMatchId) void onRefresh(); } catch { /* Ignore malformed socket events. */ } });
    socket.addEventListener("close", () => setLive(false));
    socket.addEventListener("error", () => setLive(false));
    return () => { socket.close(); socketRef.current = null; setLive(false); };
  }, [openedMatchId, onRefresh]);

  async function request(body: Record<string, string>) {
    setBusy(true);
    const response = await fetch("/api/community/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId, ...body }) });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) { toast.error(data?.error ?? "Could not update the chess room"); return false; }
    await onRefresh();
    return true;
  }

  async function createRoom(friendship: LobbyFriendship) {
    const mine = myChildren.find((child) => child.id === friendship.childAId || child.id === friendship.childBId);
    const opponentId = friendship.childAId === mine?.id ? friendship.childBId : friendship.childAId;
    if (!mine || !opponentId) return toast.error("This approved friendship no longer has both child profiles");
    if (await request({ action: "start-chess", friendshipId: friendship.id, whiteMemberId: mine.id, blackMemberId: opponentId })) toast.success("Private chess room created — the other family was notified.");
  }

  const chess = useMemo(() => openedMatch ? new Chess(openedMatch.fen) : null, [openedMatch]);
  const myTurn = Boolean(openedMatch && chess && myChildren.some((child) => child.id === (openedMatch.currentTurn === "white" ? openedMatch.whiteMemberId : openedMatch.blackMemberId)));
  const targets = useMemo(() => selected && chess ? chess.moves({ square: selected as Square, verbose: true }).map((move) => move.to) : [], [chess, selected]);

  async function chooseSquare(square: string) {
    if (!openedMatch || !chess || !myTurn || busy) return;
    const occupied = chess.get(square as Square);
    if (!selected) { if (occupied && ((chess.turn() === "w" && occupied.color === "w") || (chess.turn() === "b" && occupied.color === "b"))) setSelected(square); return; }
    if (square === selected) { setSelected(null); return; }
    if (!targets.includes(square as Square)) { setSelected(occupied ? square : null); return; }
    const memberId = openedMatch.currentTurn === "white" ? openedMatch.whiteMemberId : openedMatch.blackMemberId;
    if (await request({ action: "move-chess", matchId: openedMatch.id, memberId, from: selected, to: square, promotion: "q" })) setSelected(null);
  }

  if (openedMatch && chess) {
    const board = chess.board();
    const whiteName = playerName(openedMatch.whiteMemberId, myChildren, childrenByParent), blackName = playerName(openedMatch.blackMemberId, myChildren, childrenByParent);
    return <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm"><button type="button" onClick={() => { setOpenedMatchId(null); setSelected(null); }} className="text-sm font-black text-violet-700">← Back to chess lobby</button><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="flex items-center gap-2 text-xl font-black text-slate-800"><Crown size={21}/> {whiteName} vs {blackName}</h2><p className="mt-1 text-sm font-bold text-slate-500">{openedMatch.status === "completed" ? `Game complete · ${openedMatch.result ?? "draw"}` : myTurn ? "Your child’s turn" : "Waiting for the other family’s move"}</p></div><button type="button" onClick={() => void onRefresh()} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700"><RefreshCw size={15}/> Refresh</button></div><div className="mt-5 grid aspect-square w-full max-w-xl grid-cols-8 grid-rows-8 overflow-hidden rounded-2xl border-4 border-violet-900">{board.flatMap((rank, row) => rank.map((piece, col) => { const square = `${FILES[col]}${8 - row}`; const light = (row + col) % 2 === 0; const target = targets.includes(square as Square); return <button key={square} type="button" disabled={!myTurn || openedMatch.status !== "active"} onClick={() => void chooseSquare(square)} className={`relative size-full min-h-0 min-w-0 text-[clamp(1.4rem,7vw,3.3rem)] disabled:opacity-100 ${light ? "bg-[#f8e7bf]" : "bg-[#ab754b]"} ${selected === square ? "ring-4 ring-inset ring-yellow-300" : ""} ${target ? "after:absolute after:inset-[36%] after:rounded-full after:bg-violet-700/60" : ""}`} aria-label={square}><span className={`relative z-10 ${piece?.color === "w" ? "text-white [text-shadow:0_1px_0_#334155,1px_0_0_#334155,-1px_0_0_#334155]" : "text-slate-950 [text-shadow:0_1px_0_#f8e7bf,1px_0_0_#f8e7bf,-1px_0_0_#f8e7bf]"}`}>{piece ? GLYPHS[`${piece.color}${piece.type}`] : ""}</span></button>; }))}</div><p className="mt-3 text-xs font-bold text-slate-400">Private room · no chat · <span className={live ? "text-emerald-600" : "text-amber-600"}>{live ? "live connection" : "connecting…"}</span></p></section>;
  }

  return <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-black text-slate-800"><Swords size={21}/> Online chess lobby</h2><p className="mt-1 text-sm font-semibold text-slate-500">Create a private room with an approved child friend. The other family gets a notification.</p></div><button type="button" onClick={() => void onRefresh()} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700"><RefreshCw size={15}/> Refresh</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{activeFriends.map((friendship) => { const opponentId = myChildren.some((child) => child.id === friendship.childAId) ? friendship.childBId : friendship.childAId; return <div key={friendship.id} className="rounded-2xl bg-violet-50 p-4"><p className="font-black text-violet-950">Play {playerName(opponentId, myChildren, childrenByParent)}</p><p className="mt-1 text-xs font-bold text-violet-700">Parent-approved private room</p><button type="button" disabled={busy} onClick={() => void createRoom(friendship)} className="mt-3 rounded-xl bg-violet-700 px-3 py-2 text-sm font-black text-white disabled:opacity-50">Create chess room</button></div>; })}{activeFriends.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Approve a child friendship above to unlock online chess.</p>}</div><div className="mt-5"><h3 className="font-black text-slate-800">Your rooms</h3><div className="mt-2 space-y-2">{matches.map((match) => <button key={match.id} type="button" onClick={() => setOpenedMatchId(match.id)} className="flex w-full items-center justify-between rounded-2xl bg-slate-50 p-3 text-left hover:bg-violet-50"><span><span className="block font-black text-slate-800">{playerName(match.whiteMemberId, myChildren, childrenByParent)} vs {playerName(match.blackMemberId, myChildren, childrenByParent)}</span><span className="text-xs font-bold text-slate-500">{match.status === "active" ? `${match.currentTurn} to move` : match.result ?? "completed"}</span></span><span className="text-sm font-black text-violet-700">Open →</span></button>)}{matches.length === 0 && <p className="text-sm font-semibold text-slate-400">No chess rooms yet.</p>}</div></div></section>;
}
