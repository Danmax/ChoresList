import { NextRequest, NextResponse } from "next/server";
import { requireOwnerSession, withErrors } from "@/lib/api";
import { getBaseUrl } from "@/lib/base-url";
import { createHouseholdInviteToken } from "@/lib/session";

export const runtime = "nodejs";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireOwnerSession(req);
  const role = req.nextUrl.searchParams.get("role") === "grandparent" ? "grandparent" : "parent";
  const token = createHouseholdInviteToken({ householdId, accountRole: role, parentType: role });
  const inviteUrl = new URL("/parent", getBaseUrl(req));
  inviteUrl.searchParams.set("invite", token);

  return NextResponse.json({ ok: true, inviteUrl: inviteUrl.toString(), role });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireOwnerSession(req);
  const body = await req.json();
  const role = body.accountRole === "grandparent" ? "grandparent" : "parent";
  const token = createHouseholdInviteToken({
    householdId,
    accountRole: role,
    parentType: typeof body.parentType === "string" ? body.parentType : role,
    relationshipLabel: typeof body.relationshipLabel === "string" ? body.relationshipLabel : undefined,
    childAccessMode: typeof body.childAccessMode === "string" ? body.childAccessMode : "all",
    childAccessMemberIds: Array.isArray(body.childAccessMemberIds) ? body.childAccessMemberIds : [],
  });
  const inviteUrl = new URL("/parent", getBaseUrl(req));
  inviteUrl.searchParams.set("invite", token);

  return NextResponse.json({ ok: true, inviteUrl: inviteUrl.toString(), role });
});
