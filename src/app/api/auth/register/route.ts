import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  buildSecurityContext,
  createSecurityPipeline,
  abuseGatePlugin,
  captchaPlugin,
  sanitizePlugin,
} from "@/lib/api-security";

const registerSchema = z.object({
  name:          z.string().min(2, "笔名至少2个字符").max(20, "笔名最多20个字符"),
  email:         z.string().email("请输入有效的邮箱地址"),
  password:      z.string().min(6, "密码至少6个字符"),
  captchaToken:  z.string().optional(),
  captchaAnswer: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await buildSecurityContext(req);

  // ── Pre-body security checks (abuse gate; no auth required for registration) ─
  const preGuard = await createSecurityPipeline([
    abuseGatePlugin("register"),
  ]).run(ctx);
  if (preGuard) return preGuard;

  // ── Parse and validate body ────────────────────────────────────────────────
  let parsed: z.infer<typeof registerSchema>;
  try {
    const body = await req.json();
    parsed = registerSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "无效的请求格式" }, { status: 400 });
  }

  // ── Body-level security checks (sanitize + captcha) ───────────────────────
  // Slider CAPTCHA is always required for registration.
  const bodyGuard = await createSecurityPipeline([
    sanitizePlugin(() => ({ name: parsed.name, email: parsed.email })),
    captchaPlugin("register", () => parsed.captchaToken, () => parsed.captchaAnswer),
  ]).run(ctx);
  if (bodyGuard) return bodyGuard;

  // ── Business logic ─────────────────────────────────────────────────────────
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(parsed.password, 12);

    const user = await prisma.user.create({
      data: {
        name:     parsed.name,
        email:    parsed.email,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { message: "注册成功", userId: user.id },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
