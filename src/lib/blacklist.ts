/**
 * DB-backed blacklist with a 5-minute in-process cache.
 *
 * Three entry types: IP, USER_ID, FINGERPRINT.
 * Two levels:
 *   BLACK – request immediately rejected (403).
 *   GRAY  – request allowed but treated with extra scrutiny (or future CAPTCHA).
 *
 * autoGraylist() is called by abuse-gate after repeated rate-limit violations.
 */

import { prisma } from "@/lib/prisma";
import { BlacklistType, BlacklistLevel } from "@prisma/client";

export type { BlacklistType, BlacklistLevel };

interface CacheEntry {
  level: BlacklistLevel | null; // null = not listed
  expiresAt: number | null;     // ms, null = permanent
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

function cacheKey(key: string, type: BlacklistType): string {
  return `${type}:${key}`;
}

/** Return the blacklist level for this key, or null if not listed (or entry expired). */
export async function getBlacklistLevel(
  key: string,
  type: BlacklistType
): Promise<BlacklistLevel | null> {
  const ck = cacheKey(key, type);
  const cached = cache.get(ck);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    // Honour per-entry expiry even when the cache is warm
    if (cached.level !== null && cached.expiresAt !== null && now > cached.expiresAt) {
      return null;
    }
    return cached.level;
  }

  const entry = await prisma.blacklistEntry.findUnique({
    where: { key_type: { key, type } },
  });

  let level: BlacklistLevel | null = null;
  let expiresAt: number | null = null;

  if (entry) {
    expiresAt = entry.expiresAt ? entry.expiresAt.getTime() : null;
    if (expiresAt === null || expiresAt > now) {
      level = entry.level;
    }
  }

  cache.set(ck, { level, expiresAt, fetchedAt: now });
  return level;
}

export async function isBlocked(key: string, type: BlacklistType): Promise<boolean> {
  return (await getBlacklistLevel(key, type)) === "BLACK";
}

export async function isGraylisted(key: string, type: BlacklistType): Promise<boolean> {
  return (await getBlacklistLevel(key, type)) === "GRAY";
}

/** Add or update an entry.  Invalidates the local cache immediately. */
export async function addToBlacklist(
  key: string,
  type: BlacklistType,
  level: BlacklistLevel,
  reason?: string,
  expiresAt?: Date
): Promise<void> {
  await prisma.blacklistEntry.upsert({
    where: { key_type: { key, type } },
    update: { level, reason: reason ?? null, expiresAt: expiresAt ?? null },
    create: { key, type, level, reason: reason ?? null, expiresAt: expiresAt ?? null },
  });
  cache.delete(cacheKey(key, type));
}

/** Remove an entry.  Invalidates the local cache immediately. */
export async function removeFromBlacklist(
  key: string,
  type: BlacklistType
): Promise<void> {
  await prisma.blacklistEntry.deleteMany({ where: { key, type } });
  cache.delete(cacheKey(key, type));
}

/**
 * Auto-graylist an identifier after repeated abuse.
 * Expires after 24 hours.  Skips if already listed at any level.
 */
export async function autoGraylist(
  key: string,
  type: BlacklistType,
  reason: string
): Promise<void> {
  const existing = await getBlacklistLevel(key, type);
  if (existing) return; // do not downgrade BLACK → GRAY

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await addToBlacklist(key, type, "GRAY", reason, expiresAt);
}
