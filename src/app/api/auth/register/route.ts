import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  SecurityPipeline,
  abuseGatePlugin,
  sanitizePlugin,
  captchaPlugin,
} from "@/lib/api-security";

const registerSchema = z.object({
  name: z.string().min(2, "笔名至少2个字符").max(20, "笔名最多20个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少6个字符"),
});

const pipeline = new SecurityPipeline()
  .use(abuseGatePlugin("register"))
  .use(sanitizePlugin())
  .use(captchaPlugin("register"));

export async function POST(req: NextRequest) {
  const { blocked, response, ctx } = await pipeline.run(req);
  if (blocked) return response!;

  try {
    const { name, email, password } = registerSchema.parse(ctx.body);

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
