import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireSession } from "@/lib/api";
import { canAccessMember } from "@/lib/child-access";
import { requirePluginActive } from "@/lib/plugins/registry";
import { uploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
const MAX_FILES = 5;
const ACCEPTED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
]);

type Params = { params: Promise<{ id: string }> };
type SubmissionFile = { id: string; name: string; type: string; size: number; storageName: string };

function cleanText(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest, { params }: Params) {
  const writtenPaths: string[] = [];
  try {
    const { householdId, parentId } = requireSession(req);
    await requirePluginActive(householdId, "education-academy");
    const { id } = await params;
    const project = await prisma.educationProject.findFirst({
      where: { id, householdId },
      select: { id: true, memberId: true, status: true },
    });
    if (!project?.memberId) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!(await canAccessMember(parentId, householdId, project.memberId))) {
      return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
    }
    if (project.status !== "open") {
      return NextResponse.json({ error: "Only open projects can be submitted" }, { status: 400 });
    }

    const formData = await req.formData();
    const title = cleanText(formData.get("title"), 255);
    const description = cleanText(formData.get("description"), 10_000);
    const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    if (!title) return NextResponse.json({ error: "Submission title is required" }, { status: 400 });
    if (!description) return NextResponse.json({ error: "Submission description is required" }, { status: 400 });
    if (files.length > MAX_FILES) return NextResponse.json({ error: `Upload up to ${MAX_FILES} files` }, { status: 400 });
    if (files.some((file) => file.size > MAX_FILE_BYTES)) return NextResponse.json({ error: "Each file must be 15 MB or smaller" }, { status: 413 });
    if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) return NextResponse.json({ error: "Uploads must total 40 MB or less" }, { status: 413 });
    if (files.some((file) => !ACCEPTED_MIME.has(file.type.toLowerCase()))) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    const projectDir = uploadPath("education-projects", householdId, project.id);
    if (!projectDir) return NextResponse.json({ error: "Invalid upload destination" }, { status: 400 });
    await mkdir(projectDir, { recursive: true });
    const metadata: SubmissionFile[] = [];
    for (const file of files) {
      const fileId = randomBytes(12).toString("hex");
      const extension = path.extname(file.name).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 12);
      const storageName = `${fileId}${extension}`;
      const filePath = uploadPath("education-projects", householdId, project.id, storageName);
      if (!filePath || !filePath.startsWith(projectDir + path.sep)) throw new Error("Invalid upload path");
      await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
      writtenPaths.push(filePath);
      metadata.push({ id: fileId, name: file.name.slice(0, 255), type: file.type.toLowerCase(), size: file.size, storageName });
    }

    const updated = await prisma.educationProject.update({
      where: { id: project.id },
      data: {
        submissionTitle: title,
        submissionDescription: description,
        submissionFiles: metadata,
        submittedAt: new Date(),
        status: "submitted",
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (writtenPaths.length) {
      const { unlink } = await import("fs/promises");
      await Promise.all(writtenPaths.map((filePath) => unlink(filePath).catch(() => undefined)));
    }
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[education project submission]", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not submit project" }, { status: 500 });
  }
}
