import { randomBytes } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireParentSession, requireSession } from "@/lib/api";
import { optimizeToWebp } from "@/lib/image";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const RECEIPTS_ROOT = path.resolve(process.cwd(), "storage", "grocery-receipts");

function receiptFilePath(receiptPath: string) {
  const filePath = path.resolve(RECEIPTS_ROOT, receiptPath);
  return filePath.startsWith(RECEIPTS_ROOT + path.sep) ? filePath : null;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { householdId } = requireSession(req);
    const { id } = await params;
    const list = await prisma.groceryList.findFirst({
      where: { id, householdId },
      select: { receiptPath: true },
    });
    if (!list?.receiptPath) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

    const filePath = receiptFilePath(list.receiptPath);
    if (!filePath) return NextResponse.json({ error: "Invalid receipt path" }, { status: 400 });
    const image = await readFile(filePath);
    return new NextResponse(image, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `inline; filename="receipt-${id}.webp"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }
    console.error("[API grocery receipt GET]", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not load receipt" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { householdId } = await requireParentSession(req);
    const { id } = await params;
    const list = await prisma.groceryList.findFirst({
      where: { id, householdId },
      select: { id: true, receiptPath: true },
    });
    if (!list) return NextResponse.json({ error: "Shopping list not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No receipt image provided" }, { status: 400 });
    if (file.size <= 0) return NextResponse.json({ error: "Receipt image is empty" }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Receipt image is too large" }, { status: 413 });
    if (file.type && !ACCEPTED_MIME.has(file.type.toLowerCase())) {
      return NextResponse.json({ error: "Unsupported receipt image type" }, { status: 415 });
    }

    let optimized;
    try {
      optimized = await optimizeToWebp(Buffer.from(await file.arrayBuffer()));
    } catch {
      return NextResponse.json({ error: "Could not read receipt image" }, { status: 400 });
    }

    const relativeDir = path.join(householdId, id);
    const receiptDir = receiptFilePath(relativeDir);
    if (!receiptDir) return NextResponse.json({ error: "Invalid receipt destination" }, { status: 400 });
    await mkdir(receiptDir, { recursive: true });

    const filename = `${Date.now()}-receipt-${randomBytes(8).toString("hex")}.webp`;
    const relativePath = path.join(relativeDir, filename);
    const filePath = receiptFilePath(relativePath);
    if (!filePath) return NextResponse.json({ error: "Invalid receipt destination" }, { status: 400 });
    await writeFile(filePath, optimized.buffer);

    await prisma.groceryList.update({ where: { id, householdId }, data: { receiptPath: relativePath } });
    if (list.receiptPath) {
      const oldPath = receiptFilePath(list.receiptPath);
      if (oldPath) await unlink(oldPath).catch(() => undefined);
    }

    return NextResponse.json({
      receiptPath: relativePath,
      width: optimized.width,
      height: optimized.height,
      size: optimized.size,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[API grocery receipt POST]", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not save receipt" }, { status: 500 });
  }
}
