import { NextRequest } from "next/server";

const LOOPBACK = new Set(["0.0.0.0", "127.0.0.1", "localhost", "::1", "[::1]"]);

function isInternalHost(host: string) {
  const bare = host.split(":")[0]!;
  return LOOPBACK.has(bare);
}

function fromForwardedHeaders(req: NextRequest): string | null {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (proto && host && !isInternalHost(host)) {
    return `${proto}://${host}`;
  }
  return null;
}

function fromHostHeader(req: NextRequest): string | null {
  const host = req.headers.get("host")?.trim();
  if (!host || isInternalHost(host)) return null;
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}

export function getBaseUrl(req: NextRequest): string {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const forwarded = fromForwardedHeaders(req);
  if (forwarded) return forwarded;

  const hostHeader = fromHostHeader(req);
  if (hostHeader) return hostHeader;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PUBLIC_BASE_URL is not set and no usable Host / X-Forwarded-Host header was found"
    );
  }
  return new URL(req.url).origin;
}
