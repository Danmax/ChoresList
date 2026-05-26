import { NextRequest, NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  bucket?: string;
};

export function rateLimit(req: NextRequest, opts: RateLimitOptions): NextResponse | null {
  const bucketId = opts.bucket ?? clientIp(req);
  const id = `${opts.key}:${bucketId}`;
  const now = Date.now();

  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  }

  const existing = buckets.get(id);
  if (!existing || existing.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  existing.count += 1;
  if (existing.count > opts.limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  return null;
}
