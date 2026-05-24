import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const completionId = parseInt(id);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) ?? "after";
    const memberId = formData.get("memberId") as string;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const dir = path.join(process.cwd(), "public", "uploads", memberId ?? "0");
    await mkdir(dir, { recursive: true });

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}-${type}.${ext}`;
    const filePath = path.join(dir, filename);
    await writeFile(filePath, buffer);

    const relativePath = `/uploads/${memberId}/${filename}`;
    const updateField = type === "before" ? "photoBeforePath" : "photoAfterPath";

    const completion = await prisma.taskCompletion.update({
      where: { id: completionId },
      data: { [updateField]: relativePath },
    });

    return NextResponse.json({ path: relativePath, completion });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[API photo]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
