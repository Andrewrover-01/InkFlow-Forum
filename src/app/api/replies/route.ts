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

const replySchema = z.object({
  postId:        z.string().min(1),
  content:       z.string().min(1).max(2000),
  captchaToken:  z.string().optional(),
  captchaAnswer: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await buildSecurityContext(req);

  // ── Pre-body security checks ───────────────────────────────────────────────
  const preGuard = await createSecurityPipeline([
    authPlugin(),
    abuseGatePlugin("reply"),
  ]).run(ctx);
  if (preGuard) return preGuard;

  // ── Parse and validate body ────────────────────────────────────────────────
  let parsed: z.infer<typeof replySchema>;
  try {
    const body = await req.json();
    parsed = replySchema.parse(body);
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
    captchaPlugin("reply", () => parsed.captchaToken, () => parsed.captchaAnswer),
  ]).run(ctx);
  if (bodyGuard) return bodyGuard;

  // ── Business logic ─────────────────────────────────────────────────────────
  try {
    const post = await prisma.post.findUnique({
      where: { id: parsed.postId, status: { not: "DELETED" } },
    });

    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    if (post.isLocked) {
      return NextResponse.json({ error: "帖子已锁定" }, { status: 403 });
    }

    // Get current floor count
    const lastReply = await prisma.reply.findFirst({
      where:   { postId: parsed.postId },
      orderBy: { floor: "desc" },
    });

    const floor = (lastReply?.floor ?? 0) + 1;

    const reply = await prisma.reply.create({
      data: {
        content:  parsed.content,
        floor,
        postId:   parsed.postId,
        authorId: ctx.session!.user!.id,
      },
    });

    // Notify post author (skip if author is replying to their own post)
    if (post.authorId !== ctx.session!.user!.id) {
      prisma.notification
        .create({
          data: {
            userId:     post.authorId,
            type:       "REPLY",
            fromUserId: ctx.session!.user!.id,
            postId:     post.id,
            replyId:    reply.id,
          },
        })
        .catch(() => {
          // Notification failure should not block the reply response
        });
    }

    return NextResponse.json(reply, { status: 201 });
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
