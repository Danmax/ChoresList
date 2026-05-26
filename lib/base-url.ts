import { NextRequest } from "next/server";

export function getBaseUrl(req: NextRequest): string {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error("PUBLIC_BASE_URL is required in production");
  }

  return new URL(req.url).origin;
}
