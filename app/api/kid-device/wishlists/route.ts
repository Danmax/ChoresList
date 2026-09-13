import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";
import { hashDeviceSecret, requireDeviceSession } from "@/lib/device-session";
import { canCreateBirthdayList, cleanWishListType, defaultWishListTitle } from "@/lib/wishlists";

async function verifyDevice(req: NextRequest) {
  const session = requireDeviceSession(req);
  const device = await prisma.householdDevice.findFirst({
    where: { id: session.deviceId, householdId: session.householdId, tokenHash: hashDeviceSecret(session.secret), revokedAt: null },
  });
  return device ? session : null;
}

export const GET = withErrors(async (req: NextRequest) => {
  const session = await verifyDevice(req);
  if (!session) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });
  const memberId = req.nextUrl.searchParams.get("memberId") ?? "";
  if (session.mode === "member" && memberId && session.memberId !== memberId) {
    return NextResponse.json({ error: "This device can only view its paired child's lists" }, { status: 403 });
  }
  const lists = await prisma.giftList.findMany({
    where: {
      householdId: session.householdId,
      ...(memberId && { memberId }),
      ...(session.mode === "member" && session.memberId ? { memberId: session.memberId } : {}),
    },
    include: { member: { select: { id: true, name: true, avatar: true, birthdayMonth: true, birthdayDay: true } }, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(lists);
});

export const POST = withErrors(async (req: NextRequest) => {
  const session = await verifyDevice(req);
  if (!session) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });
  const body = await req.json();
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  const type = cleanWishListType(body.type);
  if (!memberId || !type) return NextResponse.json({ error: "Choose a child and list type" }, { status: 400 });
  if (session.mode === "member" && session.memberId !== memberId) {
    return NextResponse.json({ error: "This device can only create lists for its paired child" }, { status: 403 });
  }
  const [member, household] = await Promise.all([
    prisma.familyMember.findFirst({ where: { id: memberId, householdId: session.householdId, role: "child" }, select: { name: true, birthdayMonth: true, birthdayDay: true } }),
    prisma.household.findUnique({ where: { id: session.householdId }, select: { privacyAllowKidWishlist: true } }),
  ]);
  if (!member) return NextResponse.json({ error: "Child not found" }, { status: 404 });
  if (!household?.privacyAllowKidWishlist) return NextResponse.json({ error: "List creation is turned off by a parent" }, { status: 403 });
  if (type === "birthday" && !canCreateBirthdayList(member.birthdayMonth, member.birthdayDay)) {
    return NextResponse.json({ error: member.birthdayMonth ? "Birthday lists open six weeks before the birthday" : "Ask a parent to add your birthday first" }, { status: 400 });
  }
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 120) : defaultWishListTitle(type, member.name);
  const list = await prisma.giftList.create({
    data: { householdId: session.householdId, memberId, title, type, createdByType: "kid" },
    include: { member: { select: { id: true, name: true, avatar: true } }, _count: { select: { items: true } } },
  });
  return NextResponse.json(list, { status: 201 });
});
