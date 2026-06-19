import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireOwnerSession, withErrors } from "@/lib/api";
import { createGoogleAuthorizationUrl } from "@/lib/google-calendar";
import { requirePluginAccess } from "@/lib/plugins/registry";

const STATE_COOKIE = "google-calendar-oauth-state";
const STATE_TTL_SECONDS = 10 * 60;

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireOwnerSession(req);
  await requirePluginAccess(householdId, parentId, "calendar-sync");

  const state = randomBytes(32).toString("base64url");
  const res = NextResponse.redirect(createGoogleAuthorizationUrl(state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: STATE_TTL_SECONDS,
    path: "/",
  });
  return res;
});
