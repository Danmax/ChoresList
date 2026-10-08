import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canAccessMember } from "@/lib/child-access";
import { AuthError, requireSession, withErrors } from "@/lib/api";
import { deviceSession, getActiveDeviceSession, type DeviceSessionPayload } from "@/lib/device-session";
import { publishChessMatchUpdate } from "@/lib/chess-realtime";
import { sendGameInviteNotification, sendPushToFamilyMember } from "@/lib/web-push";

const GAME_KEYS = new Set(["tic-tac-toe", "rock-paper-scissors-shoot"]);
const RPS = new Set(["rock", "paper", "scissors"]);
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

async function actor(req: NextRequest) {
  if (req.cookies.has(deviceSession.name)) {
    const device = await getActiveDeviceSession(req);
    if (!device) throw new AuthError("Device pairing required");
    return { householdId: device.householdId, parentId: null as string | null, device };
  }
  const parent = requireSession(req);
  return { householdId: parent.householdId, parentId: parent.parentId, device: null as DeviceSessionPayload | null };
}

async function canPlayAs(current: Awaited<ReturnType<typeof actor>>, memberId: string) {
  if (current.device) return current.device.mode === "household" || current.device.memberId === memberId;
  return current.parentId ? canAccessMember(current.parentId, current.householdId, memberId) : false;
}

function startState(gameKey: string): Prisma.InputJsonValue {
  return gameKey === "tic-tac-toe"
    ? { board: Array.from({ length: 9 }, () => null), moves: 0 }
    : { round: 1, playerOneScore: 0, playerTwoScore: 0, ties: 0, playerOneChoice: null, playerTwoChoice: null, lastRound: null };
}

function visibleMatch<T extends { gameKey: string; state: Prisma.JsonValue; playerOneId: string }>(match: T, viewerId: string) {
  if (match.gameKey !== "rock-paper-scissors-shoot" || !match.state || typeof match.state !== "object" || Array.isArray(match.state)) return match;
  const state = { ...match.state as Record<string, unknown> };
  if (viewerId !== match.playerOneId && state.playerOneChoice && !state.lastRound) state.playerOneChoice = null;
  return { ...match, state };
}

function ticTacToeResult(board: Array<string | null>) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const winner = lines.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
  if (winner) return board[winner[0]] === "X" ? "player-one-won" : "player-two-won";
  return board.every(Boolean) ? "draw" : null;
}

export const GET = withErrors(async (req: NextRequest) => {
  const current = await actor(req); const memberId = new URL(req.url).searchParams.get("memberId") ?? "";
  if (!memberId || !(await canPlayAs(current, memberId))) return NextResponse.json({ error: "You do not have access to this player" }, { status: 403 });
  const matches = await prisma.familyMultiplayerMatch.findMany({
    where: { householdId: current.householdId, OR: [{ playerOneId: memberId }, { playerTwoId: memberId }] },
    include: { playerOne: { select: { id: true, name: true } }, playerTwo: { select: { id: true, name: true } }, moves: { select: { turn: true }, orderBy: { turn: "asc" } } },
    orderBy: { lastMoveAt: "desc" }, take: 30,
  });
  return NextResponse.json({ matches: matches.map((match) => visibleMatch(match, memberId)) });
});

