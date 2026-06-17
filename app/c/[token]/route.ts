import { NextRequest, NextResponse } from "next/server";
import { verifyCommunityInviteToken } from "@/lib/session";

function communityPath(groupId: string, eventId?: string | null) {
  const path = `/community/${groupId}`;
  return eventId ? `${path}?event=${eventId}` : path;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = verifyCommunityInviteToken(token);
  if (!invite) {
    return NextResponse.json({ error: "Community invite is invalid or expired" }, { status: 400 });
  }

  const inviteUrl = new URL("/parent", req.url);
  inviteUrl.searchParams.set("communityInvite", token);
  inviteUrl.searchParams.set("returnTo", communityPath(invite.groupId, invite.eventId));
  return NextResponse.redirect(inviteUrl);
}
