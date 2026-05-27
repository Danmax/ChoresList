import { NextRequest, NextResponse } from "next/server";
import { requireSession, withErrors } from "@/lib/api";
import { getBaseUrl } from "@/lib/base-url";
import { createHouseholdInviteToken } from "@/lib/session";

export const runtime = "nodejs";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const token = createHouseholdInviteToken(householdId);
  const inviteUrl = new URL("/parent", getBaseUrl(req));
  inviteUrl.searchParams.set("invite", token);

  return NextResponse.json({ ok: true, inviteUrl: inviteUrl.toString() });
});
