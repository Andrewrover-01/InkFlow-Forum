import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  isBlacklisted,
  isGraylisted,
  recordViolation,
  getClientIp,
  getFingerprint,
  BlacklistType,
} from "@/lib/blacklist";

const registerSchema = z.object({
  name: z.string().min(2, "笔名至少2个字符").max(20, "笔名最多20个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少6个字符"),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const fp = getFingerprint(req.headers);

  // IP blacklist check
  if (ip !== "unknown" && (await isBlacklisted(BlacklistType.IP, ip))) {
    return NextResponse.json({ error: "您的访问已被限制，请联系管理员" }, { status: 403 });
  }

  // Fingerprint blacklist check
  if (fp && (await isBlacklisted(BlacklistType.FINGERPRINT, fp))) {
    return NextResponse.json({ error: "您的访问已被限制，请联系管理员" }, { status: 403 });
  }

  // Rate limit registrations by IP (batch-registration prevention)
  const graylisted =
    (ip !== "unknown" && (await isGraylisted(BlacklistType.IP, ip))) ||
    (fp !== null && (await isGraylisted(BlacklistType.FINGERPRINT, fp)));

  const rlResult = checkRateLimit("register", ip, graylisted);
  if (!rlResult.allowed) {
    if (ip !== "unknown") await recordViolation(BlacklistType.IP, ip);
    if (fp) await recordViolation(BlacklistType.FINGERPRINT, fp);
    return NextResponse.json(
      { error: "注册太频繁，请稍后再试" },
      { status: 429, headers: rateLimitHeaders(rlResult, "register") },
    );
  }

  try {
    const body = await req.json();
    const { name, email, password } = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { message: "注册成功", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}
