import { Chess } from "chess.js";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessMember } from "@/lib/child-access";
import { AuthError, requireSession, withErrors } from "@/lib/api";
import { deviceSession, getActiveDeviceSession, type DeviceSessionPayload } from "@/lib/device-session";
import { publishChessMatchUpdate } from "@/lib/chess-realtime";
import { sendChessPush, sendGameInviteNotification } from "@/lib/web-push";

const id = (value: unknown) => typeof value === "string" ? value.trim() : "";

async function chessActor(req: NextRequest) {
  if (req.cookies.has(deviceSession.name)) {
    const device = await getActiveDeviceSession(req);
    if (!device) throw new AuthError("Device pairing required");
    return { householdId: device.householdId, parentId: null as string | null, device };
  }
  const parent = requireSession(req);
  return { householdId: parent.householdId, parentId: parent.parentId, device: null as DeviceSessionPayload | null };
}

async function canPlayAs(actor: Awaited<ReturnType<typeof chessActor>>, memberId: string) {
  if (actor.device) return actor.device.mode === "household" || actor.device.memberId === memberId;
  return actor.parentId ? canAccessMember(actor.parentId, actor.householdId, memberId) : false;
}

export const GET = withErrors(async (req: NextRequest) => {
  const actor = await chessActor(req);
  const { householdId } = actor;
  const memberId = new URL(req.url).searchParams.get("memberId") ?? "";
  if (!memberId || !(await canPlayAs(actor, memberId))) return NextResponse.json({ error: "You do not have access to this player" }, { status: 403 });
  const matches = await prisma.familyChessMatch.findMany({ where: { householdId, OR: [{ whiteMemberId: memberId }, { blackMemberId: memberId }] }, include: { white: { select: { id: true, name: true } }, black: { select: { id: true, name: true } }, moves: { orderBy: { ply: "asc" }, select: { san: true, ply: true, from: true, to: true } } }, orderBy: { lastMoveAt: "desc" }, take: 20 });
  return NextResponse.json({ matches });
});

