// In-memory sliding-window limiter, keyed per caller (e.g. by IP).
// Single-instance deployment only (matches the SQLite constraint already
// documented for this app) — a multi-instance deploy would need a shared
// store instead.
const buckets = new Map<string, Map<string, number[]>>();

export function isRateLimited(
  bucket: string,
  key: string,
  windowMs: number,
  maxRequests: number,
): boolean {
  const hits = buckets.get(bucket) || new Map<string, number[]>();
  buckets.set(bucket, hits);
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    Array.from(hits.entries()).forEach(([k, times]) => {
      if (!times.some((t) => now - t < windowMs)) hits.delete(k);
    });
  }
  return recent.length > maxRequests;
}

export function clientKey(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
