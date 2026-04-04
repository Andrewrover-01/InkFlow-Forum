/**
 * Unified API security middleware.
 *
 * Provides a composable, plugin-based pipeline that centralises all security
 * checks for write API routes:
 *
 *   1. Token verification      (validate the NextAuth session JWT)
 *   2. Permission check        (enforce RBAC roles)
 *   3. Abuse-gate check        (rate-limit + blacklist)
 *   4. Parameter sanitization  (detect suspicious input patterns)
 *   5. CAPTCHA verification    (self-hosted HMAC token)
 *
 * Each check is implemented as a `SecurityPlugin` and can be composed freely.
 * Custom plugins can be registered for route-specific requirements, providing
 * the plugin-based extension point described in the security requirements.
 *
 * Usage example:
 * ```ts
 * export async function POST(req: NextRequest) {
 *   const ctx = await buildSecurityContext(req);
 *
 *   // Pre-body checks (auth + abuse gate)
 *   const preGuard = await createSecurityPipeline([
 *     authPlugin(),
 *     abuseGatePlugin("post"),
 *   ]).run(ctx);
 *   if (preGuard) return preGuard;
 *
 *   // Parse body, run Zod validation …
 *
 *   // Body-level checks (sanitize + captcha)
 *   const bodyGuard = await createSecurityPipeline([
 *     sanitizePlugin(() => ({ title: parsed.title, content: parsed.content })),
 *     captchaPlugin("post", () => parsed.captchaToken, () => parsed.captchaAnswer),
 *   ]).run(ctx);
 *   if (bodyGuard) return bodyGuard;
 *
 *   // … business logic
 * }
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { abuseGate } from "@/lib/abuse-gate";
import { verifyCaptchaToken } from "@/lib/captcha";
import { getClientIp, getFingerprint } from "@/lib/blacklist";
import {
  logAuthFailed,
  logPermissionDenied,
  logCaptchaFailed,
  logSuspiciousInput,
} from "@/lib/security-logger";
import { isSuspiciousInput } from "@/lib/sanitize";

// ── Security context ──────────────────────────────────────────────────────────

/**
 * Shared context object passed through the plugin pipeline.
 * Built once per request by `buildSecurityContext` to avoid redundant
 * header / session resolution across multiple plugins.
 */
export interface SecurityContext {
  req: NextRequest;
  /** Resolved client IP address ("unknown" if not determinable). */
  ip: string;
  /** Device fingerprint from header/cookie, or null. */
  fingerprint: string | null;
  /** Authenticated session, resolved once during context building. */
  session: Session | null;
  /** Request path (used for log entries). */
  path: string;
}

/**
 * Resolve request metadata into a `SecurityContext`.
 * The session is fetched once here so individual plugins avoid redundant
 * round-trips to the session store.
 */
export async function buildSecurityContext(
  req: NextRequest,
): Promise<SecurityContext> {
  const session = await getServerSession(authOptions);
  return {
    req,
    ip:          getClientIp(req.headers),
    fingerprint: getFingerprint(req.headers),
    session,
    path:        req.nextUrl.pathname,
  };
}

// ── Plugin interface ──────────────────────────────────────────────────────────

/**
 * A `SecurityPlugin` encapsulates one security check.
 *
 * `execute` returns:
 * - A `NextResponse` (rejection) to stop the pipeline and return that response
 *   to the client.
 * - `null` to pass control to the next plugin.
 *
 * Custom plugins should implement this interface to extend the pipeline.
 */
export interface SecurityPlugin {
  /** Human-readable name used in log entries and error messages. */
  readonly name: string;
  execute(ctx: SecurityContext): Promise<NextResponse | null>;
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

/**
 * Immutable, composable security pipeline.
 *
 * Plugins are executed in registration order.  The first plugin that returns
 * a non-null `NextResponse` short-circuits the remaining plugins.
 * Unexpected exceptions thrown by any plugin are caught here (unified
 * exception handling) and result in a 500 response rather than crashing the
 * route handler.
 */
export class SecurityPipeline {
  private readonly plugins: readonly SecurityPlugin[];

  constructor(plugins: SecurityPlugin[] = []) {
    this.plugins = plugins;
  }

  /** Return a new pipeline with an additional plugin appended. */
  use(plugin: SecurityPlugin): SecurityPipeline {
    return new SecurityPipeline([...this.plugins, plugin]);
  }

