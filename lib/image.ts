import sharp from "sharp";

const TARGET_BYTES = 500 * 1024;
const MAX_DIMENSION = 1920;
const QUALITY_STEPS = [82, 72, 62, 52, 42];
const FALLBACK_DIMENSIONS = [1600, 1280, 1024, 800, 640];

export type OptimizedImage = {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
};

export async function optimizeToWebp(input: Buffer): Promise<OptimizedImage> {
  let pipeline = sharp(input, { failOn: "error" }).rotate();
  const meta = await pipeline.metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Unsupported image");
  }

  for (const quality of QUALITY_STEPS) {
    const out = await sharp(input)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    if (out.data.length <= TARGET_BYTES) {
      return { buffer: out.data, width: out.info.width, height: out.info.height, size: out.data.length };
    }
  }

  for (const dim of FALLBACK_DIMENSIONS) {
    const out = await sharp(input)
      .rotate()
      .resize({ width: dim, height: dim, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 60, effort: 5 })
      .toBuffer({ resolveWithObject: true });
    if (out.data.length <= TARGET_BYTES) {
      return { buffer: out.data, width: out.info.width, height: out.info.height, size: out.data.length };
    }
  }

  const final = await sharp(input)
    .rotate()
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 40, effort: 5 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: final.data, width: final.info.width, height: final.info.height, size: final.data.length };
}
