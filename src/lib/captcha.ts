/**
 * CAPTCHA / human-verification system.
 *
 * Self-contained implementation — no external CAPTCHA service required.
 *
 * Design:
 *  • Server issues a short-lived HMAC-SHA256 signed challenge token.
 *  • Token payload: { action, mode, nonce, issuedAt }
 *  • Client either auto-resolves (invisible) or completes a slider drag.
 *  • On form submit the token is sent as `captchaToken` in the request body.
 *  • Server calls `verifyCaptchaToken()` before processing the write.
 *
 * Modes:
 *   "invisible" — auto-resolved after a short delay (1.5 s pointer-event replay).
 *                 Used for normal users on low-risk actions.
 *   "slider"    — user must drag a slider to the right end.
 *                 Shown for: registration, graylisted identifiers, high-risk actions.
 *
 * Risk-aware mode selection (server-side):
 *   getRequiredCaptchaMode(action, isGraylisted) → CaptchaMode
 *
 * CI bypass:
 *   Set CAPTCHA_BYPASS_TOKEN env var server-side.
 *   Clients pass it as captchaToken; verifyCaptchaToken() accepts it unconditionally.
 *   Set NEXT_PUBLIC_CAPTCHA_BYPASS_TOKEN on the client; CaptchaWidget reads it and
 *   skips the UI entirely, immediately calling onVerify(bypassToken).
 */

import { createHmac, randomBytes } from "crypto";

export type CaptchaMode = "invisible" | "slider";
export type CaptchaAction = "register" | "post" | "reply" | "comment";

/** How long a challenge token is valid (3 minutes). */
const TOKEN_TTL_MS = 3 * 60 * 1000;

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET ?? "captcha-fallback-secret";
}

interface TokenPayload {
  action: CaptchaAction;
  mode: CaptchaMode;
  nonce: string;
  issuedAt: number;
}

/** Create a signed challenge token for the given action/mode. */
export function createCaptchaToken(
  action: CaptchaAction,
  mode: CaptchaMode
): string {
  const payload: TokenPayload = {
    action,
    mode,
    nonce: randomBytes(8).toString("hex"),
    issuedAt: Date.now(),
  };
  const data = JSON.stringify(payload);
  const sig = createHmac("sha256", getSecret()).update(data).digest("hex");
  return Buffer.from(JSON.stringify({ data, sig })).toString("base64url");
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

/** Verify a token submitted by the client. */
export function verifyCaptchaToken(
  token: string | undefined | null,
  expectedAction: CaptchaAction
): VerifyResult {
  if (!token) return { valid: false, reason: "missing_token" };

  // CI / test bypass
  const bypass = process.env.CAPTCHA_BYPASS_TOKEN;
  if (bypass && token === bypass) return { valid: true };

  try {
    const { data, sig } = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8")
    );
    const expected = createHmac("sha256", getSecret())
      .update(data)
      .digest("hex");
    if (sig !== expected) return { valid: false, reason: "invalid_signature" };

    const payload: TokenPayload = JSON.parse(data);
    if (payload.action !== expectedAction)
      return { valid: false, reason: "action_mismatch" };
    if (Date.now() - payload.issuedAt > TOKEN_TTL_MS)
      return { valid: false, reason: "token_expired" };

    return { valid: true };
  } catch {
    return { valid: false, reason: "malformed_token" };
  }
}

/**
 * Decide which CAPTCHA mode to show based on risk signals.
 *
 * Slider (harder) for:
 *   - registration (always — highest abuse risk)
 *   - graylisted users / IPs
 *
 * Invisible (frictionless) for:
 *   - authenticated users doing normal forum actions
 */
export function getRequiredCaptchaMode(
  action: CaptchaAction,
  isGraylisted: boolean
): CaptchaMode {
  if (action === "register" || isGraylisted) return "slider";
  return "invisible";
}