export const POST = withErrors(async (req: NextRequest) => {
  const current = await actor(req); const body = await req.json(); const action = clean(body.action);
  if (action === "start") {
    const gameKey = clean(body.gameKey); const playerOneId = clean(body.playerOneId); const playerTwoId = clean(body.playerTwoId);
    if (!GAME_KEYS.has(gameKey) || !playerOneId || !playerTwoId || playerOneId === playerTwoId || !(await canPlayAs(current, playerOneId))) return NextResponse.json({ error: "Choose yourself, a family opponent, and a supported game" }, { status: 400 });
    const [playerOne, playerTwo] = await Promise.all([
      prisma.familyMember.findFirst({ where: { id: playerOneId, householdId: current.householdId }, select: { id: true, name: true } }),
      prisma.familyMember.findFirst({ where: { id: playerTwoId, householdId: current.householdId }, select: { id: true, name: true } }),
    ]);
    if (!playerOne || !playerTwo) return NextResponse.json({ error: "Choose a family opponent" }, { status: 400 });
    const existing = await prisma.familyMultiplayerMatch.findFirst({ where: { householdId: current.householdId, gameKey, status: { in: ["pending", "active"] }, OR: [{ playerOneId, playerTwoId }, { playerOneId: playerTwoId, playerTwoId: playerOneId }] }, orderBy: { lastMoveAt: "desc" } });
    if (existing) return NextResponse.json({ match: visibleMatch(existing, playerOneId) });
    const match = await prisma.familyMultiplayerMatch.create({ data: { householdId: current.householdId, gameKey, playerOneId, playerTwoId, status: "pending", state: startState(gameKey) } });
    publishChessMatchUpdate(match.id);
    void sendGameInviteNotification(current.householdId, playerTwoId, { title: "Family game invitation", body: `${playerOne.name} invited you to ${gameKey === "tic-tac-toe" ? "Tic-Tac-Toe" : "Rock Paper Scissors"}. Open Games to accept.`, url: `/kid/${playerTwoId}/games` }, `family-game-invite:${match.id}`).catch((error) => console.error("[family-game invite] notification", error));
    return NextResponse.json({ match }, { status: 201 });
  }

  if (action === "accept") {
    const matchId = clean(body.matchId); const memberId = clean(body.memberId);
    const match = await prisma.familyMultiplayerMatch.findFirst({ where: { id: matchId, householdId: current.householdId, status: "pending" } });
    if (!match || match.playerTwoId !== memberId || !(await canPlayAs(current, memberId))) return NextResponse.json({ error: "Game invitation not found" }, { status: 404 });
    const updated = await prisma.familyMultiplayerMatch.update({ where: { id: match.id }, data: { status: "active", lastMoveAt: new Date() } });
    publishChessMatchUpdate(match.id);
    return NextResponse.json({ match: updated });
  }

  if (action === "decline" || action === "cancel") {
    const matchId = clean(body.matchId); const memberId = clean(body.memberId);
    const match = await prisma.familyMultiplayerMatch.findFirst({ where: { id: matchId, householdId: current.householdId, status: "pending" }, include: { playerOne: { select: { name: true } }, playerTwo: { select: { name: true } } } });
    const expectedMemberId = action === "decline" ? match?.playerTwoId : match?.playerOneId;
    if (!match || expectedMemberId !== memberId || !(await canPlayAs(current, memberId))) return NextResponse.json({ error: "Game invitation not found" }, { status: 404 });
    const result = action === "decline" ? "declined" : "cancelled";
    const update = await prisma.familyMultiplayerMatch.updateMany({ where: { id: match.id, status: "pending" }, data: { status: "completed", result, lastMoveAt: new Date() } });
    if (!update.count) return NextResponse.json({ error: "This invitation is no longer available." }, { status: 409 });
    publishChessMatchUpdate(match.id);
    const recipientId = action === "decline" ? match.playerOneId : match.playerTwoId;
    const actorName = action === "decline" ? match.playerTwo.name : match.playerOne.name;
    void sendPushToFamilyMember(current.householdId, recipientId, { title: "Family game invitation updated", body: action === "decline" ? `${actorName} declined the invitation.` : `${actorName} cancelled the invitation.`, url: `/kid/${recipientId}/games` }).catch((error) => console.error("[family-game push] invitation", error));
    return NextResponse.json({ status: "completed", result });
  }

  if (action !== "move") return NextResponse.json({ error: "Unknown family game action" }, { status: 400 });
  const matchId = clean(body.matchId); const memberId = clean(body.memberId);
  const match = await prisma.familyMultiplayerMatch.findFirst({ where: { id: matchId, householdId: current.householdId, status: "active" }, include: { playerOne: { select: { name: true } }, playerTwo: { select: { name: true } }, moves: { select: { turn: true } } } });
  if (!match || !(await canPlayAs(current, memberId)) || ![match.playerOneId, match.playerTwoId].includes(memberId)) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  const expected = match.currentTurn === "player-one" ? match.playerOneId : match.playerTwoId;
  if (expected !== memberId) return NextResponse.json({ error: "It is not this player’s turn" }, { status: 403 });
  const state = match.state as unknown as Record<string, unknown>;
  let nextState: Prisma.InputJsonValue; let nextTurn: "player-one" | "player-two"; let result: string | null = null; let moveData: Prisma.InputJsonValue;

  if (match.gameKey === "tic-tac-toe") {
    const index = Number(body.index); const board = Array.isArray(state.board) ? [...state.board] : [];
    if (!Number.isInteger(index) || index < 0 || index > 8 || board.length !== 9 || board[index]) return NextResponse.json({ error: "That square is not available" }, { status: 400 });
    board[index] = match.currentTurn === "player-one" ? "X" : "O";
    result = ticTacToeResult(board as Array<string | null>); nextTurn = match.currentTurn === "player-one" ? "player-two" : "player-one";
    nextState = { board, moves: Number(state.moves ?? 0) + 1 }; moveData = { index, mark: board[index] as string };
  } else {
    const choice = clean(body.choice);
    if (!RPS.has(choice)) return NextResponse.json({ error: "Choose rock, paper, or scissors" }, { status: 400 });
    const first = match.currentTurn === "player-one";
    if (first) { nextState = { ...state, playerOneChoice: choice, playerTwoChoice: null, lastRound: null }; nextTurn = "player-two"; moveData = { choice }; }
    else {
      const playerOneChoice = clean(state.playerOneChoice); if (!RPS.has(playerOneChoice)) return NextResponse.json({ error: "The first choice is missing" }, { status: 409 });
      const playerOneWins = playerOneChoice !== choice && ((playerOneChoice === "rock" && choice === "scissors") || (playerOneChoice === "paper" && choice === "rock") || (playerOneChoice === "scissors" && choice === "paper"));
      const tie = playerOneChoice === choice;
      const playerOneScore = Number(state.playerOneScore ?? 0) + (playerOneWins ? 1 : 0); const playerTwoScore = Number(state.playerTwoScore ?? 0) + (!tie && !playerOneWins ? 1 : 0); const ties = Number(state.ties ?? 0) + (tie ? 1 : 0);
      result = playerOneScore >= 3 ? "player-one-won" : playerTwoScore >= 3 ? "player-two-won" : null; nextTurn = "player-one";
      nextState = { round: Number(state.round ?? 1) + 1, playerOneScore, playerTwoScore, ties, playerOneChoice: null, playerTwoChoice: null, lastRound: { playerOneChoice, playerTwoChoice: choice, result: tie ? "tie" : playerOneWins ? "player-one" : "player-two" } }; moveData = { choice };
    }
  }
  const update = await prisma.familyMultiplayerMatch.updateMany({ where: { id: match.id, status: "active", updatedAt: match.updatedAt }, data: { state: nextState, currentTurn: nextTurn, status: result ? "completed" : "active", result, lastMoveAt: new Date() } });
  if (!update.count) return NextResponse.json({ error: "The game changed. Refresh and try again." }, { status: 409 });
  await prisma.familyMultiplayerMove.create({ data: { matchId: match.id, memberId, turn: match.moves.length + 1, data: moveData } });
  publishChessMatchUpdate(match.id);
  const targetId = result ? null : nextTurn === "player-one" ? match.playerOneId : match.playerTwoId;
  if (targetId) void sendPushToFamilyMember(current.householdId, targetId, { title: "Your family game turn", body: `${memberId === match.playerOneId ? match.playerOne.name : match.playerTwo.name} made a move in ${match.gameKey === "tic-tac-toe" ? "Tic-Tac-Toe" : "Rock Paper Scissors"}.`, url: `/kid/${targetId}/games` }).catch((error) => console.error("[family-game push] turn", error));
  return NextResponse.json({ state: nextState, currentTurn: nextTurn, status: result ? "completed" : "active", result });
});
