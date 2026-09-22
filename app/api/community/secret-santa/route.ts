import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requireCommunityRole } from "@/lib/community";
import { drawSecretSanta } from "@/lib/secret-santa";
import { ensureParentFamilyMember } from "@/lib/parent-member";
import { sendNotificationEmail } from "@/lib/email";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function cleanRequiredText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanBudgetCents(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.min(Math.round(amount * 100), 10_000_000) : null;
}

function cleanUrl(value: unknown) {
  const text = cleanText(value, 1024);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const participantGraph = {
  communityParticipant: {
    include: {
      member: { select: { id: true, name: true, avatar: true, color: true } },
      parent: { select: { id: true, householdId: true } },
    },
  },
  recipient: {
    include: {
      communityParticipant: {
        include: {
          member: { select: { id: true, name: true, avatar: true, color: true } },
          parent: { select: { id: true, householdId: true } },
        },
      },
    },
  },
} as const;

const exchangeGraph = {
  participants: { include: participantGraph, orderBy: { joinedAt: "asc" as const } },
} as const;

function publicPerson(entry: {
  id: string;
  giftIdeas: string | null;
  wishListUrl: string | null;
  communityParticipant: {
    id: string;
    displayName: string | null;
    parentId: string;
    member: { id: string; name: string; avatar: string; color: string };
  };
}) {
  return {
    id: entry.id,
    communityParticipantId: entry.communityParticipant.id,
    name: entry.communityParticipant.displayName || entry.communityParticipant.member.name,
    avatar: entry.communityParticipant.member.avatar,
    color: entry.communityParticipant.member.color,
    giftIdeas: entry.giftIdeas,
    wishListUrl: entry.wishListUrl,
  };
}

function publicExchange<T extends {
  participants: Array<{
    id: string;
    giftIdeas: string | null;
    wishListUrl: string | null;
    communityParticipant: {
      id: string;
      displayName: string | null;
      parentId: string;
      member: { id: string; name: string; avatar: string; color: string };
    };
    recipient: null | {
      id: string;
      giftIdeas: string | null;
      wishListUrl: string | null;
      communityParticipant: {
        id: string;
        displayName: string | null;
        parentId: string;
        member: { id: string; name: string; avatar: string; color: string };
      };
    };
  }>;
}>(exchange: T, parentId: string) {
  return {
    ...exchange,
    participants: exchange.participants.map((entry) => ({
      id: entry.id,
      communityParticipantId: entry.communityParticipant.id,
      name: entry.communityParticipant.displayName || entry.communityParticipant.member.name,
      avatar: entry.communityParticipant.member.avatar,
      color: entry.communityParticipant.member.color,
      giftIdeas: entry.communityParticipant.parentId === parentId ? entry.giftIdeas : null,
      wishListUrl: entry.communityParticipant.parentId === parentId ? entry.wishListUrl : null,
      isMine: entry.communityParticipant.parentId === parentId,
      assignment: entry.communityParticipant.parentId === parentId && entry.recipient
        ? publicPerson(entry.recipient)
        : null,
    })),
  };
}

async function getExchange(id: string) {
  return prisma.communitySecretSantaExchange.findUnique({ where: { id }, include: exchangeGraph });
}

export const GET = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const groupId = req.nextUrl.searchParams.get("groupId") ?? "";
  if (!groupId) return NextResponse.json({ error: "Group is required" }, { status: 400 });
  const membership = await requireCommunityRole(groupId, parentId, "member");
  const [exchanges, availableParticipants] = await Promise.all([
    prisma.communitySecretSantaExchange.findMany({
      where: { groupId },
      include: exchangeGraph,
      orderBy: [{ status: "asc" }, { eventDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.communityParticipant.findMany({
      where: { groupId, parentId, status: "active" },
      include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
      orderBy: [{ displayName: "asc" }, { joinedAt: "asc" }],
    }),
  ]);

  return NextResponse.json({
    exchanges: exchanges.map((exchange) => publicExchange(exchange, parentId)),
    availableParticipants: availableParticipants.map((participant) => ({
      id: participant.id,
      name: participant.displayName || participant.member.name,
      avatar: participant.member.avatar,
      color: participant.member.color,
    })),
    canManage: membership.role === "owner" || membership.role === "manager",
    isOwner: membership.role === "owner",
  });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  await requireCommunityRole(groupId, parentId, "manager");
  const title = cleanRequiredText(body.title, 255);
  if (!title) return NextResponse.json({ error: "Exchange title is required" }, { status: 400 });

  const exchange = await prisma.communitySecretSantaExchange.create({
    data: {
      groupId,
      createdByParentId: parentId,
      title,
      eventDate: cleanDate(body.eventDate),
      signupDeadline: cleanDate(body.signupDeadline),
      budgetCents: cleanBudgetCents(body.budget),
      instructions: cleanText(body.instructions, 5000),
      preventSameHousehold: body.preventSameHousehold !== false,
    },
    include: exchangeGraph,
  });
  return NextResponse.json(publicExchange(exchange, parentId), { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  const action = typeof body.action === "string" ? body.action : "";
  const exchange = id ? await getExchange(id) : null;
  if (!exchange) return NextResponse.json({ error: "Gift exchange not found" }, { status: 404 });
  const membership = await requireCommunityRole(exchange.groupId, parentId, "member");
  const canManage = membership.role === "owner" || membership.role === "manager";

  if (action === "join" || action === "join-self") {
    if (exchange.status !== "signup") return NextResponse.json({ error: "Sign-ups are closed" }, { status: 409 });
    if (exchange.signupDeadline && exchange.signupDeadline.getTime() < Date.now()) {
      return NextResponse.json({ error: "The sign-up deadline has passed" }, { status: 409 });
    }
    let communityParticipantId = typeof body.communityParticipantId === "string" ? body.communityParticipantId : "";
    if (action === "join-self") {
      const selfMember = await ensureParentFamilyMember(parentId, householdId);
      if (!selfMember) return NextResponse.json({ error: "Could not prepare your profile for this exchange" }, { status: 404 });
      const selfParticipant = await prisma.communityParticipant.upsert({
        where: { groupId_parentId_memberId: { groupId: exchange.groupId, parentId, memberId: selfMember.id } },
        create: { groupId: exchange.groupId, parentId, memberId: selfMember.id, displayName: selfMember.name },
        update: { status: "active", displayName: selfMember.name },
      });
      communityParticipantId = selfParticipant.id;
    }
    const participant = await prisma.communityParticipant.findFirst({
      where: { id: communityParticipantId, groupId: exchange.groupId, parentId, status: "active" },
    });
    if (!participant) return NextResponse.json({ error: "Choose one of your community participants" }, { status: 403 });
    await prisma.communitySecretSantaParticipant.upsert({
      where: { exchangeId_communityParticipantId: { exchangeId: exchange.id, communityParticipantId } },
      create: {
        exchangeId: exchange.id,
        communityParticipantId,
        giftIdeas: cleanText(body.giftIdeas, 3000),
        wishListUrl: cleanUrl(body.wishListUrl),
      },
      update: {
        giftIdeas: cleanText(body.giftIdeas, 3000),
        wishListUrl: cleanUrl(body.wishListUrl),
      },
    });
  } else if (action === "update-wishes") {
    const participantId = typeof body.participantId === "string" ? body.participantId : "";
    const participant = exchange.participants.find((entry) => entry.id === participantId);
    if (!participant || participant.communityParticipant.parentId !== parentId) {
      return NextResponse.json({ error: "You can only update your own participant" }, { status: 403 });
    }
    await prisma.communitySecretSantaParticipant.update({
      where: { id: participant.id },
      data: { giftIdeas: cleanText(body.giftIdeas, 3000), wishListUrl: cleanUrl(body.wishListUrl) },
    });
  } else if (action === "leave") {
    if (exchange.status !== "signup") return NextResponse.json({ error: "The completed draw cannot be changed" }, { status: 409 });
    const participantId = typeof body.participantId === "string" ? body.participantId : "";
    const participant = exchange.participants.find((entry) => entry.id === participantId);
    if (!participant || (participant.communityParticipant.parentId !== parentId && !canManage)) {
      return NextResponse.json({ error: "You cannot remove this participant" }, { status: 403 });
    }
    await prisma.communitySecretSantaParticipant.delete({ where: { id: participant.id } });
  } else if (action === "draw") {
    if (!canManage) return NextResponse.json({ error: "Only a community manager can draw names" }, { status: 403 });
    if (exchange.status !== "signup") return NextResponse.json({ error: "Names have already been drawn" }, { status: 409 });
    let assignments: Map<string, string>;
    try {
      assignments = drawSecretSanta(exchange.participants.map((entry) => ({
        id: entry.id,
        householdId: entry.communityParticipant.parent.householdId,
      })), exchange.preventSameHousehold);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Names could not be drawn" }, { status: 409 });
    }
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.communitySecretSantaExchange.updateMany({
        where: { id: exchange.id, status: "signup" },
        data: { status: "drawn", drawnAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("Names have already been drawn");
      for (const [giverId, recipientId] of assignments) {
        await tx.communitySecretSantaParticipant.update({ where: { id: giverId }, data: { recipientId } });
      }
    });
  } else if (action === "email-matches") {
    if (membership.role !== "owner") return NextResponse.json({ error: "Only the group owner can receive the concealed match list" }, { status: 403 });
    if (exchange.status !== "drawn") return NextResponse.json({ error: "Draw names before emailing the match list" }, { status: 409 });
    const owner = await prisma.parentAccount.findUnique({ where: { id: parentId }, select: { email: true } });
    const group = await prisma.communityGroup.findUnique({ where: { id: exchange.groupId }, select: { name: true } });
    if (!owner || !group) return NextResponse.json({ error: "Could not prepare the concealed match list" }, { status: 404 });
    const matches = exchange.participants.map((giver) => {
      const recipient = giver.recipient;
      if (!recipient) throw new Error("The draw is incomplete");
      const giverName = giver.communityParticipant.displayName || giver.communityParticipant.member.name;
      const recipientName = recipient.communityParticipant.displayName || recipient.communityParticipant.member.name;
      return { giverName, recipientName };
    });
    const text = [
      `Concealed match list for ${exchange.title} in ${group.name}.`,
      "Keep this list private. Only use it to correct or administer the exchange.",
      "",
      ...matches.map(({ giverName, recipientName }) => `${giverName} → ${recipientName}`),
    ].join("\n");
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a"><h1 style="font-size:20px">Concealed match list</h1><p><strong>${escapeHtml(exchange.title)}</strong> · ${escapeHtml(group.name)}</p><p style="color:#b91c1c"><strong>Keep this private.</strong> Use this list only to administer or correct the exchange.</p><ul>${matches.map(({ giverName, recipientName }) => `<li><strong>${escapeHtml(giverName)}</strong> → ${escapeHtml(recipientName)}</li>`).join("")}</ul></div>`;
    const result = await sendNotificationEmail({ to: owner.email, subject: `Concealed matches: ${exchange.title}`, text, html });
    return NextResponse.json({ ok: true, sent: result.sent });
  } else if (action === "close") {
    if (!canManage) return NextResponse.json({ error: "Only a community manager can close an exchange" }, { status: 403 });
    await prisma.communitySecretSantaExchange.update({ where: { id: exchange.id }, data: { status: "closed" } });
  } else {
    return NextResponse.json({ error: "Unknown gift exchange action" }, { status: 400 });
  }

  const updated = await getExchange(exchange.id);
  return NextResponse.json(updated ? publicExchange(updated, parentId) : null);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const exchange = id ? await prisma.communitySecretSantaExchange.findUnique({ where: { id }, select: { groupId: true } }) : null;
  if (!exchange) return NextResponse.json({ error: "Gift exchange not found" }, { status: 404 });
  await requireCommunityRole(exchange.groupId, parentId, "manager");
  await prisma.communitySecretSantaExchange.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
