import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCaptchaToken, getRequiredCaptchaMode, CaptchaAction } from "@/lib/captcha";
import { getClientIp, getFingerprint } from "@/lib/abuse-gate";
import { getBlacklistLevel } from "@/lib/blacklist";
import { BlacklistType } from "@prisma/client";

const VALID_ACTIONS: CaptchaAction[] = ["register", "post", "reply", "comment"];

/**
 * GET /api/captcha/challenge?action=post
 *
 * Returns a signed challenge token and the mode the client should display.
 * Risk signals (graylist status, action type) drive mode selection.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") as CaptchaAction | null;

  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Determine if the requester is graylisted (triggers slider mode)
  let graylisted = false;
  try {
    const session = await getServerSession(authOptions);
    const ip = getClientIp(req);
    const fp = getFingerprint(req);

    const checks = [
      ip !== "unknown" ? getBlacklistLevel(ip, BlacklistType.IP) : Promise.resolve(null),
      session?.user?.id ? getBlacklistLevel(session.user.id, BlacklistType.USER_ID) : Promise.resolve(null),
      fp ? getBlacklistLevel(fp, BlacklistType.FINGERPRINT) : Promise.resolve(null),
    ];
    const levels = await Promise.all(checks);
    graylisted = levels.some((l) => l === "GRAY");
  } catch {
    // If risk check fails, default to non-graylisted (avoid blocking legitimate users)
  }

  const mode = getRequiredCaptchaMode(action, graylisted);
  const token = createCaptchaToken(action, mode);

  return NextResponse.json({ token, mode });
}
