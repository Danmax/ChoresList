import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSession } from "@/lib/api";
import { optimizeToWebp } from "@/lib/image";
import { requirePluginAccess } from "@/lib/plugins/registry";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const UPLOADS_ROOT = path.resolve(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest) {
  try {
    const { householdId, parentId } = requireSession(req);
    await requirePluginAccess(householdId, parentId, "community-events");
    const formData = await req.formData();
    const file = formData.get("file");

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

    const eventDir = path.resolve(UPLOADS_ROOT, "community-events", String(parentId));
    if (!eventDir.startsWith(UPLOADS_ROOT + path.sep)) {
      return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
    }
    await mkdir(eventDir, { recursive: true });

    const filename = `${Date.now()}-community-event-${randomBytes(6).toString("hex")}.webp`;
    const filePath = path.resolve(eventDir, filename);
    if (!filePath.startsWith(eventDir + path.sep)) {
      return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
    }
    await writeFile(filePath, optimized.buffer);

    const relativePath = `/uploads/community-events/${parentId}/${filename}`;
    return NextResponse.json({
      path: relativePath,
      width: optimized.width,
      height: optimized.height,
      size: optimized.size,
    });
  } catch (e) {
    const authResponse = authErrorResponse(e);
    if (authResponse) return authResponse;

    const message = e instanceof Error ? e.message : String(e);
    console.error("[API community image]", message);
    return NextResponse.json({ error: "Could not save image" }, { status: 500 });
  }
}
