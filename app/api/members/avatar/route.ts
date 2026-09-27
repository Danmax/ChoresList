import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireParentSession } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { uploadPath } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"]);
const STYLES: Record<string, string> = {
  "family-animation": "polished 3D family-animation character, soft studio lighting, rounded cute features, large warm expressive eyes",
  anime: "friendly modern anime portrait, clean expressive linework, bright eyes, soft cel shading",
  cartoon: "cheerful premium 2D cartoon portrait, rounded shapes, colorful soft shading, friendly expressive face",
  storybook: "warm storybook illustration, gentle painted texture, whimsical colors, sweet expressive features",
  comic: "kid-friendly animated comic hero portrait, confident friendly expression, crisp shapes, colorful cinematic lighting",
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? process.env.CHATGPT_API_KEY ?? "" });

export async function POST(req: NextRequest) {
  try {
    const { householdId, parentId } = await requireParentSession(req);
    const limited = rateLimit(req, { key: "member-avatar-generate", bucket: String(parentId), limit: 6, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;
    if (!process.env.OPENAI_API_KEY && !process.env.CHATGPT_API_KEY) {
      return NextResponse.json({ error: "AI image generation is not configured" }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const style = String(formData.get("style") ?? "cartoon");
    const consent = formData.get("consent") === "true";
    if (!consent) return NextResponse.json({ error: "Parent consent is required" }, { status: 400 });
    if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ error: "Choose a photo first" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Photo must be 10 MB or smaller" }, { status: 413 });
    if (file.type && !ACCEPTED.has(file.type.toLowerCase())) return NextResponse.json({ error: "Use a JPG, PNG, WebP, HEIC, or AVIF photo" }, { status: 415 });
    if (!STYLES[style]) return NextResponse.json({ error: "Unknown avatar style" }, { status: 400 });

    let source: Buffer;
    try {
      source = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error" })
        .rotate()
        .resize(1024, 1024, { fit: "cover", position: "attention" })
        .png()
        .toBuffer();
    } catch {
      return NextResponse.json({ error: "Could not read that photo" }, { status: 400 });
    }

    const response = await client.images.edit({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-sunburst",
      image: await toFile(source, "avatar-source.png", { type: "image/png" }),
      prompt: `Transform the person in this reference photo into an original ${STYLES[style]}. Preserve the person's recognizable facial features, skin tone, hair texture, hair color, approximate age, and joyful personality. Create a centered head-and-shoulders avatar facing the viewer, simple colorful background, balanced square composition, wholesome family-friendly mood. Keep the character cute and natural, not uncanny. No text, logos, watermark, extra people, duplicate features, or photorealism.`,
      input_fidelity: "high",
      n: 3,
      size: "1024x1024",
      quality: "medium",
      output_format: "webp",
      output_compression: 82,
      user: String(parentId),
    });

    const avatarDir = uploadPath("avatars", String(householdId));
    if (!avatarDir) return NextResponse.json({ error: "Invalid upload destination" }, { status: 500 });
    await mkdir(avatarDir, { recursive: true });
    const avatars: string[] = [];
    for (const item of response.data ?? []) {
      if (!item.b64_json) continue;
      const filename = `${Date.now()}-${randomBytes(8).toString("hex")}.webp`;
      const destination = uploadPath("avatars", String(householdId), filename);
      if (!destination) continue;
      await writeFile(destination, Buffer.from(item.b64_json, "base64"));
      avatars.push(`/uploads/avatars/${householdId}/${filename}`);
    }
    if (!avatars.length) return NextResponse.json({ error: "The AI did not return an avatar. Please try another photo." }, { status: 502 });
    return NextResponse.json({ avatars });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[API member avatar]", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not generate avatars right now" }, { status: 500 });
  }
}
