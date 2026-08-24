import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };
const globalBuckets = globalThis as typeof globalThis & { __ctrlbRateBuckets?: Map<string, Bucket> };
const buckets = globalBuckets.__ctrlbRateBuckets ?? new Map<string, Bucket>();
globalBuckets.__ctrlbRateBuckets = buckets;

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return; // Some same-site/browser and platform requests may omit it.
  const expected = new URL(process.env.APP_URL || request.nextUrl.origin).host;
  if (new URL(origin).host !== expected) throw new Error("Cross-origin request blocked.");
}

export function rateLimit(request: NextRequest, scope: string, limit = Number(process.env.MAX_GENERATIONS_PER_HOUR || 10)) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 3600_000 });
    return;
  }
  if (current.count >= Math.max(1, limit)) throw new Error(`Rate limit reached for this test studio. Try again after ${new Date(current.resetAt).toLocaleTimeString()}.`);
  current.count += 1;
}
