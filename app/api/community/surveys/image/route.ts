import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSession } from "@/lib/api";
import { requireCommunityRole } from "@/lib/community";
import { optimizeToWebp } from "@/lib/image";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const UPLOADS_ROOT = path.resolve(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest) {
  try {
    const { parentId } = requireSession(req);
    const formData = await req.formData();
    const groupId = formData.get("groupId");
    const file = formData.get("file");

    if (typeof groupId !== "string" || !groupId) return NextResponse.json({ error: "Community is required" }, { status: 400 });
    await requireCommunityRole(groupId, parentId, "manager");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size <= 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Image is too large" }, { status: 413 });
    if (file.type && !ACCEPTED_MIME.has(file.type.toLowerCase())) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
    }

    let optimized;
    try {
      optimized = await optimizeToWebp(Buffer.from(await file.arrayBuffer()));
    } catch {
      return NextResponse.json({ error: "Could not read image" }, { status: 400 });
    }

    const surveyDir = path.resolve(UPLOADS_ROOT, "community-surveys", String(parentId));
    if (!surveyDir.startsWith(UPLOADS_ROOT + path.sep)) return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
    await mkdir(surveyDir, { recursive: true });

    const filename = `${Date.now()}-survey-result-${randomBytes(6).toString("hex")}.webp`;
    const filePath = path.resolve(surveyDir, filename);
    if (!filePath.startsWith(surveyDir + path.sep)) return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
    await writeFile(filePath, optimized.buffer);

    return NextResponse.json({ path: `/uploads/community-surveys/${parentId}/${filename}` });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[API community survey image]", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not save image" }, { status: 500 });
  }
}