export const POST = withErrors(async (req: NextRequest) => {
  const actor = await chessActor(req); const { householdId } = actor; const body = await req.json(); const action = id(body.action);
  if (action === "start") {
    const whiteMemberId = id(body.whiteMemberId); const blackMemberId = id(body.blackMemberId);
    const [white, black] = await Promise.all([
      prisma.familyMember.findFirst({ where: { id: whiteMemberId, householdId }, select: { id: true, name: true } }),
      prisma.familyMember.findFirst({ where: { id: blackMemberId, householdId }, select: { id: true, name: true } }),
    ]);
    if (!whiteMemberId || !blackMemberId || whiteMemberId === blackMemberId || !white || !black || !(await canPlayAs(actor, whiteMemberId))) return NextResponse.json({ error: "Choose yourself and another family member" }, { status: 400 });
    const existing = await prisma.familyChessMatch.findFirst({ where: { householdId, status: { in: ["pending", "active"] }, OR: [{ whiteMemberId, blackMemberId }, { whiteMemberId: blackMemberId, blackMemberId: whiteMemberId }] }, orderBy: { lastMoveAt: "desc" } });
    if (existing) return NextResponse.json({ match: existing });
    const match = await prisma.familyChessMatch.create({ data: { householdId, whiteMemberId, blackMemberId, status: "pending", fen: new Chess().fen() } });
    publishChessMatchUpdate(match.id);
    void sendGameInviteNotification(householdId, blackMemberId, { title: "Family chess invitation", body: `${white.name} invited you to a live family chess game. Open Chess Quest to accept.`, url: `/kid/${blackMemberId}/games` }, `chess-invite:${match.id}`).catch((error) => console.error("[chess invite] notification", error));
    return NextResponse.json({ match }, { status: 201 });
  }
  if (action === "accept") {
    const matchId = id(body.matchId); const memberId = id(body.memberId);
    const match = await prisma.familyChessMatch.findFirst({ where: { id: matchId, householdId, status: "pending" } });
    if (!match || match.blackMemberId !== memberId || !(await canPlayAs(actor, memberId))) return NextResponse.json({ error: "Chess invitation not found" }, { status: 404 });
    const updated = await prisma.familyChessMatch.update({ where: { id: match.id }, data: { status: "active", lastMoveAt: new Date() } });
    publishChessMatchUpdate(match.id);
    return NextResponse.json({ match: updated });
  }
  if (action === "decline" || action === "cancel") {
    const matchId = id(body.matchId); const memberId = id(body.memberId);
    const match = await prisma.familyChessMatch.findFirst({ where: { id: matchId, householdId, status: "pending" }, include: { white: { select: { name: true } }, black: { select: { name: true } } } });
    const expectedMemberId = action === "decline" ? match?.blackMemberId : match?.whiteMemberId;
    if (!match || expectedMemberId !== memberId || !(await canPlayAs(actor, memberId))) return NextResponse.json({ error: "Chess invitation not found" }, { status: 404 });
    const result = action === "decline" ? "declined" : "cancelled";
    const update = await prisma.familyChessMatch.updateMany({ where: { id: match.id, status: "pending" }, data: { status: "completed", result, lastMoveAt: new Date() } });
    if (!update.count) return NextResponse.json({ error: "This invitation is no longer available." }, { status: 409 });
    publishChessMatchUpdate(match.id);
    const recipientId = action === "decline" ? match.whiteMemberId : match.blackMemberId;
    const actorName = action === "decline" ? match.black.name : match.white.name;
    void sendChessPush(householdId, recipientId, { title: "Chess invitation updated", body: action === "decline" ? `${actorName} declined the chess invitation.` : `${actorName} cancelled the chess invitation.`, url: `/kid/${recipientId}/games` }).catch((error) => console.error("[chess push] invitation", error));
    return NextResponse.json({ status: "completed", result });
  }
  if (action === "resign") {
    const matchId = id(body.matchId); const memberId = id(body.memberId);
    const match = await prisma.familyChessMatch.findFirst({ where: { id: matchId, householdId, status: "active" }, include: { white: { select: { name: true } }, black: { select: { name: true } } } });
    if (!match || !(await canPlayAs(actor, memberId)) || ![match.whiteMemberId, match.blackMemberId].includes(memberId)) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    const result = memberId === match.whiteMemberId ? "black-won" : "white-won";
    const update = await prisma.familyChessMatch.updateMany({ where: { id: match.id, status: "active" }, data: { status: "completed", result, lastMoveAt: new Date() } });
    if (!update.count) return NextResponse.json({ error: "The game has already ended. Refresh to see the result." }, { status: 409 });
    publishChessMatchUpdate(match.id);
    const winner = result === "white-won" ? match.white.name : match.black.name;
    const resigningPlayer = memberId === match.whiteMemberId ? match.white.name : match.black.name;
    void Promise.all([match.whiteMemberId, match.blackMemberId].map((recipientId) => sendChessPush(householdId, recipientId, { title: "Chess game complete", body: `${resigningPlayer} resigned. ${winner} wins the game.`, url: `/kid/${recipientId}/games` }).catch((error) => console.error("[chess push] resignation", error))));
    return NextResponse.json({ fen: match.fen, currentTurn: match.currentTurn, status: "completed", result });
  }
  if (action === "move") {
    const matchId = id(body.matchId); const memberId = id(body.memberId); const from = id(body.from); const to = id(body.to); const promotion = id(body.promotion) || undefined;
    const match = await prisma.familyChessMatch.findFirst({ where: { id: matchId, householdId, status: "active" }, include: { moves: { select: { ply: true } }, white: { select: { name: true } }, black: { select: { name: true } } } });
    if (!match || !(await canPlayAs(actor, memberId)) || ![match.whiteMemberId, match.blackMemberId].includes(memberId)) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if ((match.currentTurn === "white" ? match.whiteMemberId : match.blackMemberId) !== memberId) return NextResponse.json({ error: "It is not this player’s turn" }, { status: 403 });
    const chess = new Chess(match.fen); let move: { san: string; from: string; to: string; promotion?: string };
    try { move = chess.move({ from, to, promotion }); } catch { return NextResponse.json({ error: "That is not a legal move" }, { status: 400 }); }
    const complete = chess.isGameOver(); const result = chess.isCheckmate() ? (match.currentTurn === "white" ? "white-won" : "black-won") : complete ? "draw" : null; const fen = chess.fen();
    const update = await prisma.familyChessMatch.updateMany({ where: { id: matchId, status: "active", fen: match.fen }, data: { fen, currentTurn: chess.turn() === "w" ? "white" : "black", status: complete ? "completed" : "active", result, lastMoveAt: new Date() } });
    if (!update.count) return NextResponse.json({ error: "The board changed. Refresh and try again." }, { status: 409 });
    await prisma.familyChessMove.create({ data: { matchId, memberId, ply: match.moves.length + 1, san: move.san, from: move.from, to: move.to, promotion: move.promotion ?? null, fen } });
    publishChessMatchUpdate(matchId);
    const nextMemberId = chess.turn() === "w" ? match.whiteMemberId : match.blackMemberId;
    const nextPlayerName = chess.turn() === "w" ? match.white.name : match.black.name;
    const movingPlayerName = memberId === match.whiteMemberId ? match.white.name : match.black.name;
    if (complete) {
      void Promise.all([match.whiteMemberId, match.blackMemberId].map((recipientId) => sendChessPush(householdId, recipientId, { title: "Chess game complete", body: result === "draw" ? "Your family chess game ended in a draw." : `${result === "white-won" ? match.white.name : match.black.name} won the game.`, url: `/kid/${recipientId}/games` }).catch((error) => console.error("[chess push] result", error))));
    } else {
      void sendChessPush(householdId, nextMemberId, { title: "Your chess turn", body: `${movingPlayerName} made a move. It is ${nextPlayerName}'s turn.`, url: `/kid/${nextMemberId}/games` }).catch((error) => console.error("[chess push] turn", error));
    }
    return NextResponse.json({ fen, currentTurn: chess.turn() === "w" ? "white" : "black", status: complete ? "completed" : "active", result, move: { san: move.san, ply: match.moves.length + 1, from: move.from, to: move.to } });
  }
  return NextResponse.json({ error: "Unknown chess action" }, { status: 400 });
});
