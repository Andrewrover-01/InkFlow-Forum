/**
 * POST /api/reports
 * Submit a user report on a post, reply, or comment.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ModerationTargetType } from "@prisma/client";
import {
  buildSecurityContext,
  createSecurityPipeline,
  authPlugin,
  abuseGatePlugin,
} from "@/lib/api-security";

const reportSchema = z.object({
  targetType: z.nativeEnum(ModerationTargetType),
  postId:     z.string().optional(),
  replyId:    z.string().optional(),
  commentId:  z.string().optional(),
  reason:     z.string().min(2, "举报原因至少2个字符").max(200, "举报原因最多200个字符"),
});

export async function POST(req: NextRequest) {
  const ctx = await buildSecurityContext(req);

  const guard = await createSecurityPipeline([
    authPlugin(),
    abuseGatePlugin("comment"), // reuse comment rate-limit bucket
  ]).run(ctx);
  if (guard) return guard;

  let parsed: z.infer<typeof reportSchema>;
  try {
    const body = await req.json();
    parsed = reportSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "无效的请求格式" }, { status: 400 });
  }

  // Ensure the target ID matches the targetType
  const { targetType, postId, replyId, commentId, reason } = parsed;
  if (targetType === "POST"    && !postId)    return NextResponse.json({ error: "缺少 postId"    }, { status: 400 });
  if (targetType === "REPLY"   && !replyId)   return NextResponse.json({ error: "缺少 replyId"   }, { status: 400 });
  if (targetType === "COMMENT" && !commentId) return NextResponse.json({ error: "缺少 commentId" }, { status: 400 });

  try {
    const report = await prisma.report.create({
      data: {
        reporterId: ctx.session!.user!.id,
        targetType,
        postId:     postId    ?? null,
        replyId:    replyId   ?? null,
        commentId:  commentId ?? null,
        reason,
      },
    });
    return NextResponse.json({ id: report.id, message: "举报已提交，感谢您的反馈" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "提交举报失败，请稍后重试" }, { status: 500 });
  }
}
