/**
 * Shared anti-abuse gate used by write-action API routes.
 *
 * Performs, in order:
 *  1. Blacklist check for IP
 *  2. Blacklist check for device fingerprint (if present)
 *  3. Blacklist check for userId (if provided)
 *  4. Rate-limit check (graylist-aware)
 *  5. Violation recording when the rate limit is exceeded
 *
 * Returns a NextResponse with the appropriate error if the request should be
 * rejected, or `null` if the request is allowed to proceed.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isBlacklisted,
  isGraylisted,
  recordViolation,
  getClientIp,
  getFingerprint,
  BlacklistType,
} from "@/lib/blacklist";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export interface AbuseGateOptions {
  /** Rate-limit action key (e.g. "post", "reply", "like") */
  action: string;
  /** Authenticated user ID, if available */
  userId?: string;
  /** Incoming request (used to extract IP / fingerprint) */
  req: NextRequest;
}

export async function abuseGate(
  opts: AbuseGateOptions,
): Promise<NextResponse | null> {
  const { action, userId, req } = opts;
  const ip = getClientIp(req.headers);
  const fp = getFingerprint(req.headers);

  // ── 1. IP blacklist check ──────────────────────────────────────────────────
  if (ip !== "unknown" && (await isBlacklisted(BlacklistType.IP, ip))) {
    return NextResponse.json(
      { error: "您的访问已被限制，请联系管理员" },
      { status: 403 },
    );
  }

  // ── 2. Fingerprint blacklist check ─────────────────────────────────────────
  if (fp && (await isBlacklisted(BlacklistType.FINGERPRINT, fp))) {
    return NextResponse.json(
      { error: "您的访问已被限制，请联系管理员" },
      { status: 403 },
    );
  }

  // ── 3. User blacklist check ────────────────────────────────────────────────
  if (userId && (await isBlacklisted(BlacklistType.USER_ID, userId))) {
    return NextResponse.json(
      { error: "您的账号已被限制，请联系管理员" },
      { status: 403 },
    );
  }

  // ── 4. Determine graylist status ──────────────────────────────────────────
  const graylisted =
    (ip !== "unknown" && (await isGraylisted(BlacklistType.IP, ip))) ||
    (fp !== null && (await isGraylisted(BlacklistType.FINGERPRINT, fp))) ||
    (userId !== undefined &&
      (await isGraylisted(BlacklistType.USER_ID, userId)));

  // ── 5. Rate limit (keyed on userId when available, otherwise IP) ──────────
  const rlKey = userId ?? ip;
  const result = checkRateLimit(action, rlKey, graylisted);

  if (!result.allowed) {
    // Record the violation so repeated offenders get auto-graylisted
    if (userId) {
      await recordViolation(BlacklistType.USER_ID, userId);
    }
    if (ip !== "unknown") {
      await recordViolation(BlacklistType.IP, ip);
    }

    return NextResponse.json(
      { error: "操作太频繁，请稍后再试" },
      {
        status: 429,
        headers: rateLimitHeaders(result, action),
      },
    );
  }

  return null; // allowed
}
