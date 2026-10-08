import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireSession } from "@/lib/api";
import { optimizeToWebp } from "@/lib/image";
import { uploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const FILE_MIME = new Map([
  ["application/pdf", ".pdf"],
  ["text/plain", ".txt"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  ["application/msword", ".doc"],
]);

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
      return NextResponse.json({ error: "Proof file is too large" }, { status: 413 });
    }
    const mime = file.type.toLowerCase();
    if (!mime || (!IMAGE_MIME.has(mime) && !FILE_MIME.has(mime))) {
      return NextResponse.json({ error: "Use an image, PDF, Word document, or text file" }, { status: 415 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const isImage = IMAGE_MIME.has(mime);
    let contents: Uint8Array = bytes;
    let extension = FILE_MIME.get(mime) ?? ".webp";
    let width: number | undefined;
    let height: number | undefined;
    if (isImage) {
      try {
        const optimized = await optimizeToWebp(bytes);
        contents = optimized.buffer;
        width = optimized.width;
        height = optimized.height;
      } catch {
        return NextResponse.json({ error: "Could not read image" }, { status: 400 });
      }
    }

    const memberDir = uploadPath("completion-proofs", String(completion.memberId));
    if (!memberDir) return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
    await mkdir(memberDir, { recursive: true });

    const filename = `${Date.now()}-${type}-${randomBytes(6).toString("hex")}${extension}`;
    const filePath = uploadPath("completion-proofs", String(completion.memberId), filename);
    if (!filePath) return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
    await writeFile(filePath, contents);

    const relativePath = `/uploads/completion-proofs/${completion.memberId}/${filename}`;
    const updateField = type === "before" ? "photoBeforePath" : "photoAfterPath";

    const updated = await prisma.taskCompletion.update({
      where: { id: completion.id, householdId },
      data: { [updateField]: relativePath },
    });

    return NextResponse.json({
      path: relativePath,
      width,
      height,
      size: contents.byteLength,
      isImage,
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
