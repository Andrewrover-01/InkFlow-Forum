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
import { moderateContent } from "@/lib/content-moderator";

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

  // ── Machine content moderation ─────────────────────────────────────────────
  const modResult = await moderateContent({ textFields: [parsed.content] });
  if (modResult.status === "REJECTED") {
    return NextResponse.json(
      { error: `内容违规，无法发布：${modResult.reason ?? "包含违禁内容"}` },
      { status: 422 },
    );
  }

  // ── Business logic ─────────────────────────────────────────────────────────
  try {
    const comment = await prisma.comment.create({
      data: {
        content:          parsed.content,
        replyId:          parsed.replyId,
        parentId:         parsed.parentId || null,
        authorId:         ctx.session!.user!.id,
        moderationStatus: modResult.status,
      },
    });

    // Persist moderation audit record for flagged content (fire-and-forget)
    if (modResult.status !== "APPROVED") {
      prisma.moderationRecord
        .create({
          data: {
            targetType: "COMMENT",
            commentId:  comment.id,
            autoStatus: modResult.status,
            autoReason: modResult.reason,
            autoScore:  modResult.score,
            status:     "PENDING",
          },
        })
        .catch(() => {});
    }

    return NextResponse.json(
      {
        ...comment,
        ...(modResult.status === "FLAGGED" && {
          warning: "您的评论正在审核中，审核通过后将公开显示",
        }),
      },
      { status: 201 },
    );
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
