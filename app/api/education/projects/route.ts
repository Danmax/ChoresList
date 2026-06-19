import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { canAccessMember } from "@/lib/child-access";
import { requirePluginActive } from "@/lib/plugins/registry";

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  await requirePluginActive(householdId, "education-academy");
  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  const project = await prisma.educationProject.findFirst({ where: { id, householdId }, select: { memberId: true } });
  if (!project?.memberId) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!(await canAccessMember(parentId, householdId, project.memberId))) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }

  return NextResponse.json({ error: "Submit project work with a title and description" }, { status: 400 });
});
