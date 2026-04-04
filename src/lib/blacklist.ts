/**
 * Blacklist / graylist utilities.
 *
 * Entries are stored in the `blacklist_entries` Postgres table via Prisma and
 * cached in memory for a short TTL to avoid hitting the database on every
 * request.
 */

import { prisma } from "@/lib/prisma";
import { BlacklistType, BlacklistLevel } from "@prisma/client";

export { BlacklistType, BlacklistLevel };

// ── In-memory cache ───────────────────────────────────────────────────────────

interface CacheEntry {
  level: BlacklistLevel | null; // null means "not listed"
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

function cacheKey(type: BlacklistType, value: string): string {
  return `${type}:${value}`;
}

/** Invalidate a single cache entry (after a write). */
export function invalidateCache(type: BlacklistType, value: string): void {
  cache.delete(cacheKey(type, value));
}

// ── Violation tracking (auto-graylist) ───────────────────────────────────────

// key: "<type>:<value>" → array of violation timestamps
const violationLog = new Map<string, number[]>();

const VIOLATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const AUTO_GRAYLIST_THRESHOLD = 5; // violations within the window

/**
 * Record a rate-limit violation for the given identifier.
 * Automatically promotes the identifier to the graylist once the threshold
 * is reached (unless they are already black-listed).
 */
export async function recordViolation(
  type: BlacklistType,
  value: string,
): Promise<void> {
  const key = cacheKey(type, value);
  const now = Date.now();
  const windowStart = now - VIOLATION_WINDOW_MS;

  const timestamps = (violationLog.get(key) ?? []).filter(
    (t) => t > windowStart,
  );
  timestamps.push(now);
  violationLog.set(key, timestamps);

  if (timestamps.length >= AUTO_GRAYLIST_THRESHOLD) {
    // Auto-graylist (skip if already black-listed)
    try {
      const existing = await prisma.blacklistEntry.findUnique({
        where: { type_value: { type, value } },
        select: { level: true },
      });
      if (!existing) {
        await prisma.blacklistEntry.create({
          data: {
            type,
            value,
            level: BlacklistLevel.GRAY,
            reason: "系统自动：触发频率限制阈值",
          },
        });
        invalidateCache(type, value);
      }
      // Reset violation log so we don't re-trigger repeatedly
      violationLog.delete(key);
    } catch {
      // Best-effort — don't let DB errors break the request flow
    }
  }
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

async function fetchLevel(
  type: BlacklistType,
  value: string,
): Promise<BlacklistLevel | null> {
  const key = cacheKey(type, value);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.level;
  }

  try {
    const entry = await prisma.blacklistEntry.findUnique({
      where: { type_value: { type, value } },
      select: { level: true, expiresAt: true },
    });

    let level: BlacklistLevel | null = null;
    if (entry) {
      if (!entry.expiresAt || entry.expiresAt > new Date()) {
        level = entry.level;
      } else {
        // Expired entry — clean it up asynchronously
        prisma.blacklistEntry
          .delete({ where: { type_value: { type, value } } })
          .catch(() => {});
      }
    }

    cache.set(key, { level, fetchedAt: Date.now() });
    return level;
  } catch {
    return null; // Fail open on DB errors
  }
}

/**
 * Returns true if the identifier is BLACK-listed (should be blocked entirely).
 */
export async function isBlacklisted(
  type: BlacklistType,
  value: string,
): Promise<boolean> {
  const level = await fetchLevel(type, value);
  return level === BlacklistLevel.BLACK;
}

/**
 * Returns true if the identifier is GRAY-listed (reduced rate-limit quotas).
 */
export async function isGraylisted(
  type: BlacklistType,
  value: string,
): Promise<boolean> {
  const level = await fetchLevel(type, value);
  return level === BlacklistLevel.GRAY;
}

// ── IP helper ─────────────────────────────────────────────────────────────────

/**
 * Extract the best-effort client IP from the `x-forwarded-for` or
 * `x-real-ip` headers.  Falls back to "unknown".
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "unknown";
}

/**
 * Extract the device fingerprint from the `x-fingerprint` header or the
 * `__fp` cookie value.
 */
export function getFingerprint(headers: Headers): string | null {
  const fromHeader = headers.get("x-fingerprint");
  if (fromHeader) return fromHeader;

  const cookie = headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)__fp=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
