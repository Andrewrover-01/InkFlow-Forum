/**
 * In-memory sliding-window rate limiter.
 *
 * Suitable for single-server deployments. For multi-instance production
 * environments, replace the in-memory store with a Redis backend.
 */

interface RateLimitConfig {
  /** Length of the time window in milliseconds */
  windowMs: number;
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
}

/** Default limits per action */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  post:     { windowMs: 60 * 60 * 1000, maxRequests: 5  },  // 5 posts / hour
  reply:    { windowMs: 60 * 60 * 1000, maxRequests: 30 },  // 30 replies / hour
  comment:  { windowMs: 60 * 60 * 1000, maxRequests: 30 },  // 30 comments / hour
  like:     { windowMs: 60 * 1000,      maxRequests: 30 },  // 30 likes / minute
  view:     { windowMs: 60 * 1000,      maxRequests: 10 },  // 10 view-count bumps / minute (per IP)
  register: { windowMs: 60 * 60 * 1000, maxRequests: 3  },  // 3 registrations / hour (per IP)
};

/** Tighter limits applied to gray-listed identifiers (half the normal quota) */
const GRAY_MULTIPLIER = 0.5;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms when the oldest request in the window expires
}

// --- In-memory store ---
// key: "<action>:<identifier>" → sorted array of request timestamps (ms)
const store = new Map<string, number[]>();

// Periodically purge stale entries to prevent unbounded memory growth.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes
let lastCleanup = Date.now();

function maybeCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const maxWindow = Math.max(...Object.values(RATE_LIMITS).map((c) => c.windowMs));
  for (const [key, timestamps] of store.entries()) {
    const fresh = timestamps.filter((t) => now - t < maxWindow);
    if (fresh.length === 0) {
      store.delete(key);
    } else {
      store.set(key, fresh);
    }
  }
}

/**
 * Check and record a rate-limit event.
 *
 * @param action   One of the keys in RATE_LIMITS (e.g. "post", "like")
 * @param identifier  A stable key for the caller, e.g. userId or IP address
 * @param isGraylisted  Whether the identifier is on the graylist (stricter limits)
 */
export function checkRateLimit(
  action: string,
  identifier: string,
  isGraylisted = false,
): RateLimitResult {
  maybeCleanup();

  const config = RATE_LIMITS[action];
  if (!config) {
    // Unknown action — allow by default
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }

  const maxRequests = isGraylisted
    ? Math.max(1, Math.floor(config.maxRequests * GRAY_MULTIPLIER))
    : config.maxRequests;

  const key = `${action}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const raw = store.get(key) ?? [];
  const recent = raw.filter((t) => t > windowStart);

  if (recent.length >= maxRequests) {
    // Rate limit exceeded — do NOT record this attempt
    const resetAt = recent[0] + config.windowMs;
    return { allowed: false, remaining: 0, resetAt };
  }

  // Record the request
  recent.push(now);
  store.set(key, recent);

  return {
    allowed: true,
    remaining: maxRequests - recent.length,
    resetAt: recent[0] + config.windowMs,
  };
}

/**
 * Build standard rate-limit response headers.
 */
export function rateLimitHeaders(result: RateLimitResult, action: string): Record<string, string> {
  const config = RATE_LIMITS[action];
  const limit = config?.maxRequests ?? 0;
  return {
    "X-RateLimit-Limit":     String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset":     String(Math.ceil(result.resetAt / 1000)),
    "Retry-After":           String(Math.ceil((result.resetAt - Date.now()) / 1000)),
  };
}
