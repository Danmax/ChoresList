import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireSession } from "@/lib/api";
import { optimizeToWebp } from "@/lib/image";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const UPLOADS_ROOT = path.resolve(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { householdId } = requireSession(req);
    const { id } = await params;
    const completionId = id;
    if (!completionId) {
      return NextResponse.json({ error: "Invalid completion" }, { status: 400 });
    }

    const completion = await prisma.taskCompletion.findFirst({
      where: { id: completionId, householdId },
      select: { id: true, memberId: true },
    });
    if (!completion) return NextResponse.json({ error: "Completion not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file");
    const rawType = formData.get("type");
    const type = rawType === "before" ? "before" : "after";

    if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size <= 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image is too large" }, { status: 413 });
    }
    if (file.type && !ACCEPTED_MIME.has(file.type.toLowerCase())) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    let optimized;
    try {
      optimized = await optimizeToWebp(bytes);
    } catch {
      return NextResponse.json({ error: "Could not read image" }, { status: 400 });
    }

    const memberDir = path.resolve(UPLOADS_ROOT, String(completion.memberId));
    if (!memberDir.startsWith(UPLOADS_ROOT + path.sep)) {
      return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
    }
    await mkdir(memberDir, { recursive: true });

    const filename = `${Date.now()}-${type}-${randomBytes(6).toString("hex")}.webp`;
    const filePath = path.resolve(memberDir, filename);
    if (!filePath.startsWith(memberDir + path.sep)) {
      return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
    }
    await writeFile(filePath, optimized.buffer);

    const relativePath = `/uploads/${completion.memberId}/${filename}`;
    const updateField = type === "before" ? "photoBeforePath" : "photoAfterPath";

    const updated = await prisma.taskCompletion.update({
      where: { id: completion.id, householdId },
      data: { [updateField]: relativePath },
    });

    return NextResponse.json({
      path: relativePath,
      width: optimized.width,
      height: optimized.height,
      size: optimized.size,
      completion: updated,
    });
  } catch (e) {
    const authResponse = authErrorResponse(e);
    if (authResponse) return authResponse;

    const message = e instanceof Error ? e.message : String(e);
    console.error("[API photo]", message);
    return NextResponse.json({ error: "Could not save photo" }, { status: 500 });
  }
}
