import { NextRequest, NextResponse } from "next/server";
import { requireSession, withErrors } from "@/lib/api";
import { ForbiddenError } from "@/lib/auth-error";
import { prisma } from "@/lib/prisma";
import { requirePluginAccess } from "@/lib/plugins/registry";

function verificationAdminEmails() {
  return new Set((process.env.COMMUNITY_VERIFICATION_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

async function requireVerificationAdmin(req: NextRequest) {
  const session = requireSession(req);
  await requirePluginAccess(session.householdId, session.parentId, "community-events");
  const parent = await prisma.parentAccount.findUnique({ where: { id: session.parentId }, select: { email: true } });
  if (!parent || !verificationAdminEmails().has(parent.email.toLowerCase())) throw new ForbiddenError("Only a configured community verification admin can review public organizations.");
  return session;
}

export const GET = withErrors(async (req: NextRequest) => {
  await requireVerificationAdmin(req);
  const groups = await prisma.communityGroup.findMany({
    where: { visibility: "public", verificationStatus: "pending" },
    select: { id: true, name: true, groupType: true, description: true, location: true, organizationDomain: true, createdAt: true, creator: { select: { id: true, email: true, emailVerified: true, displayName: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ groups });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { parentId } = await requireVerificationAdmin(req);
  const body = await req.json();
  const id = typeof body.groupId === "string" ? body.groupId : "";
  const approved = body.action === "approve";
  if (!id || (body.action !== "approve" && body.action !== "reject")) return NextResponse.json({ error: "A group and review decision are required." }, { status: 400 });
  const group = await prisma.communityGroup.findFirst({ where: { id, visibility: "public", verificationStatus: "pending" }, select: { id: true } });
  if (!group) return NextResponse.json({ error: "Pending public organization not found." }, { status: 404 });
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;
  const updated = await prisma.communityGroup.update({ where: { id }, data: approved
    ? { verificationStatus: "verified", verificationMethod: "admin", verificationNote: note, verifiedAt: new Date(), verifiedByParentId: parentId }
    : { verificationStatus: "rejected", verificationMethod: "admin", verificationNote: note, verifiedAt: null, verifiedByParentId: parentId },
    select: { id: true, verificationStatus: true, verificationMethod: true, verificationNote: true, verifiedAt: true },
  });
  return NextResponse.json(updated);
});
