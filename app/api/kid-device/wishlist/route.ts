import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";
import { hashDeviceSecret, requireDeviceSession } from "@/lib/device-session";
import { cleanAmazonImageUrl, cleanAmazonUrl } from "@/lib/amazon";

async function verifyDevice(req: NextRequest) {
  const session = requireDeviceSession(req);
  const device = await prisma.householdDevice.findFirst({
    where: {
      id: session.deviceId,
      householdId: session.householdId,
      tokenHash: hashDeviceSecret(session.secret),
      revokedAt: null,
    },
  });
  if (!device) return null;
  return session;
}

export const POST = withErrors(async (req: NextRequest) => {
  const session = await verifyDevice(req);
  if (!session) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });

  const body = await req.json();
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!memberId) {
    return NextResponse.json({ error: "Choose a child" }, { status: 400 });
  }
  if (session.mode === "member" && session.memberId !== memberId) {
    return NextResponse.json({ error: "This device can only add wishes for its paired child" }, { status: 403 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Add a wish title" }, { status: 400 });

  const [member, household] = await Promise.all([
    prisma.familyMember.findFirst({
      where: { id: memberId, householdId: session.householdId, role: "child" },
    }),
    prisma.household.findUnique({
      where: { id: session.householdId },
      select: { privacyAllowKidWishlist: true },
    }),
  ]);
  if (!member) return NextResponse.json({ error: "Child not found" }, { status: 404 });
  if (!household?.privacyAllowKidWishlist) {
    return NextResponse.json({ error: "Christmas-list additions are turned off by a parent" }, { status: 403 });
  }

  const amazonUrl = cleanAmazonUrl(body.amazonUrl);
  const imageUrl = cleanAmazonImageUrl(body.imageUrl);
  if (typeof body.amazonUrl === "string" && body.amazonUrl.trim() && !amazonUrl) {
    return NextResponse.json({ error: "Use a secure Amazon.com product link" }, { status: 400 });
  }
  if (typeof body.imageUrl === "string" && body.imageUrl.trim() && !imageUrl) {
    return NextResponse.json({ error: "Use an Amazon product image URL" }, { status: 400 });
  }

  const requestedListId = typeof body.listId === "string" ? body.listId : "";
  let list = requestedListId
    ? await prisma.giftList.findFirst({ where: { id: requestedListId, householdId: session.householdId, memberId } })
    : await prisma.giftList.findFirst({ where: { householdId: session.householdId, memberId }, orderBy: { createdAt: "asc" } });
  if (!list && !requestedListId) {
    list = await prisma.giftList.create({
      data: { householdId: session.householdId, memberId, title: `${member.name}'s Wish List`, type: "general", createdByType: "kid" },
    });
  }
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  const item = await prisma.wishListItem.create({
    data: {
      householdId: session.householdId,
      memberId,
      listId: list.id,
      title,
      category: typeof body.category === "string" ? body.category : "other",
      emoji: typeof body.emoji === "string" ? body.emoji : "🎁",
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
      amazonUrl,
      imageUrl,
    },
  });

  await prisma.householdDevice.update({
    where: { id: session.deviceId },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json(item, { status: 201 });
});

export const PATCH = withErrors(async (req: NextRequest) => {
  const session = await verifyDevice(req);
  if (!session) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });
  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  const item = await prisma.wishListItem.findFirst({
    where: { id, householdId: session.householdId, status: "pending", ...(session.mode === "member" && session.memberId ? { memberId: session.memberId } : {}) },
  });
  if (!item) return NextResponse.json({ error: "Editable wish not found" }, { status: 404 });
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) return NextResponse.json({ error: "Wish title is required" }, { status: 400 });
  const amazonUrl = cleanAmazonUrl(body.amazonUrl);
  const imageUrl = cleanAmazonImageUrl(body.imageUrl);
  if (body.amazonUrl && !amazonUrl) return NextResponse.json({ error: "Use a secure Amazon.com product link" }, { status: 400 });
  if (body.imageUrl && !imageUrl) return NextResponse.json({ error: "Use an Amazon product image URL" }, { status: 400 });
  const updated = await prisma.wishListItem.update({
    where: { id, householdId: session.householdId },
    data: { title, note: typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null, category: typeof body.category === "string" ? body.category.slice(0, 64) : "other", emoji: typeof body.emoji === "string" && body.emoji.trim() ? body.emoji.trim().slice(0, 32) : "🎁", amazonUrl, imageUrl },
  });
  return NextResponse.json(updated);
});
