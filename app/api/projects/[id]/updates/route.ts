import { randomBytes } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireSession } from "@/lib/api";
import { canAccessMember } from "@/lib/child-access";
import { optimizeToWebp } from "@/lib/image";
import { uploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function text(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function minutes(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(1_440, Math.max(0, Math.round(parsed))) : 0;
}

function progress(value: FormDataEntryValue | null) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.round(parsed))) : null;
}

export async function POST(req: NextRequest, { params }: Params) {
  let writtenPath: string | null = null;
  try {
    const { householdId, parentId } = requireSession(req);
    const { id } = await params;
    const project = await prisma.houseProject.findFirst({
      where: { id, householdId },
      include: { participants: { select: { memberId: true } } },
    });
    if (!project || project.status === "completed") return NextResponse.json({ error: "Project is not available for updates." }, { status: 404 });

    const formData = await req.formData();
    const memberId = text(formData.get("memberId"), 36);
    const isAssigned = project.participants.length === 0 || project.participants.some((participant) => participant.memberId === memberId) || project.assignedTo === memberId;
    if (!memberId || !isAssigned || !(await canAccessMember(parentId, householdId, memberId))) {
      return NextResponse.json({ error: "Only an assigned family member can update this project." }, { status: 403 });
    }

    const note = text(formData.get("note"), 2_000) || null;
    const minutesWorked = minutes(formData.get("minutesWorked"));
    const progressPercent = progress(formData.get("progressPercent"));
    const file = formData.get("photo");
    if (!note && minutesWorked === 0 && progressPercent === null && !(file instanceof File && file.size > 0)) {
      return NextResponse.json({ error: "Add a note, time, progress, or photo." }, { status: 400 });
    }

    let photoUrl: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Photo must be 15 MB or smaller." }, { status: 413 });
      if (file.type && !ACCEPTED_MIME.has(file.type.toLowerCase())) return NextResponse.json({ error: "Upload a JPEG, PNG, WebP, or HEIC photo." }, { status: 415 });
      const optimized = await optimizeToWebp(Buffer.from(await file.arrayBuffer()));
      const updateDir = uploadPath("project-updates", householdId, project.id);
      if (!updateDir) return NextResponse.json({ error: "Invalid upload destination." }, { status: 400 });
      await mkdir(updateDir, { recursive: true });
      const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.webp`;
      writtenPath = uploadPath("project-updates", householdId, project.id, filename);
      if (!writtenPath || !writtenPath.startsWith(updateDir + path.sep)) throw new Error("Invalid upload destination");
      await writeFile(writtenPath, optimized.buffer);
      photoUrl = `/uploads/project-updates/${householdId}/${project.id}/${filename}`;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const workLog = await tx.projectWorkLog.create({
        data: { householdId, projectId: project.id, memberId, note, minutesWorked, progressPercent, photoUrl },
        include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
      });
      const nextProgress = progressPercent ?? project.progressPercent;
      const nextProject = await tx.houseProject.update({
        where: { id: project.id },
        data: { progressPercent: nextProgress, status: project.status === "open" ? "in-progress" : project.status },
      });
      return { workLog, project: nextProject };
    });
    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    if (writtenPath) await unlink(writtenPath).catch(() => undefined);
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[project update]", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not save project update." }, { status: 500 });
  }
}
