/**
 * Self-hosted CAPTCHA utilities.
 *
 * Challenge tokens are HMAC-signed JWS-like structures.  No external service
 * or database is required — the signed payload carries everything needed to
 * verify the response on the server side.
 *
 * Challenge types
 * ───────────────
 * invisible  Regular users.  The client widget auto-resolves after a short
 *            human-interaction delay; no visible UI friction.
 * slider     Graylisted users and all registrations.  The user must drag a
 *            handle to a highlighted target zone.
 */

import crypto from "crypto";

// Key for HMAC signing.  Falls back to a dev default so the app still works
// without NEXTAUTH_SECRET configured locally (build / tests).
const SECRET =
  process.env.NEXTAUTH_SECRET ?? "inkflow-captcha-fallback-dev-key";

const TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export type CaptchaType = "invisible" | "slider";

interface ChallengePayload {
  /** Action this challenge was issued for ("register", "post", "reply", …) */
  action: string;
  type: CaptchaType;
  /**
   * Slider target position (0-100 percentage along the track).
   * 0 for invisible challenges (unused).
   */
  target: number;
  /** Random nonce preventing trivial replay within the same second */
  nonce: string;
  /** Issued-at timestamp in milliseconds */
  iat: number;
  /** Expiry timestamp in milliseconds */
  exp: number;
}

function hmac(data: string): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
}

export interface ChallengeResult {
  /** Signed token to send to the client */
  token: string;
  type: CaptchaType;
  /**
   * Where the target zone is centred (0-100).
   * Sent to the client so the slider can render the highlight.
   */
  targetPercent: number;
}

/**
 * Create a new signed challenge token.
 *
 * @param action    The action this challenge covers.
 * @param type      "invisible" or "slider".
 */
export function generateChallenge(
  action: string,
  type: CaptchaType,
): ChallengeResult {
  const now = Date.now();
  // Slider target: random position between 25 % and 75 % of the track width
  const target =
    type === "slider" ? Math.floor(Math.random() * 51) + 25 : 0;

  const payload: ChallengePayload = {
    action,
    type,
    target,
    nonce: crypto.randomBytes(8).toString("hex"),
    iat: now,
    exp: now + TOKEN_EXPIRY_MS,
  };

  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = hmac(data);

  return {
    token: `${data}.${sig}`,
    type,
    targetPercent: target,
  };
}

export interface CaptchaVerifyResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify a captcha token submitted with a form.
 *
 * @param token           The signed challenge token from the request body.
 * @param action          Expected action (must match the token's action field).
 * @param answer          Slider answer (0-100).  Required for "slider" tokens.
 */
export function verifyCaptchaToken(
  token: string | undefined | null,
  action: string,
  answer?: number,
): CaptchaVerifyResult {
  // ── Dev / test bypass ─────────────────────────────────────────────────────
  const bypassToken = process.env.CAPTCHA_BYPASS_TOKEN;
  if (bypassToken && token === bypassToken) {
    return { valid: true };
  }

  if (!token) {
    return { valid: false, error: "请先完成安全验证" };
  }

  // ── Structural check ───────────────────────────────────────────────────────
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx < 1) {
    return { valid: false, error: "验证信息格式错误" };
  }

  const data = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);

  // ── Signature ─────────────────────────────────────────────────────────────
  if (hmac(data) !== sig) {
    return { valid: false, error: "验证信息无效" };
  }

  // ── Decode payload ────────────────────────────────────────────────────────
  let payload: ChallengePayload;
  try {
    payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as ChallengePayload;
  } catch {
    return { valid: false, error: "验证信息解析失败" };
  }

  // ── Expiry ────────────────────────────────────────────────────────────────
  if (Date.now() > payload.exp) {
    return { valid: false, error: "验证已过期，请重新验证" };
  }

  // ── Action match ──────────────────────────────────────────────────────────
  if (payload.action !== action) {
    return { valid: false, error: "验证目标不匹配" };
  }

  // ── Slider answer ─────────────────────────────────────────────────────────
  if (payload.type === "slider") {
    if (answer === undefined || answer === null) {
      return { valid: false, error: "请完成滑动验证" };
    }
    const TOLERANCE = 10; // ±10 percentage points
    if (Math.abs(answer - payload.target) > TOLERANCE) {
      return { valid: false, error: "滑动位置不正确，请重试" };
    }
  }

  return { valid: true };
}
