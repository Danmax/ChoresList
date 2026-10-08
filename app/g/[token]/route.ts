import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/base-url";
import { verifyGameInviteToken } from "@/lib/session";

function returnPath(groupId?: string, eventId?: string) {
  if (!groupId) return "/parent/games";
  return eventId ? `/community/${groupId}?event=${eventId}` : `/community/${groupId}/friends`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = verifyGameInviteToken(token);
  if (!invite) return NextResponse.json({ error: "Game invite is invalid or expired" }, { status: 400 });

  const inviteUrl = new URL("/parent", getBaseUrl(req));
  inviteUrl.searchParams.set("gameInvite", token);
  inviteUrl.searchParams.set("returnTo", returnPath(invite.groupId, invite.eventId));
  return NextResponse.redirect(inviteUrl);
}
