import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { canAccessMember, childAccessWhere } from "@/lib/child-access";
import { getBaseUrl } from "@/lib/base-url";
import { canCreateBirthdayList, cleanWishListType, defaultWishListTitle } from "@/lib/wishlists";

export const runtime = "nodejs";

function eventYear(type: string, birthdayMonth: number | null, birthdayDay: number | null) {
  const now = new Date();
  if (type === "christmas") return now.getMonth() === 11 && now.getDate() > 25 ? now.getFullYear() + 1 : now.getFullYear();
  if (type !== "birthday" || !birthdayMonth || !birthdayDay) return null;
  const thisBirthday = new Date(now.getFullYear(), birthdayMonth - 1, birthdayDay);
  return thisBirthday < new Date(now.getFullYear(), now.getMonth(), now.getDate()) ? now.getFullYear() + 1 : now.getFullYear();
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const memberId = req.nextUrl.searchParams.get("memberId");
  const accessWhere = await childAccessWhere(parentId, householdId);
  const lists = await prisma.giftList.findMany({
    where: { householdId, ...(memberId && { memberId }), member: accessWhere },
    include: {
      member: { select: { id: true, name: true, avatar: true, color: true, birthdayMonth: true, birthdayDay: true, role: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(lists);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const body = await req.json();
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  const type = cleanWishListType(body.type);
  const creatorType = body.creatorType === "kid" ? "kid" : "parent";
  if (!memberId || !type) return NextResponse.json({ error: "Choose a person and list type" }, { status: 400 });
  if (!(await canAccessMember(parentId, householdId, memberId))) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }

  const [member, household] = await Promise.all([
    prisma.familyMember.findFirst({
      where: { id: memberId, householdId },
      select: { name: true, birthdayMonth: true, birthdayDay: true },
    }),
    prisma.household.findUnique({ where: { id: householdId }, select: { privacyAllowKidWishlist: true } }),
  ]);
  if (!member) return NextResponse.json({ error: "Family member not found" }, { status: 404 });
  if (creatorType === "kid" && !household?.privacyAllowKidWishlist) {
    return NextResponse.json({ error: "List creation is turned off by a parent" }, { status: 403 });
  }
  if (type === "birthday" && !canCreateBirthdayList(member.birthdayMonth, member.birthdayDay)) {
    return NextResponse.json({ error: member.birthdayMonth ? "Birthday lists open six weeks before the birthday" : "Add a birthday to this profile first" }, { status: 400 });
  }

  const title = typeof body.title === "string" && body.title.trim()
    ? body.title.trim().slice(0, 120)
    : defaultWishListTitle(type, member.name);
  const list = await prisma.giftList.create({
    data: {
      householdId,
      memberId,
      title,
      type,
      eventYear: eventYear(type, member.birthdayMonth, member.birthdayDay),
      createdByType: creatorType,
      createdByParentId: parentId,
    },
    include: { member: { select: { id: true, name: true, avatar: true, color: true } }, _count: { select: { items: true } } },
  });
  return NextResponse.json(list, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  const list = await prisma.giftList.findFirst({ where: { id, householdId }, select: { memberId: true, publicToken: true } });
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });
  if (!(await canAccessMember(parentId, householdId, list.memberId))) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }

  const sharing = body.sharing;
  if (sharing !== "enable" && sharing !== "disable") {
    return NextResponse.json({ error: "Choose whether to enable or disable sharing" }, { status: 400 });
  }
  const publicToken = sharing === "enable" ? list.publicToken ?? randomBytes(24).toString("hex") : null;
  const updated = await prisma.giftList.update({
    where: { id, householdId },
    data: { publicToken, publicSharedAt: publicToken ? new Date() : null },
  });
  const baseUrl = getBaseUrl(req);
  return NextResponse.json({
    list: updated,
    publicUrl: publicToken ? `${baseUrl}/wishlists/${publicToken}` : null,
    embedUrl: publicToken ? `${baseUrl}/embed/wishlists/${publicToken}` : null,
    embedHtml: publicToken ? `<iframe src="${baseUrl}/embed/wishlists/${publicToken}" title="Shared wish list" width="100%" height="600" style="border:0;border-radius:24px" loading="lazy"></iframe>` : null,
  });
});
