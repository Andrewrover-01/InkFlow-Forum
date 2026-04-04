/**
 * Security pipeline for API route handlers.
 *
 * Provides a composable, plugin-based security layer that handles:
 *   1. Authentication (JWT session verification)
 *   2. Abuse gate (IP/user/fingerprint blacklist + rate limiting)
 *   3. Input sanitization (null bytes, control chars)
 *   4. CAPTCHA token verification
 *
 * Usage:
 *   // Module-level singleton — created once, runs per request
 *   const pipeline = new SecurityPipeline()
 *     .use(requireAuthPlugin())
 *     .use(abuseGatePlugin("post"))
 *     .use(sanitizePlugin())
 *     .use(captchaPlugin("post"));
 *
 *   export async function POST(req: NextRequest) {
 *     const { blocked, response, ctx } = await pipeline.run(req);
 *     if (blocked) return response!;
 *
 *     const session = ctx.session!;
 *     const { title, content } = schema.parse(ctx.body);
 *     // ... DB work
 *   }
 *
 * Each plugin returns null to continue the chain, or a NextResponse to
 * short-circuit (block) the request.
 *
 * Plugins execute in declaration order. Recommended order:
 *   requireAuthPlugin → abuseGatePlugin → sanitizePlugin → captchaPlugin
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAbuse, getClientIp, getFingerprint } from "@/lib/abuse-gate";
import { verifyCaptchaToken } from "@/lib/captcha";
import type { CaptchaAction } from "@/lib/captcha";
import type { RateLimitAction } from "@/lib/rate-limit";
import { sanitizeBody } from "@/lib/sanitize";
import { logSecurityEvent } from "@/lib/security-logger";

// ─── Pipeline context ────────────────────────────────────────────────────────

export interface PipelineContext {
  /** NextAuth session, populated by authPlugin / requireAuthPlugin. */
  session: Session | null;
  /** Shortcut to session.user.id — null when unauthenticated. */
  userId: string | null;
  /** Parsed + sanitized request body. Populated by sanitizePlugin. */
  body: Record<string, unknown> | null;
  /** Client IP address. */
  ip: string;
  /** Device fingerprint from __fp cookie / x-fp header. */
  fp: string | null;
}

// ─── Plugin type ─────────────────────────────────────────────────────────────

/**
 * A security plugin.
 * Return null to continue, or a NextResponse to block the request.
 */
export type SecurityPlugin = (
  ctx: PipelineContext,
  req: NextRequest
) => Promise<NextResponse | null>;

// ─── Pipeline ────────────────────────────────────────────────────────────────

export interface PipelineResult {
  /** Whether the request was blocked by a plugin. */
  blocked: boolean;
  /** The blocking response to return to the client. Only set when blocked. */
  response?: NextResponse;
  /** Accumulated context (session, body, etc.). Always populated. */
  ctx: PipelineContext;
}

export class SecurityPipeline {
  private readonly plugins: SecurityPlugin[] = [];

  /** Append a plugin to the pipeline. Returns `this` for chaining. */
  use(plugin: SecurityPlugin): this {
    this.plugins.push(plugin);
    return this;
  }

  /** Run all plugins in order. Short-circuits on the first block. */
  async run(req: NextRequest): Promise<PipelineResult> {
    const ctx: PipelineContext = {
      session: null,
      userId: null,
      body: null,
      ip: getClientIp(req),
      fp: getFingerprint(req),
    };

    for (const plugin of this.plugins) {
      const result = await plugin(ctx, req);
      if (result !== null) {
        return { blocked: true, response: result, ctx };
      }
    }

    return { blocked: false, ctx };
  }
}

// ─── Built-in plugins ────────────────────────────────────────────────────────

/**
 * Populate ctx.session / ctx.userId without enforcing authentication.
 * Useful when a route behaves differently for authenticated vs anonymous users.
 */
export function authPlugin(): SecurityPlugin {
  return async (ctx) => {
    const session = await getServerSession(authOptions);
    ctx.session = session ?? null;
    ctx.userId = session?.user?.id ?? null;
    return null;
  };
}

/**
 * Require a valid session.
 * Returns 401 if the user is not logged in.
 */
export function requireAuthPlugin(): SecurityPlugin {
  return async (ctx) => {
    const session = await getServerSession(authOptions);
    ctx.session = session ?? null;
    ctx.userId = session?.user?.id ?? null;

    if (!ctx.userId) {
      logSecurityEvent({ event: "auth_missing", ip: ctx.ip });
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return null;
  };
}

/**
 * Run the abuse gate (IP/user/fingerprint blacklist + rate limiting).
 * Requires ctx.userId to be set by a preceding auth plugin when available.
 */
export function abuseGatePlugin(action: RateLimitAction): SecurityPlugin {
  return async (ctx, req) => {
    const gate = await checkAbuse({
      action,
      userId: ctx.userId ?? undefined,
      req,
    });
    if (gate.blocked) {
      return gate.response!;
    }
    return null;
  };
}

/**
 * Parse the request body as JSON and sanitize all string values.
 * The sanitized result is stored in ctx.body for subsequent plugins and
 * the route handler.
 *
 * Must run before captchaPlugin (which reads captchaToken from ctx.body).
 */
export function sanitizePlugin(): SecurityPlugin {
  return async (ctx, req) => {
    try {
      const raw = await req.json();
      ctx.body = sanitizeBody(raw);
    } catch {
      ctx.body = {};
    }
    return null;
  };
}

/**
 * Verify the CAPTCHA token submitted in the request body.
 * Reads `captchaToken` from ctx.body — sanitizePlugin must run first.
 *
 * Returns 400 if the token is missing, expired, or has an invalid signature.
 */
export function captchaPlugin(action: CaptchaAction): SecurityPlugin {
  return async (ctx) => {
    const token = ctx.body?.captchaToken as string | undefined;
    const result = verifyCaptchaToken(token, action);
    if (!result.valid) {
      logSecurityEvent({
        event: "captcha_fail",
        action,
        ip: ctx.ip,
        userId: ctx.userId ?? undefined,
        reason: result.reason,
      });
      return NextResponse.json({ error: "人机验证失败，请重试" }, { status: 400 });
    }
    return null;
  };
}
