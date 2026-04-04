import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  buildSecurityContext,
  createSecurityPipeline,
  authPlugin,
  abuseGatePlugin,
  captchaPlugin,
  sanitizePlugin,
} from "@/lib/api-security";

const commentSchema = z.object({
  replyId:       z.string().min(1),
  content:       z.string().min(1).max(500),
  parentId:      z.string().optional(),
  captchaToken:  z.string().optional(),
  captchaAnswer: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await buildSecurityContext(req);

  // ── Pre-body security checks ───────────────────────────────────────────────
  const preGuard = await createSecurityPipeline([
    authPlugin(),
    abuseGatePlugin("comment"),
  ]).run(ctx);
  if (preGuard) return preGuard;

  // ── Parse and validate body ────────────────────────────────────────────────
  let parsed: z.infer<typeof commentSchema>;
  try {
    const body = await req.json();
    parsed = commentSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "无效的请求格式" }, { status: 400 });
  }

  // ── Body-level security checks ─────────────────────────────────────────────
  const bodyGuard = await createSecurityPipeline([
    sanitizePlugin(() => ({ content: parsed.content })),
    captchaPlugin("comment", () => parsed.captchaToken, () => parsed.captchaAnswer),
  ]).run(ctx);
  if (bodyGuard) return bodyGuard;

  // ── Business logic ─────────────────────────────────────────────────────────
  try {
    const comment = await prisma.comment.create({
      data: {
        content:  parsed.content,
        replyId:  parsed.replyId,
        parentId: parsed.parentId || null,
        authorId: ctx.session!.user!.id,
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
