/**
 * Abuse gate — single entry-point for every write API route.
 *
 * Checks (in order):
 *   1. IP blacklist
 *   2. User-ID blacklist  (if userId provided)
 *   3. Device fingerprint blacklist  (if __fp cookie present)
 *   4. Sliding-window rate limit  (keyed by userId or IP)
 *      → auto-graylists identifier after VIOLATION_GRAYLIST_THRESHOLD consecutive denials
 *
 * Usage:
 *   const gate = await checkAbuse({ action: "post", userId, req });
 *   if (gate.blocked) return gate.response!;
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  RateLimitAction,
  VIOLATION_GRAYLIST_THRESHOLD,
} from "./rate-limit";
import { isBlocked, autoGraylist } from "./blacklist";
import { BlacklistType } from "@prisma/client";

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function getFingerprint(req: NextRequest): string | null {
  return (
    req.headers.get("x-fp") ??
    req.cookies.get("__fp")?.value ??
    null
  );
}

export interface AbuseCheckOptions {
  action: RateLimitAction;
  userId?: string;
  req: NextRequest;
}

export interface AbuseCheckResult {
  blocked: boolean;
  reason?: string;
  response?: NextResponse;
}

export async function checkAbuse({
  action,
  userId,
  req,
}: AbuseCheckOptions): Promise<AbuseCheckResult> {
  const ip = getClientIp(req);
  const fp = getFingerprint(req);

  // 1. IP blacklist
  if (ip !== "unknown" && (await isBlocked(ip, "IP" as BlacklistType))) {
    return {
      blocked: true,
      reason: "ip_blocked",
      response: NextResponse.json({ error: "您的IP已被封禁" }, { status: 403 }),
    };
  }

  // 2. User blacklist
  if (userId && (await isBlocked(userId, "USER_ID" as BlacklistType))) {
    return {
      blocked: true,
      reason: "user_blocked",
      response: NextResponse.json({ error: "您的账号已被封禁" }, { status: 403 }),
    };
  }

  // 3. Device fingerprint blacklist
  if (fp && (await isBlocked(fp, "FINGERPRINT" as BlacklistType))) {
    return {
      blocked: true,
      reason: "fp_blocked",
      response: NextResponse.json({ error: "该设备已被封禁" }, { status: 403 }),
    };
  }

  // 4. Rate limit  (prefer userId so shared IPs/NAT are handled fairly)
  const rateLimitKey = userId ?? ip;
  const result = checkRateLimit(action, rateLimitKey);

  if (!result.allowed) {
    // Auto-graylist identifiers that repeatedly violate limits
    if (result.violations >= VIOLATION_GRAYLIST_THRESHOLD) {
      const reason = `rate_limit_abuse:${action}`;
      if (userId) {
        await autoGraylist(userId, "USER_ID" as BlacklistType, reason);
      }
      if (ip !== "unknown") {
        await autoGraylist(ip, "IP" as BlacklistType, reason);
      }
      if (fp) {
        await autoGraylist(fp, "FINGERPRINT" as BlacklistType, reason);
      }
    }

    const retryAfterSec = Math.max(
      1,
      Math.ceil((result.resetAt - Date.now()) / 1000)
    );
    return {
      blocked: true,
      reason: "rate_limited",
      response: NextResponse.json(
        { error: "操作太频繁，请稍后再试", retryAfter: retryAfterSec },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      ),
    };
  }

  return { blocked: false };
}
