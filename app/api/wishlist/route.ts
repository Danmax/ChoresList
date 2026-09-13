import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { cleanAmazonImageUrl, cleanAmazonUrl } from "@/lib/amazon";
import { canAccessMember, childAccessWhere } from "@/lib/child-access";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const listId = searchParams.get("listId");
  const accessWhere = await childAccessWhere(parentId, householdId);
  const items = await prisma.wishListItem.findMany({
    where: {
      householdId,
      ...(memberId && { memberId }),
      ...(listId && { listId }),
      member: accessWhere,
    },
    include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const body = await req.json();
  const { memberId, listId, title, category, emoji, note, amazonUrl, imageUrl } = body;
  const creatorType = body.creatorType === "parent" ? "parent" : "kid";
  if (creatorType === "parent") await requireParentSession(req);
  const cleanMemberId = typeof memberId === "string" ? memberId : "";
  const cleanTitle = typeof title === "string" ? title.trim().slice(0, 120) : "";
  if (!cleanTitle) return NextResponse.json({ error: "Wish title is required" }, { status: 400 });
  if (!cleanMemberId) {
    return NextResponse.json({ error: "Member is required" }, { status: 400 });
  }
  const [member, household, hasAccess] = await Promise.all([
    prisma.familyMember.findFirst({ where: { id: cleanMemberId, householdId } }),
    prisma.household.findUnique({ where: { id: householdId }, select: { privacyAllowKidWishlist: true } }),
    canAccessMember(parentId, householdId, cleanMemberId),
  ]);
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (!hasAccess) return NextResponse.json({ error: "You do not have access to this child" }, { status: 403 });
  if (creatorType === "kid" && !household?.privacyAllowKidWishlist) {
    return NextResponse.json({ error: "Christmas-list additions are turned off by a parent" }, { status: 403 });
  }
  let list = typeof listId === "string" && listId
    ? await prisma.giftList.findFirst({ where: { id: listId, householdId, memberId: cleanMemberId } })
    : await prisma.giftList.findFirst({ where: { householdId, memberId: cleanMemberId }, orderBy: { createdAt: "asc" } });
  if (!list && !listId) {
    list = await prisma.giftList.create({
      data: { householdId, memberId: cleanMemberId, title: `${member.name}'s Wish List`, type: "general", createdByType: "legacy", createdByParentId: parentId },
    });
  }
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });
  const cleanUrl = cleanAmazonUrl(amazonUrl);
  const cleanImage = cleanAmazonImageUrl(imageUrl);
  if (typeof amazonUrl === "string" && amazonUrl.trim() && !cleanUrl) {
    return NextResponse.json({ error: "Use a secure Amazon.com product link" }, { status: 400 });
  }
  if (typeof imageUrl === "string" && imageUrl.trim() && !cleanImage) {
    return NextResponse.json({ error: "Use an Amazon product image URL" }, { status: 400 });
  }
  const item = await prisma.wishListItem.create({
    data: {
      householdId,
      memberId: cleanMemberId,
      listId: list.id,
      title: cleanTitle,
      category: typeof category === "string" ? category.slice(0, 64) : "other",
      emoji: typeof emoji === "string" && emoji.trim() ? emoji.trim().slice(0, 32) : "🎁",
      note: typeof note === "string" ? note.trim().slice(0, 500) : null,
      amazonUrl: cleanUrl,
      imageUrl: cleanImage,
    },
  });
  return NextResponse.json(item, { status: 201 });
});

export const PATCH = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  const editorType = body.editorType === "parent" ? "parent" : "kid";
  if (editorType === "parent") await requireParentSession(req);
  const existing = await prisma.wishListItem.findFirst({ where: { id, householdId }, select: { memberId: true, status: true } });
  if (!existing) return NextResponse.json({ error: "Wish not found" }, { status: 404 });
  if (!(await canAccessMember(parentId, householdId, existing.memberId))) return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  if (editorType === "kid") {
    const household = await prisma.household.findUnique({ where: { id: householdId }, select: { privacyAllowKidWishlist: true } });
    if (!household?.privacyAllowKidWishlist) return NextResponse.json({ error: "Wish editing is turned off by a parent" }, { status: 403 });
    if (existing.status !== "pending") return NextResponse.json({ error: "Only pending wishes can be edited" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) return NextResponse.json({ error: "Wish title is required" }, { status: 400 });
  const amazonUrl = cleanAmazonUrl(body.amazonUrl);
  const imageUrl = cleanAmazonImageUrl(body.imageUrl);
  if (typeof body.amazonUrl === "string" && body.amazonUrl.trim() && !amazonUrl) return NextResponse.json({ error: "Use a secure Amazon.com product link" }, { status: 400 });
  if (typeof body.imageUrl === "string" && body.imageUrl.trim() && !imageUrl) return NextResponse.json({ error: "Use an Amazon product image URL" }, { status: 400 });
  const item = await prisma.wishListItem.update({
    where: { id, householdId },
    data: {
      title,
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null,
      category: typeof body.category === "string" ? body.category.slice(0, 64) : "other",
      emoji: typeof body.emoji === "string" && body.emoji.trim() ? body.emoji.trim().slice(0, 32) : "🎁",
      amazonUrl,
      imageUrl,
    },
  });
  return NextResponse.json(item);
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  const body = await req.json();
  const { id, status, title, note, emoji, amazonUrl } = body;
  if (status !== undefined && status !== "pending" && status !== "granted") {
    return NextResponse.json({ error: "Invalid wish status" }, { status: 400 });
  }
  const existing = await prisma.wishListItem.findFirst({
    where: { id: typeof id === "string" ? id : "", householdId },
    select: { memberId: true },
  });
  if (!existing) return NextResponse.json({ error: "Wish not found" }, { status: 404 });
  if (!(await canAccessMember(parentId, householdId, existing.memberId))) {
    return NextResponse.json({ error: "You do not have access to this child" }, { status: 403 });
  }
  const cleanUrl = amazonUrl !== undefined ? cleanAmazonUrl(amazonUrl) : undefined;
  if (typeof amazonUrl === "string" && amazonUrl.trim() && !cleanUrl) {
    return NextResponse.json({ error: "Use a secure Amazon.com product link" }, { status: 400 });
  }
  const item = await prisma.wishListItem.update({
    where: { id, householdId },
    data: {
      ...(status !== undefined && { status }),
      ...(typeof title === "string" && { title: title.trim().slice(0, 120) }),
      ...(typeof note === "string" && { note: note.trim().slice(0, 500) }),
      ...(typeof emoji === "string" && { emoji: emoji.trim().slice(0, 32) }),
      ...(amazonUrl !== undefined && { amazonUrl: cleanUrl }),
    },
  });
  return NextResponse.json(item);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const item = await prisma.wishListItem.findFirst({ where: { id, householdId }, select: { status: true, memberId: true } });
  if (!item) return NextResponse.json({ error: "Wish not found" }, { status: 404 });
  if (!(await canAccessMember(parentId, householdId, item.memberId))) {
    return NextResponse.json({ error: "You do not have access to this child" }, { status: 403 });
  }
  if (item.status !== "pending") await requireParentSession(req);
  await prisma.wishListItem.delete({ where: { id, householdId } });
  return NextResponse.json({ ok: true });
});
