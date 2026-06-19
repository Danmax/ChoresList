import { NextRequest } from "next/server";

const LOOPBACK = new Set(["0.0.0.0", "127.0.0.1", "localhost", "::1"]);

function hostnameFromHost(host: string) {
  const trimmed = host.trim().toLowerCase();
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    return end > 0 ? trimmed.slice(1, end) : trimmed;
  }
  return trimmed.split(":")[0] ?? "";
}

function isInternalHost(host: string) {
  return LOOPBACK.has(hostnameFromHost(host));
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

function fromRequestUrl(req: NextRequest): string | null {
  const url = new URL(req.url);
  if (!isInternalHost(url.host)) return url.origin;
  if (process.env.NODE_ENV === "production") return null;

  url.protocol = "http:";
  url.hostname = "localhost";
  return url.origin;
}

export function getBaseUrl(req: NextRequest): string {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim();
  if (fromEnv) {
    const url = new URL(fromEnv);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error("PUBLIC_BASE_URL must be an HTTP(S) URL without credentials, a query, or a fragment");
    }
    return url.toString().replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("PUBLIC_BASE_URL is required in production");
  }

  const forwarded = fromForwardedHeaders(req);
  if (forwarded) return forwarded;

  const hostHeader = fromHostHeader(req);
  if (hostHeader) return hostHeader;

  return fromRequestUrl(req) ?? "http://localhost:3000";
}
