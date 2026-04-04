/**
 * In-memory sliding-window rate limiter.
 *
 * Each action has its own per-identifier quota.
 * Identifiers are userId (preferred) or IP address.
 * A process-level Map stores timestamps; works correctly
 * for single-node deployments (swap for Redis for multi-node).
 */

export type RateLimitAction =
  | "post"      // 5 per hour per user
  | "reply"     // 20 per hour per user
  | "comment"   // 30 per hour per user
  | "like"      // 100 per hour per user
  | "view"      // 30 per 10 minutes per IP  (anti view-flooding)
  | "register"; // 3 per hour per IP

interface Bucket {
  timestamps: number[];
  violations: number; // consecutive denials in current window
}

const buckets = new Map<string, Bucket>();

const LIMITS: Record<RateLimitAction, { max: number; windowMs: number }> = {
  post:     { max: 5,   windowMs: 60 * 60 * 1000 },
  reply:    { max: 20,  windowMs: 60 * 60 * 1000 },
  comment:  { max: 30,  windowMs: 60 * 60 * 1000 },
  like:     { max: 100, windowMs: 60 * 60 * 1000 },
  view:     { max: 30,  windowMs: 10 * 60 * 1000 },
  register: { max: 3,   windowMs: 60 * 60 * 1000 },
};

/** After this many consecutive violations the identifier gets auto-graylisted. */
export const VIOLATION_GRAYLIST_THRESHOLD = 5;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;   // Unix-ms when the oldest timestamp expires
  violations: number; // consecutive denials so far
}

export function checkRateLimit(
  action: RateLimitAction,
  identifier: string
): RateLimitResult {
  const key = `${action}:${identifier}`;
  const { max, windowMs } = LIMITS[action];
  const now = Date.now();

  if (!buckets.has(key)) {
    buckets.set(key, { timestamps: [], violations: 0 });
  }
  const bucket = buckets.get(key)!;

  // Slide: drop timestamps older than the window
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

  const allowed = bucket.timestamps.length < max;
  if (allowed) {
    bucket.timestamps.push(now);
    bucket.violations = 0;
  } else {
    bucket.violations += 1;
  }

  const oldest = bucket.timestamps[0] ?? now;
  const resetAt = oldest + windowMs;
  const remaining = Math.max(0, max - bucket.timestamps.length);

  return { allowed, remaining, resetAt, violations: bucket.violations };
}

// Periodically sweep stale buckets to prevent unbounded memory growth.
const MAX_WINDOW_MS = Math.max(...Object.values(LIMITS).map((l) => l.windowMs));
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    const last = bucket.timestamps[bucket.timestamps.length - 1] ?? 0;
    if (now - last > MAX_WINDOW_MS) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000);
