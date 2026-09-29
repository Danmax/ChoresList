import { Chess } from "chess.js";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessMember } from "@/lib/child-access";
import { requireSession, withErrors } from "@/lib/api";

const id = (value: unknown) => typeof value === "string" ? value.trim() : "";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const memberId = new URL(req.url).searchParams.get("memberId") ?? "";
  if (!memberId || !(await canAccessMember(parentId, householdId, memberId))) return NextResponse.json({ error: "You do not have access to this player" }, { status: 403 });
  const matches = await prisma.familyChessMatch.findMany({ where: { householdId, OR: [{ whiteMemberId: memberId }, { blackMemberId: memberId }] }, include: { white: { select: { id: true, name: true } }, black: { select: { id: true, name: true } }, moves: { orderBy: { ply: "asc" }, select: { san: true, ply: true } } }, orderBy: { lastMoveAt: "desc" }, take: 20 });
  return NextResponse.json({ matches });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req); const body = await req.json(); const action = id(body.action);
  if (action === "start") {
    const whiteMemberId = id(body.whiteMemberId); const blackMemberId = id(body.blackMemberId);
    if (!whiteMemberId || !blackMemberId || whiteMemberId === blackMemberId || !(await canAccessMember(parentId, householdId, whiteMemberId)) || !(await canAccessMember(parentId, householdId, blackMemberId))) return NextResponse.json({ error: "Choose two family members you can access" }, { status: 400 });
    const match = await prisma.familyChessMatch.create({ data: { householdId, whiteMemberId, blackMemberId, fen: new Chess().fen() } });
    return NextResponse.json({ match }, { status: 201 });
  }
  if (action === "move") {
    const matchId = id(body.matchId); const memberId = id(body.memberId); const from = id(body.from); const to = id(body.to); const promotion = id(body.promotion) || undefined;
    const match = await prisma.familyChessMatch.findFirst({ where: { id: matchId, householdId, status: "active" }, include: { moves: { select: { ply: true } } } });
    if (!match || !(await canAccessMember(parentId, householdId, memberId)) || ![match.whiteMemberId, match.blackMemberId].includes(memberId)) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if ((match.currentTurn === "white" ? match.whiteMemberId : match.blackMemberId) !== memberId) return NextResponse.json({ error: "It is not this player’s turn" }, { status: 403 });
    const chess = new Chess(match.fen); let move: { san: string; from: string; to: string; promotion?: string };
    try { move = chess.move({ from, to, promotion }); } catch { return NextResponse.json({ error: "That is not a legal move" }, { status: 400 }); }
    const complete = chess.isGameOver(); const result = chess.isCheckmate() ? (match.currentTurn === "white" ? "white-won" : "black-won") : complete ? "draw" : null; const fen = chess.fen();
    const update = await prisma.familyChessMatch.updateMany({ where: { id: matchId, status: "active", fen: match.fen }, data: { fen, currentTurn: chess.turn() === "w" ? "white" : "black", status: complete ? "completed" : "active", result, lastMoveAt: new Date() } });
    if (!update.count) return NextResponse.json({ error: "The board changed. Refresh and try again." }, { status: 409 });
    await prisma.familyChessMove.create({ data: { matchId, memberId, ply: match.moves.length + 1, san: move.san, from: move.from, to: move.to, promotion: move.promotion ?? null, fen } });
    return NextResponse.json({ fen, currentTurn: chess.turn() === "w" ? "white" : "black", status: complete ? "completed" : "active", result });
  }
  return NextResponse.json({ error: "Unknown chess action" }, { status: 400 });
});
