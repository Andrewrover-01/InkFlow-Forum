/**
 * Centralised security event logger.
 *
 * Writes structured JSON entries to the server console.  All security-relevant
 * decisions made by the middleware pipeline (blocked requests, authentication
 * failures, CAPTCHA rejections, suspicious input, …) are routed through this
 * module so operators have a single log stream to monitor and forward to SIEM
 * or log-aggregation systems.
 *
 * Design notes:
 * - Synchronous + fire-and-forget: never throws, never blocks the request.
 * - No external dependencies beyond the Node.js `console`.
 * - Structured JSON format for easy machine parsing.
 */

export enum SecurityEventType {
  /** IP address is on the BLACK list. */
  IP_BLOCKED        = "IP_BLOCKED",
  /** Device fingerprint is on the BLACK list. */
  FP_BLOCKED        = "FP_BLOCKED",
  /** User account is on the BLACK list. */
  USER_BLOCKED      = "USER_BLOCKED",
  /** Request rate limit exceeded. */
  RATE_LIMITED      = "RATE_LIMITED",
  /** CAPTCHA token missing, invalid, or wrong answer. */
  CAPTCHA_FAILED    = "CAPTCHA_FAILED",
  /** Session token missing or invalid (unauthenticated access attempt). */
  AUTH_FAILED       = "AUTH_FAILED",
  /** Authenticated user lacks the required role. */
  PERMISSION_DENIED = "PERMISSION_DENIED",
  /** Request body failed schema validation. */
  PARAM_INVALID     = "PARAM_INVALID",
  /** Input matched a suspicious-pattern heuristic (XSS, null bytes, …). */
  SUSPICIOUS_INPUT  = "SUSPICIOUS_INPUT",
  /** General security-relevant informational event. */
  INFO              = "INFO",
}

export enum SecurityEventSeverity {
  LOW      = "LOW",
  MEDIUM   = "MEDIUM",
  HIGH     = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  /** Request path that triggered the event. */
  path: string;
  ip?: string;
  fingerprint?: string;
  userId?: string;
  message: string;
  /** Optional structured payload for richer context. */
  metadata?: Record<string, unknown>;
}

/**
 * Emit a security event to the console as structured JSON.
 * Safe to call from any async context — never throws.
 */
export function logSecurityEvent(event: SecurityEvent): void {
  try {
    const entry = {
      ts: new Date().toISOString(),
      ...event,
    };
    // console.warn surfaces entries in most log-aggregation setups without
    // being mixed in with debug noise.
    console.warn("[SECURITY]", JSON.stringify(entry));
  } catch {
    // Swallow serialisation errors to avoid disrupting the request pipeline.
  }
}

// ── Convenience helpers ───────────────────────────────────────────────────────

export function logBlocked(
  path: string,
  reason: "ip" | "fingerprint" | "user",
  identifier: string,
  opts?: { ip?: string; fingerprint?: string; userId?: string },
): void {
  const typeMap = {
    ip:          SecurityEventType.IP_BLOCKED,
    fingerprint: SecurityEventType.FP_BLOCKED,
    user:        SecurityEventType.USER_BLOCKED,
  } as const;

  logSecurityEvent({
    type:     typeMap[reason],
    severity: SecurityEventSeverity.HIGH,
    path,
    message:  `Request blocked: ${reason}=${identifier}`,
    ...opts,
  });
}

export function logRateLimited(
  path: string,
  action: string,
  opts?: { ip?: string; userId?: string },
): void {
  logSecurityEvent({
    type:     SecurityEventType.RATE_LIMITED,
    severity: SecurityEventSeverity.MEDIUM,
    path,
    message:  `Rate limit exceeded: action=${action}`,
    metadata: { action },
    ...opts,
  });
}

export function logCaptchaFailed(
  path: string,
  reason: string,
  opts?: { ip?: string; userId?: string },
): void {
  logSecurityEvent({
    type:     SecurityEventType.CAPTCHA_FAILED,
    severity: SecurityEventSeverity.MEDIUM,
    path,
    message:  `CAPTCHA verification failed: ${reason}`,
    metadata: { reason },
    ...opts,
  });
}

export function logAuthFailed(
  path: string,
  opts?: { ip?: string },
): void {
  logSecurityEvent({
    type:     SecurityEventType.AUTH_FAILED,
    severity: SecurityEventSeverity.MEDIUM,
    path,
    message:  "Authentication required but no valid session found",
    ...opts,
  });
}

export function logPermissionDenied(
  path: string,
  userId: string,
  requiredRoles: string[],
  opts?: { ip?: string },
): void {
  logSecurityEvent({
    type:     SecurityEventType.PERMISSION_DENIED,
    severity: SecurityEventSeverity.MEDIUM,
    path,
    userId,
    message:  `Permission denied: requires ${requiredRoles.join(" | ")}`,
    metadata: { requiredRoles },
    ...opts,
  });
}

export function logSuspiciousInput(
  path: string,
  field: string,
  opts?: { ip?: string; userId?: string },
): void {
  logSecurityEvent({
    type:     SecurityEventType.SUSPICIOUS_INPUT,
    severity: SecurityEventSeverity.HIGH,
    path,
    message:  `Suspicious input detected in field: ${field}`,
    metadata: { field },
    ...opts,
  });
}
