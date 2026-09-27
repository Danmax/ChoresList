import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
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

const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta2/interactions";

class GeminiAvatarError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function contentImageData(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const response = value as { steps?: unknown[] };
  return (response.steps ?? []).flatMap((step) => {
    if (!step || typeof step !== "object") return [];
    const content = (step as { content?: unknown }).content;
    if (!Array.isArray(content)) return [];
    return content.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const image = item as { type?: unknown; data?: unknown; inline_data?: { data?: unknown }; inlineData?: { data?: unknown } };
      if (image.type !== "image") return [];
      const data = typeof image.data === "string" ? image.data : image.inline_data?.data ?? image.inlineData?.data;
      return typeof data === "string" ? [data] : [];
    });
  });
}

async function generateGeminiAvatar(source: Buffer, style: string, variation: number) {
  const response = await fetch(GEMINI_INTERACTIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
    },
    body: JSON.stringify({
      model: GEMINI_IMAGE_MODEL,
      store: false,
      input: [
        { type: "text", text: `Transform the person in this reference photo into an original ${STYLES[style]}. Preserve the person's recognizable facial features, skin tone, hair texture, hair color, approximate age, and joyful personality. Create a centered head-and-shoulders avatar facing the viewer, simple colorful background, balanced square composition, wholesome family-friendly mood. Keep the character cute and natural, not uncanny. No text, logos, watermark, extra people, duplicate features, or photorealism. Create variation ${variation} with a distinct pose or background while preserving the person.` },
        { type: "image", mime_type: "image/jpeg", data: source.toString("base64") },
      ],
      response_format: [{ type: "image" }],
    }),
    signal: AbortSignal.timeout(110_000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload
      ? String((payload as { error?: { message?: unknown } }).error?.message ?? "Gemini image generation failed")
      : "Gemini image generation failed";
    throw new GeminiAvatarError(response.status, message);
  }
  const images = contentImageData(payload);
  if (!images.length) throw new GeminiAvatarError(502, "Gemini did not return an image");
  return images;
}

function avatarGenerationError(error: unknown) {
  if (!(error instanceof GeminiAvatarError)) return null;
  console.error("[API member avatar] Gemini request failed", { status: error.status, message: error.message });
  if (error.status === 401 || error.status === 403) {
    return NextResponse.json({ error: "Avatar generation is not enabled for this Gemini API key" }, { status: 502 });
  }
  if (error.status === 429) {
    return NextResponse.json({ error: "Avatar generation is busy or has reached its limit. Please try again shortly." }, { status: 503 });
  }
  if (error.status === 400) {
    return NextResponse.json({ error: "Gemini could not process this photo. Try a different clear photo." }, { status: 422 });
  }
  return NextResponse.json({ error: "The avatar service is temporarily unavailable. Please try again shortly." }, { status: 502 });
}

export async function POST(req: NextRequest) {
  try {
    const { householdId, parentId } = await requireParentSession(req);
    const limited = rateLimit(req, { key: "member-avatar-generate", bucket: String(parentId), limit: 6, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini image generation is not configured" }, { status: 503 });
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
        .resize(1024, 1024, { fit: "cover", position: "attention", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 88, chromaSubsampling: "4:2:0", mozjpeg: true })
        .toBuffer();
    } catch {
      return NextResponse.json({ error: "Could not read that photo" }, { status: 400 });
    }

    let generatedImages: string[];
    try {
      generatedImages = (await Promise.all([1, 2, 3].map((variation) => generateGeminiAvatar(source, style, variation)))).flat().slice(0, 3);
    } catch (error) {
      return avatarGenerationError(error) ?? NextResponse.json({ error: "The avatar service is temporarily unavailable. Please try again shortly." }, { status: 502 });
    }

    const avatarDir = uploadPath("avatars", String(householdId));
    if (!avatarDir) return NextResponse.json({ error: "Invalid upload destination" }, { status: 500 });
    await mkdir(avatarDir, { recursive: true });
    const avatars: string[] = [];
    for (const image of generatedImages) {
      const filename = `${Date.now()}-${randomBytes(8).toString("hex")}.webp`;
      const destination = uploadPath("avatars", String(householdId), filename);
      if (!destination) continue;
      const optimizedAvatar = await sharp(Buffer.from(image, "base64"))
        .resize(1024, 1024, { fit: "cover", position: "attention" })
        .webp({ quality: 82 })
        .toBuffer();
      await writeFile(destination, optimizedAvatar);
      avatars.push(`/uploads/avatars/${householdId}/${filename}`);
    }
    if (!avatars.length) return NextResponse.json({ error: "The AI did not return an avatar. Please try another photo." }, { status: 502 });
    return NextResponse.json({ avatars });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[API member avatar]", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not save the generated avatars. Please try again." }, { status: 500 });
  }
}
