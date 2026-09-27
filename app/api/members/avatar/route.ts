import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import OpenAI from "openai";
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
const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const OPENAI_AVATAR_IMAGE_MODEL = process.env.OPENAI_AVATAR_IMAGE_MODEL ?? "gpt-image-1";
const openai = new OpenAI({ apiKey: process.env.CHATGPT_API_KEY ?? "" });

function avatarPrompt(style: string, variation: number) {
  return `Transform the one person in this reference photo into an original ${STYLES[style]}. Preserve this person's recognizable facial features, skin tone, hair texture, hair color, approximate age, and joyful personality. Generate exactly ONE standalone centered head-and-shoulders avatar facing the viewer, with a simple colorful background and a wholesome family-friendly mood. This output must contain one person only: no group portrait, no side-by-side options, no collage, no split panels, no duplicate person, no extra faces, hands, or bodies. Keep the character cute and natural, not uncanny. No text, logos, watermarks, or photorealism. This is variation ${variation}; vary only the pose or background while keeping the same single person.`;
}

class GeminiAvatarError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function contentImageData(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const response = value as {
    output_image?: { data?: unknown };
    outputImage?: { data?: unknown };
    steps?: unknown[];
  };
  const outputImage = response.output_image?.data ?? response.outputImage?.data;
  const stepImages = (response.steps ?? []).flatMap((step) => {
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
  return [...(typeof outputImage === "string" ? [outputImage] : []), ...stepImages];
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
        { type: "text", text: avatarPrompt(style, variation) },
        { type: "image", mime_type: "image/jpeg", data: source.toString("base64") },
      ],
      response_format: {
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: "1:1",
        image_size: "1K",
      },
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

async function generateOpenAiAvatars(source: Buffer, style: string, parentId: string) {
  const response = await openai.images.edit({
    model: OPENAI_AVATAR_IMAGE_MODEL,
    image: new File([new Uint8Array(source)], "avatar-source.jpg", { type: "image/jpeg" }),
    // `n: 3` returns three separate image files. The prompt deliberately describes
    // one output so the model does not turn the requested choices into a group shot.
    prompt: avatarPrompt(style, 1),
    n: 3,
    size: "1024x1024",
    quality: "low",
    background: "opaque",
    output_format: "webp",
    output_compression: 82,
    input_fidelity: "high",
    user: parentId,
  });
  return (response.data ?? []).flatMap((image) => typeof image.b64_json === "string" ? [image.b64_json] : []);
}

function avatarGenerationError(error: unknown) {
  if (!(error instanceof GeminiAvatarError)) return null;
  console.error("[API member avatar] Gemini request failed", { status: error.status, message: error.message });
  if (error.status === 401 || error.status === 403) {
    return NextResponse.json({ error: "Avatar generation is not enabled for this Gemini API key" }, { status: 502 });
  }
  if (error.status === 429) {
    return NextResponse.json({
      error: "Avatar generation is unavailable for this Gemini API key because its image-generation quota is exhausted or not enabled. Add billing or use a key with Gemini image-generation quota, then try again.",
    }, { status: 503 });
  }
  if (error.status === 400) {
    return NextResponse.json({ error: "Gemini could not process this photo. Try a different clear photo." }, { status: 422 });
  }
  return NextResponse.json({ error: "The avatar service is temporarily unavailable. Please try again shortly." }, { status: 502 });
}

function openAiAvatarError(error: unknown) {
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : 0;
  const message = error instanceof Error ? error.message : String(error);
  console.error("[API member avatar] OpenAI request failed", { status, message });
  if (status === 401 || status === 403) {
    return NextResponse.json({ error: "Avatar generation is not enabled for this OpenAI API key" }, { status: 502 });
  }
  if (status === 429) {
    return NextResponse.json({ error: "Avatar generation has reached its OpenAI account limit. Please try again later." }, { status: 503 });
  }
  if (status === 400 || status === 422) {
    return NextResponse.json({ error: "OpenAI could not process this photo. Try a different clear JPG, PNG, or WebP photo." }, { status: 422 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { householdId, parentId } = await requireParentSession(req);
    const limited = rateLimit(req, { key: "member-avatar-generate", bucket: String(parentId), limit: 6, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;
    if (!process.env.CHATGPT_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Avatar generation is not configured" }, { status: 503 });
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

    let generatedImages: string[] = [];
    let openAiError: unknown;
    if (process.env.CHATGPT_API_KEY) {
      try {
        generatedImages = await generateOpenAiAvatars(source, style, parentId);
      } catch (error) {
        openAiError = error;
      }
    }
    if (!generatedImages.length) {
      const results = await Promise.allSettled([1, 2, 3].map((variation) => generateGeminiAvatar(source, style, variation)));
      generatedImages = results
        .filter((result): result is PromiseFulfilledResult<string[]> => result.status === "fulfilled")
        .flatMap((result) => result.value)
        .slice(0, 3);
      if (!generatedImages.length) {
        const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
        return openAiAvatarError(openAiError) ?? avatarGenerationError(failure?.reason) ?? NextResponse.json({ error: "The avatar service is temporarily unavailable. Please try again shortly." }, { status: 502 });
      }
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
