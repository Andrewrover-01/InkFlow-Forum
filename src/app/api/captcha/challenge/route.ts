import { NextRequest, NextResponse } from "next/server";
import { generateChallenge, CaptchaType } from "@/lib/captcha";
import {
  isGraylisted,
  getClientIp,
  getFingerprint,
  BlacklistType,
} from "@/lib/blacklist";

/**
 * GET /api/captcha/challenge?action=<action>
 *
 * Returns a signed challenge token together with the CAPTCHA type and (for
 * slider challenges) the target zone position so the client can render the UI.
 *
 * Type selection logic:
 *  - "register"               → always slider  (batch-registration prevention)
 *  - graylisted IP or device  → slider          (heightened friction)
 *  - all other actions        → invisible       (zero friction for normal users)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "generic";

  const ip = getClientIp(req.headers);
  const fp = getFingerprint(req.headers);

  // Default: invisible for authenticated write actions (seamless for real users)
  let type: CaptchaType =
    action === "register" ? "slider" : "invisible";

  // Upgrade to slider if the caller is graylisted
  if (type === "invisible") {
    const [ipGraylisted, fpGraylisted] = await Promise.all([
      ip !== "unknown" ? isGraylisted(BlacklistType.IP, ip) : Promise.resolve(false),
      fp ? isGraylisted(BlacklistType.FINGERPRINT, fp) : Promise.resolve(false),
    ]);
    if (ipGraylisted || fpGraylisted) {
      type = "slider";
    }
  }

  const challenge = generateChallenge(action, type);

  return NextResponse.json({
    type: challenge.type,
    token: challenge.token,
    targetPercent: challenge.targetPercent,
  });
}
