import path from "path";

const defaultUploadsRoot = process.env.NODE_ENV === "production"
  ? path.resolve(/* turbopackIgnore: true */ process.cwd(), "..", "chores-uploads")
  : path.resolve(/* turbopackIgnore: true */ process.cwd(), "storage", "uploads");

export const UPLOADS_ROOT = path.resolve(process.env.UPLOADS_DIR || defaultUploadsRoot);

export function uploadPath(...segments: string[]) {
  const filePath = path.resolve(UPLOADS_ROOT, ...segments);
  return filePath.startsWith(UPLOADS_ROOT + path.sep) ? filePath : null;
}

export function uploadContentType(filePath: string) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".avif": return "image/avif";
    case ".gif": return "image/gif";
    case ".jpeg":
    case ".jpg": return "image/jpeg";
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    default: return null;
  }
}