  /**
   * Run all plugins in order.
   * Returns the first rejection response, or `null` if the request is allowed.
   */
  async run(ctx: SecurityContext): Promise<NextResponse | null> {
    for (const plugin of this.plugins) {
      try {
        const result = await plugin.execute(ctx);
        if (result) return result;
      } catch (err) {
        // Unified exception handler: a faulty plugin must not crash the route.
        console.error(
          `[SecurityPipeline] Plugin "${plugin.name}" threw an unexpected error:`,
          err,
        );
        return NextResponse.json(
          { error: "安全检查遇到异常，请稍后重试" },
          { status: 500 },
        );
      }
    }
    return null;
  }
}

/** Convenience factory: create a `SecurityPipeline` from an array of plugins. */
export function createSecurityPipeline(
  plugins: SecurityPlugin[],
): SecurityPipeline {
  return new SecurityPipeline(plugins);
}

// ── Built-in plugins ──────────────────────────────────────────────────────────

/**
 * Enforce that the request carries a valid authenticated session.
 * Optionally enforce one or more required `UserRole` values.
 *
 * Logs `AUTH_FAILED` or `PERMISSION_DENIED` to the security log.
 */
export function authPlugin(requiredRoles?: UserRole[]): SecurityPlugin {
  return {
    name: requiredRoles?.length
      ? `auth:${requiredRoles.join(",")}`
      : "auth",

    async execute(ctx) {
      if (!ctx.session?.user?.id) {
        logAuthFailed(ctx.path, { ip: ctx.ip });
        return NextResponse.json({ error: "请先登录" }, { status: 401 });
      }

      if (requiredRoles && requiredRoles.length > 0) {
        const userRole = ctx.session.user.role as UserRole;
        if (!requiredRoles.includes(userRole)) {
          logPermissionDenied(
            ctx.path,
            ctx.session.user.id,
            requiredRoles,
            { ip: ctx.ip },
          );
          return NextResponse.json({ error: "权限不足" }, { status: 403 });
        }
      }

      return null;
    },
  };
}

/**
 * Run the unified abuse gate (IP / fingerprint / user blacklist + rate limiting).
 * `action` corresponds to a key in `RATE_LIMITS` (e.g. "post", "reply").
 *
 * Blocking and rate-limit events are logged inside `abuseGate` itself.
 */
export function abuseGatePlugin(action: string): SecurityPlugin {
  return {
    name: `abuse-gate:${action}`,

    async execute(ctx) {
      const userId = ctx.session?.user?.id;
      return abuseGate({ action, userId, req: ctx.req });
    },
  };
}

/**
 * Verify a CAPTCHA token submitted with the request body.
 *
 * `getToken` and `getAnswer` are lazy accessors so the body can be parsed
 * once by the route handler and shared via closure.  This avoids reading
 * `req.json()` twice (which is not possible in Next.js).
 *
 * Logs `CAPTCHA_FAILED` to the security log on rejection.
 */
export function captchaPlugin(
  action: string,
  getToken: () => string | undefined,
  getAnswer: () => number | undefined,
): SecurityPlugin {
  return {
    name: `captcha:${action}`,

    async execute(ctx) {
      const result = verifyCaptchaToken(getToken(), action, getAnswer());
      if (!result.valid) {
        logCaptchaFailed(ctx.path, result.error ?? "unknown", {
          ip:     ctx.ip,
          userId: ctx.session?.user?.id,
        });
        return NextResponse.json(
          { error: result.error ?? "请先完成安全验证" },
          { status: 400 },
        );
      }
      return null;
    },
  };
}

/**
 * Detect suspicious patterns (XSS vectors, null bytes, …) in named string
 * fields of the request body.
 *
 * `getFields` is a lazy accessor returning the fields to inspect, keyed by
 * field name.  Call it after the body has been parsed so closures work.
 *
 * Logs `SUSPICIOUS_INPUT` to the security log and rejects the request when a
 * match is found.
 */
export function sanitizePlugin(
  getFields: () => Record<string, string | undefined>,
): SecurityPlugin {
  return {
    name: "sanitize",

    async execute(ctx) {
      const fields = getFields();
      for (const [fieldName, value] of Object.entries(fields)) {
        if (value !== undefined && isSuspiciousInput(value)) {
          logSuspiciousInput(ctx.path, fieldName, {
            ip:     ctx.ip,
            userId: ctx.session?.user?.id,
          });
          return NextResponse.json(
            { error: "请求包含非法字符，已被拦截" },
            { status: 400 },
          );
        }
      }
      return null;
    },
  };
}
