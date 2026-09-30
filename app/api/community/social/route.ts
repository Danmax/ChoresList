import { Chess } from "chess.js";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requirePluginAccess } from "@/lib/plugins/registry";
import { createAppNotification } from "@/lib/app-notifications";
import { publishChessMatchUpdate } from "@/lib/chess-realtime";

const CHILD = { role: "child" };
const activeMembership = (groupId: string, parentId: string) => ({ groupId, parentId, status: "active" });
const cleanText = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const cleanId = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : "";
const pair = (a: string, b: string) => a < b ? [a, b] : [b, a];

async function requireGroupMember(groupId: string, parentId: string) {
  const member = await prisma.communityMember.findFirst({ where: activeMembership(groupId, parentId), select: { id: true } });
  if (!member) throw new Error("Join this community group before using parent connections");
}

async function parentInGroup(groupId: string, parentId: string) {
  return prisma.communityMember.findFirst({ where: activeMembership(groupId, parentId), select: { parentId: true } });
}

async function connected(groupId: string, parentId: string, otherParentId: string) {
  return prisma.communityParentConnection.findFirst({
    where: { groupId, status: "active", OR: [{ requesterParentId: parentId, recipientParentId: otherParentId }, { requesterParentId: otherParentId, recipientParentId: parentId }] },
    select: { id: true },
  });
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  await requirePluginAccess(householdId, parentId, "community-events");
  const groupId = new URL(req.url).searchParams.get("groupId") ?? "";
  if (!groupId) return NextResponse.json({ error: "Group is required" }, { status: 400 });
  await requireGroupMember(groupId, parentId);

  const [parent, profile, profiles, connections, friendships, myChildren, chessMatches, householdParents] = await Promise.all([
    prisma.parentAccount.findFirst({ where: { id: parentId, householdId }, select: { displayName: true, email: true } }),
    prisma.communityParentProfile.findUnique({ where: { groupId_parentId: { groupId, parentId } } }),
    prisma.communityParentProfile.findMany({
      where: { groupId, isDiscoverable: true, parentId: { not: parentId }, parent: { communityMemberships: { some: { groupId, status: "active" } } } },
      select: { parentId: true, displayName: true, avatar: true, bio: true, childSocialEnabled: true }, orderBy: { displayName: "asc" },
    }),
    prisma.communityParentConnection.findMany({ where: { groupId, OR: [{ requesterParentId: parentId }, { recipientParentId: parentId }] }, orderBy: { updatedAt: "desc" } }),
    prisma.communityChildFriendship.findMany({ where: { groupId, OR: [{ requesterParentId: parentId }, { recipientParentId: parentId }] }, orderBy: { updatedAt: "desc" } }),
    prisma.familyMember.findMany({ where: { householdId, ...CHILD }, select: { id: true, name: true, avatar: true, color: true }, orderBy: { name: "asc" } }),
    prisma.communityChessMatch.findMany({
      where: { groupId, friendship: { OR: [{ requesterParentId: parentId }, { recipientParentId: parentId }] } },
      include: { moves: { select: { san: true }, orderBy: { ply: "desc" }, take: 1 } },
      orderBy: { lastMoveAt: "desc" }, take: 20,
    }),
    prisma.parentAccount.findMany({ where: { householdId }, select: { id: true } }),
  ]);

  const connectedParentIds = connections.filter((item) => item.status === "active").map((item) => item.requesterParentId === parentId ? item.recipientParentId : item.requesterParentId);
  const friendParentIds = Array.from(new Set(friendships.flatMap((item) => [item.requesterParentId, item.recipientParentId]).filter((id) => id !== parentId)));
  const otherParentIds = Array.from(new Set([...connectedParentIds, ...friendParentIds]));
  const otherParents = await prisma.parentAccount.findMany({ where: { id: { in: otherParentIds } }, select: { id: true, householdId: true } });
  const householdByParent = new Map(otherParents.map((item) => [item.id, item.householdId]));
  const visibleChildren = await prisma.familyMember.findMany({
    where: { householdId: { in: Array.from(householdByParent.values()) }, ...CHILD },
    select: { id: true, householdId: true, name: true, avatar: true, color: true }, orderBy: { name: "asc" },
  });
  const childrenByParent = Object.fromEntries(otherParentIds.map((id) => [id, visibleChildren.filter((child) => child.householdId === householdByParent.get(id))]));

  return NextResponse.json({
    profile: profile ?? { parentId, displayName: parent?.displayName || parent?.email?.split("@")[0] || "Parent", avatar: "👋", bio: "", isDiscoverable: false, childSocialEnabled: false },
    profiles, connections, friendships, myChildren, childrenByParent, chessMatches,
    householdParentIds: householdParents.map((item) => item.id),
  });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  await requirePluginAccess(householdId, parentId, "community-events");
  const body = await req.json();
  const groupId = cleanId(body.groupId);
  if (!groupId) return NextResponse.json({ error: "Group is required" }, { status: 400 });
  await requireGroupMember(groupId, parentId);
  const fallback = await prisma.parentAccount.findFirst({ where: { id: parentId, householdId }, select: { displayName: true, email: true } });
  const displayName = cleanText(body.displayName, 80) || fallback?.displayName || fallback?.email?.split("@")[0] || "Parent";
  const profile = await prisma.communityParentProfile.upsert({
    where: { groupId_parentId: { groupId, parentId } },
    create: { groupId, parentId, displayName, avatar: cleanText(body.avatar, 32) || "👋", bio: cleanText(body.bio, 280) || null, isDiscoverable: Boolean(body.isDiscoverable), childSocialEnabled: Boolean(body.childSocialEnabled) },
    update: { displayName, avatar: cleanText(body.avatar, 32) || "👋", bio: cleanText(body.bio, 280) || null, isDiscoverable: Boolean(body.isDiscoverable), childSocialEnabled: Boolean(body.childSocialEnabled) },
  });
  return NextResponse.json({ profile });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  await requirePluginAccess(householdId, parentId, "community-events");
  const body = await req.json();
  const groupId = cleanId(body.groupId);
  const action = cleanText(body.action, 32);
  if (!groupId || !action) return NextResponse.json({ error: "Group and action are required" }, { status: 400 });
  await requireGroupMember(groupId, parentId);

  if (action === "connect") {
    const recipientParentId = cleanId(body.parentId);
    if (!recipientParentId || recipientParentId === parentId) return NextResponse.json({ error: "Choose another parent" }, { status: 400 });
    const profile = await prisma.communityParentProfile.findUnique({ where: { groupId_parentId: { groupId, parentId: recipientParentId } } });
    if (!(await parentInGroup(groupId, recipientParentId))) return NextResponse.json({ error: "That parent is not available to connect" }, { status: 404 });
    const householdParent = await prisma.parentAccount.findFirst({ where: { id: recipientParentId, householdId }, select: { id: true } });
    if (householdParent) {
      return NextResponse.json({ connection: { id: `family:${parentId}:${recipientParentId}`, requesterParentId: parentId, recipientParentId, status: "active", implicit: true } });
    }
    if (!profile?.isDiscoverable) return NextResponse.json({ error: "That parent is not available to connect" }, { status: 404 });
    const existing = await prisma.communityParentConnection.findFirst({ where: { groupId, OR: [{ requesterParentId: parentId, recipientParentId }, { requesterParentId: recipientParentId, recipientParentId: parentId }] } });
    if (existing?.status === "blocked") return NextResponse.json({ error: "This connection is unavailable" }, { status: 403 });
    if (existing) return NextResponse.json({ connection: existing });
    const connection = await prisma.communityParentConnection.create({ data: { groupId, requesterParentId: parentId, recipientParentId } });
    await createAppNotification({ recipientParentId, type: "parent-connection-request", title: "New parent connection request", body: "A parent in your community would like to connect.", url: `/community/${groupId}/friends`, groupId, dedupeKey: `parent-connection:${connection.id}` });
    return NextResponse.json({ connection }, { status: 201 });
  }

  if (action === "connection-status") {
    const id = cleanId(body.id); const status = cleanText(body.status, 16);
    const connection = await prisma.communityParentConnection.findFirst({ where: { id, groupId, recipientParentId: parentId, status: "pending" } });
    if (!connection || !["active", "declined", "blocked"].includes(status)) return NextResponse.json({ error: "Connection request not found" }, { status: 404 });
    const updated = await prisma.communityParentConnection.update({ where: { id }, data: { status, ...(status === "blocked" ? { blockedByParentId: parentId } : {}) } });
    if (status === "active") await createAppNotification({ recipientParentId: connection.requesterParentId, type: "parent-connection-accepted", title: "Parent connection accepted", body: "You can now request parent-approved child friendships.", url: `/community/${groupId}/friends`, groupId, dedupeKey: `parent-connection-accepted:${id}` });
    return NextResponse.json({ connection: updated });
  }

  if (action === "friend-request") {
    const myChildId = cleanId(body.myChildId); const friendChildId = cleanId(body.friendChildId); const recipientParentId = cleanId(body.parentId);
    if (!myChildId || !friendChildId || !recipientParentId || myChildId === friendChildId) return NextResponse.json({ error: "Choose two different children" }, { status: 400 });
    const householdParent = await prisma.parentAccount.findFirst({ where: { id: recipientParentId, householdId }, select: { id: true } });
    if (householdParent) return NextResponse.json({ familyConnection: true, message: "Family members in the same household are already connected" });
    if (!(await connected(groupId, parentId, recipientParentId))) return NextResponse.json({ error: "Parents must connect before requesting a child friendship" }, { status: 403 });
    const [myProfile, theirProfile, mine, theirs] = await Promise.all([
      prisma.communityParentProfile.findUnique({ where: { groupId_parentId: { groupId, parentId } } }), prisma.communityParentProfile.findUnique({ where: { groupId_parentId: { groupId, parentId: recipientParentId } } }),
      prisma.familyMember.findFirst({ where: { id: myChildId, householdId, ...CHILD }, select: { id: true } }),
      prisma.familyMember.findFirst({ where: { id: friendChildId, role: "child", household: { parents: { some: { id: recipientParentId } } } }, select: { id: true } }),
    ]);
    if (!myProfile?.childSocialEnabled || !theirProfile?.childSocialEnabled || !mine || !theirs) return NextResponse.json({ error: "Both parents must enable child social play and select eligible children" }, { status: 403 });
    const [childAId, childBId] = pair(myChildId, friendChildId);
    const existing = await prisma.communityChildFriendship.findUnique({ where: { groupId_childAId_childBId: { groupId, childAId, childBId } } });
    if (existing) return NextResponse.json({ friendship: existing });
    const friendship = await prisma.communityChildFriendship.create({ data: { groupId, childAId, childBId, requesterParentId: parentId, recipientParentId } });
    await createAppNotification({ recipientParentId, type: "child-friend-request", title: "Child friendship approval needed", body: "A connected parent requested a child friendship. Review it before games can begin.", url: `/community/${groupId}/friends`, groupId, dedupeKey: `child-friend:${friendship.id}` });
    return NextResponse.json({ friendship }, { status: 201 });
  }

  if (action === "friendship-status") {
    const id = cleanId(body.id); const status = cleanText(body.status, 16);
    const friendship = await prisma.communityChildFriendship.findFirst({ where: { id, groupId, recipientParentId: parentId, status: "pending" } });
    if (!friendship || !["active", "declined", "blocked"].includes(status)) return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    const updated = await prisma.communityChildFriendship.update({ where: { id }, data: { status } });
    if (status === "active") await createAppNotification({ recipientParentId: friendship.requesterParentId, type: "child-friend-accepted", title: "Child friendship approved", body: "The approved children can now play private games together.", url: `/community/${groupId}/friends`, groupId, dedupeKey: `child-friend-accepted:${id}` });
    return NextResponse.json({ friendship: updated });
  }

  if (action === "start-chess") {
    const friendshipId = cleanId(body.friendshipId); const whiteMemberId = cleanId(body.whiteMemberId); const blackMemberId = cleanId(body.blackMemberId);
    const friendship = await prisma.communityChildFriendship.findFirst({ where: { id: friendshipId, groupId, status: "active", OR: [{ requesterParentId: parentId }, { recipientParentId: parentId }] } });
    if (!friendship || ![friendship.childAId, friendship.childBId].includes(whiteMemberId) || ![friendship.childAId, friendship.childBId].includes(blackMemberId) || whiteMemberId === blackMemberId) return NextResponse.json({ error: "Choose an approved child friendship" }, { status: 403 });
    const whitePlayer = await prisma.familyMember.findFirst({ where: { id: whiteMemberId, householdId, ...CHILD }, select: { id: true } });
    if (!whitePlayer) return NextResponse.json({ error: "Your child must start the private chess room" }, { status: 403 });
    const existingMatch = await prisma.communityChessMatch.findFirst({ where: { groupId, friendshipId, status: "active" }, orderBy: { lastMoveAt: "desc" } });
    if (existingMatch) return NextResponse.json({ match: existingMatch });
    const match = await prisma.communityChessMatch.create({ data: { groupId, friendshipId, whiteMemberId, blackMemberId, fen: new Chess().fen() } });
    const opponentParentId = friendship.requesterParentId === parentId ? friendship.recipientParentId : friendship.requesterParentId;
    await createAppNotification({ recipientParentId: opponentParentId, type: "chess-invite", title: "A private chess room is ready", body: "A connected family started a parent-approved chess game. Open the lobby when it is your child’s turn.", url: `/community/${groupId}/friends`, groupId, dedupeKey: `chess-invite:${match.id}` });
    return NextResponse.json({ match }, { status: 201 });
  }

  if (action === "move-chess") {
    const matchId = cleanId(body.matchId); const memberId = cleanId(body.memberId); const from = cleanText(body.from, 2); const to = cleanText(body.to, 2); const promotion = cleanText(body.promotion, 8) || undefined;
    const match = await prisma.communityChessMatch.findFirst({ where: { id: matchId, groupId, status: "active", friendship: { OR: [{ requesterParentId: parentId }, { recipientParentId: parentId }] } }, include: { moves: { select: { ply: true } }, friendship: { select: { requesterParentId: true, recipientParentId: true } } } });
    if (!match || ![match.whiteMemberId, match.blackMemberId].includes(memberId)) return NextResponse.json({ error: "Chess match not found" }, { status: 404 });
    const ownsMember = await prisma.familyMember.findFirst({ where: { id: memberId, householdId, ...CHILD }, select: { id: true } });
    const expectedMember = match.currentTurn === "white" ? match.whiteMemberId : match.blackMemberId;
    if (!ownsMember || expectedMember !== memberId) return NextResponse.json({ error: "It is not this child's turn" }, { status: 403 });
    const chess = new Chess(match.fen);
    let move: { san: string; from: string; to: string; promotion?: string };
    try { move = chess.move({ from, to, promotion }); } catch { return NextResponse.json({ error: "That is not a legal chess move" }, { status: 400 }); }
    const completed = chess.isGameOver();
    const result = chess.isCheckmate() ? (match.currentTurn === "white" ? "white-won" : "black-won") : completed ? "draw" : null;
    const nextFen = chess.fen();
    const updated = await prisma.communityChessMatch.updateMany({ where: { id: match.id, fen: match.fen, status: "active" }, data: { fen: nextFen, currentTurn: chess.turn() === "w" ? "white" : "black", status: completed ? "completed" : "active", result, lastMoveAt: new Date() } });
    if (!updated.count) return NextResponse.json({ error: "The board changed. Refresh and try again." }, { status: 409 });
    await prisma.communityChessMove.create({ data: { matchId: match.id, memberId, ply: match.moves.length + 1, san: move.san, from: move.from, to: move.to, promotion: move.promotion ?? null, fen: nextFen } });
    publishChessMatchUpdate(match.id);
    if (!completed) {
      const opponentParentId = match.friendship.requesterParentId === parentId ? match.friendship.recipientParentId : match.friendship.requesterParentId;
      await createAppNotification({ recipientParentId: opponentParentId, type: "chess-turn", title: "Your child’s chess turn", body: "A friend made a move in a private chess match.", url: `/community/${groupId}/friends`, groupId, dedupeKey: `chess-turn:${match.id}:${match.moves.length + 1}` });
    }
    return NextResponse.json({ fen: nextFen, currentTurn: chess.turn() === "w" ? "white" : "black", status: completed ? "completed" : "active", result, move });
  }
  return NextResponse.json({ error: "Unknown social action" }, { status: 400 });
});
