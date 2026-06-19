import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireSession } from "@/lib/api";
import { canAccessMember } from "@/lib/child-access";
import { requirePluginActive } from "@/lib/plugins/registry";
import { uploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; fileId: string }> };
type SubmissionFile = { id: string; name: string; type: string; size: number; storageName: string };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { householdId, parentId } = requireSession(req);
    await requirePluginActive(householdId, "education-academy");
    const { id, fileId } = await params;
    const project = await prisma.educationProject.findFirst({
      where: { id, householdId },
      select: { memberId: true, submissionFiles: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (project.memberId && !(await canAccessMember(parentId, householdId, project.memberId))) {
      return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
    }
    const files = Array.isArray(project.submissionFiles) ? project.submissionFiles as SubmissionFile[] : [];
    const file = files.find((item) => item.id === fileId);
    const filePath = file ? uploadPath("education-projects", householdId, id, file.storageName) : null;
    if (!file || !filePath) return NextResponse.json({ error: "File not found" }, { status: 404 });
    const contents = await readFile(filePath);
    const safeName = file.name.replace(/[\r\n"\\]/g, "_");
    return new NextResponse(contents, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return NextResponse.json({ error: "File not found" }, { status: 404 });
    console.error("[education project file]", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not load file" }, { status: 500 });
  }
}
