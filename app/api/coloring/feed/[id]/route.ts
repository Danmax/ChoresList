import { NextResponse } from "next/server";
import { requireParentSession, withErrors } from "@/lib/api";
import { childAccessWhere } from "@/lib/child-access";
import { prisma } from "@/lib/prisma";

export const GET = withErrors(async (req, context) => {
  const { householdId, parentId } = await requireParentSession(req);
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const memberAccess = await childAccessWhere(parentId, householdId);
  const post = await prisma.coloringPost.findFirst({
    where: { id, householdId, member: memberAccess }, select: { image: true },
  });
  if (!post) return NextResponse.json({ error: "Picture not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(post.image), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
});
