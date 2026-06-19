import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { uploadContentType, uploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext<"/uploads/[...path]">) {
  const { path: segments } = await context.params;
  const filePath = uploadPath(...segments);
  const contentType = filePath ? uploadContentType(filePath) : null;
  if (!filePath || !contentType) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  try {
    const image = await readFile(filePath);
    return new NextResponse(image, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    console.error("[uploads]", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not load image" }, { status: 500 });
  }
}
