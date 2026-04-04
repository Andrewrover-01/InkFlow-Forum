/**
 * Structured security event logger.
 *
 * Writes newline-delimited JSON to stderr so that log aggregators
 * (Datadog, CloudWatch, etc.) can parse and alert on security events
 * without mixing with application stdout.
 *
 * Usage:
 *   logSecurityEvent({ event: "rate_limited", action: "post", ip: "1.2.3.4" });
 *
 * Output format:
 *   {"security":{"event":"rate_limited","action":"post","ip":"1.2.3.4","ts":"..."}}
 */

export type SecurityEventType =
  | "auth_missing"       // unauthenticated request to protected route
  | "auth_forbidden"     // authenticated but insufficient role
  | "ip_blocked"         // IP in blacklist (BLACK level)
  | "user_blocked"       // userId in blacklist (BLACK level)
  | "fp_blocked"         // device fingerprint in blacklist (BLACK level)
  | "rate_limited"       // sliding-window rate limit exceeded
  | "auto_graylisted"    // identifier auto-graylisted after repeated violations
  | "captcha_fail"       // CAPTCHA token invalid / expired / missing
  | "sanitize_warn";     // suspicious characters stripped from input

export interface SecurityEvent {
  event: SecurityEventType;
  /** API action being performed (post, reply, comment, register, like…) */
  action?: string;
  ip?: string;
  userId?: string;
  fp?: string;
  /** Machine-readable reason string from the underlying module */
  reason?: string;
  /** Request path or route identifier */
  path?: string;
  ts: string;
}

export function logSecurityEvent(
  event: Omit<SecurityEvent, "ts">
): void {
  const entry: SecurityEvent = { ...event, ts: new Date().toISOString() };
  // Write to stderr — never to stdout — so app logs stay clean
  process.stderr.write(JSON.stringify({ security: entry }) + "\n");
}
