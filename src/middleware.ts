import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isBlacklisted, getClientIp, getFingerprint, BlacklistType } from "@/lib/blacklist";
import { logBlocked } from "@/lib/security-logger";

// Use Node.js runtime so we can access Prisma (TCP connections) in middleware
export const runtime = "nodejs";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── IP / fingerprint blacklist gate (all routes) ──────────────────────────
  // Skip static assets and Next.js internals to keep overhead minimal
  const isAsset =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff2?)$/) !== null;

  if (!isAsset) {
    const ip = getClientIp(req.headers);
    const fp = getFingerprint(req.headers);

    if (ip !== "unknown" && (await isBlacklisted(BlacklistType.IP, ip))) {
      logBlocked(pathname, "ip", ip, { ip });
      return NextResponse.json(
        { error: "您的访问已被限制，请联系管理员" },
        { status: 403 },
      );
    }

    if (fp && (await isBlacklisted(BlacklistType.FINGERPRINT, fp))) {
      logBlocked(pathname, "fingerprint", fp, { ip, fingerprint: fp });
      return NextResponse.json(
        { error: "您的访问已被限制，请联系管理员" },
        { status: 403 },
      );
    }
  }

  // ── Admin RBAC ────────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * Use a negative lookahead so static assets short-circuit before middleware
     * logic runs.  The isAsset guard above handles any stragglers.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
