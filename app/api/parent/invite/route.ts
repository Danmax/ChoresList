import { NextRequest, NextResponse } from "next/server";
import { requireOwnerSession, withErrors } from "@/lib/api";
import { getBaseUrl } from "@/lib/base-url";
import { createHouseholdInviteToken } from "@/lib/session";

export const runtime = "nodejs";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireOwnerSession(req);
  const role = req.nextUrl.searchParams.get("role") === "grandparent" ? "grandparent" : "parent";
  const token = createHouseholdInviteToken(householdId, role);
  const inviteUrl = new URL("/parent", getBaseUrl(req));
  inviteUrl.searchParams.set("invite", token);

  return NextResponse.json({ ok: true, inviteUrl: inviteUrl.toString(), role });
});
