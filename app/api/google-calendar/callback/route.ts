import { NextRequest, NextResponse } from "next/server";
import { requireSession, withErrors } from "@/lib/api";
import { exchangeGoogleAuthorizationCode, syncAllGoogleCalendars } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/base-url";
import { requirePluginAccess } from "@/lib/plugins/registry";

const STATE_COOKIE = "google-calendar-oauth-state";

function redirectToSettings(req: NextRequest, params?: Record<string, string>) {
  const url = new URL("/parent/settings", getBaseUrl(req));
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export const GET = withErrors(async (req: NextRequest) => {
  const session = requireSession(req);
  await requirePluginAccess(session.householdId, session.parentId, "calendar-sync");
  const { searchParams } = new URL(req.url);
  const error = searchParams.get("error");
  if (error) return redirectToSettings(req, { googleCalendar: "denied" });

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToSettings(req, { googleCalendar: "invalid_state" });
  }

  const household = await prisma.household.findUnique({
    where: { id: session.householdId },
    select: { googleCalendarId: true },
  });

  const tokens = await exchangeGoogleAuthorizationCode(code);

  await prisma.googleCalendarConnection.upsert({
    where: { householdId: session.householdId },
    create: {
      householdId: session.householdId,
      googleAccountEmail: tokens.googleAccountEmail,
      calendarId: household?.googleCalendarId || "primary",
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      syncStatus: "connected",
    },
    update: {
      googleAccountEmail: tokens.googleAccountEmail,
      calendarId: household?.googleCalendarId || "primary",
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      syncStatus: "connected",
      lastSyncAt: null,
    },
  });

  await syncAllGoogleCalendars(session.householdId);

  const res = redirectToSettings(req, { googleCalendar: "connected" });
  res.cookies.set(STATE_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
});
