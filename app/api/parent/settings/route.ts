import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, requireParentSession, withErrors } from "@/lib/api";
import { parentSession } from "@/lib/session";

const TIME_ZONES = new Set([
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
]);

function bool(value: unknown) {
  return Boolean(value);
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  const [household, parent] = await Promise.all([
    prisma.household.findUnique({
      where: { id: householdId },
      include: {
        googleCalendarConnection: {
          select: {
            googleAccountEmail: true,
            calendarId: true,
            syncStatus: true,
            lastSyncAt: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.parentAccount.findUnique({ where: { id: parentId }, select: { email: true, accountRole: true } }),
  ]);

  if (!household) return NextResponse.json({ error: "Household not found" }, { status: 404 });
  return NextResponse.json({
    ...household,
    parentEmail: parent?.email ?? "",
    accountRole: parent?.accountRole ?? "parent",
    canManageHousehold: parent?.accountRole === "owner",
  });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireOwnerSession(req);
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Family name is required" }, { status: 400 });

  const timeZone = typeof body.timeZone === "string" && TIME_ZONES.has(body.timeZone)
    ? body.timeZone
    : "America/New_York";

  const googleCalendarId = typeof body.googleCalendarId === "string" && body.googleCalendarId.trim()
    ? body.googleCalendarId.trim()
    : null;

  const household = await prisma.household.update({
    where: { id: householdId },
    data: {
      name,
      timeZone,
      googleCalendarEnabled: bool(body.googleCalendarEnabled),
      googleCalendarId,
      googleCalendarSyncAssignments: bool(body.googleCalendarSyncAssignments),
      googleCalendarSyncEvents: bool(body.googleCalendarSyncEvents),
      emailNotificationsEnabled: bool(body.emailNotificationsEnabled),
      emailDailySummary: bool(body.emailDailySummary),
      emailWeeklyReport: bool(body.emailWeeklyReport),
      privacyShowKidPoints: bool(body.privacyShowKidPoints),
      privacyAllowKidWishlist: bool(body.privacyAllowKidWishlist),
      privacyStoreCompletionPhotos: bool(body.privacyStoreCompletionPhotos),
      privacyAnalyticsOptIn: bool(body.privacyAnalyticsOptIn),
    },
  });

  await prisma.googleCalendarConnection.updateMany({
    where: { householdId },
    data: { calendarId: googleCalendarId || "primary" },
  });

  return NextResponse.json(household);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireOwnerSession(req);
  const body = await req.json();
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm account deletion" }, { status: 400 });
  }

  await prisma.household.delete({ where: { id: householdId } });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(parentSession.name, "", { maxAge: 0, path: "/" });
  return res;
});
