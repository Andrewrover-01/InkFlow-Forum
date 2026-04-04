/**
 * PATCH /api/admin/reports/[id]
 * Resolve or dismiss a user-submitted content report.
 * Accessible by ADMIN and MODERATOR roles.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const resolveSchema = z.object({
  action: z.enum(["RESOLVED", "DISMISSED"]),
  note:   z.string().max(500).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")
  ) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  let parsed: z.infer<typeof resolveSchema>;
  try {
    const body = await req.json();
    parsed = resolveSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "无效的请求格式" }, { status: 400 });
  }

  try {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: "举报记录不存在" }, { status: 404 });
    }

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status:       parsed.action,
        resolvedById: session.user.id,
        resolvedNote: parsed.note ?? null,
        resolvedAt:   new Date(),
      },
    });

    // If RESOLVED and the content has a known target, flag it for human review
    // if it hasn't been flagged already.
    if (parsed.action === "RESOLVED") {
      const { targetType, postId, replyId, commentId } = report;

      const ensureModerationRecord = async (
        type: "POST" | "REPLY" | "COMMENT",
        targetId: string,
        reason: string,
        postIdVal?: string,
        replyIdVal?: string,
        commentIdVal?: string,
      ) => {
        // Only create a record if none exists for this target
        const existing = await prisma.moderationRecord.findFirst({
          where: { targetType: type, ...(type === "POST" ? { postId: targetId } : type === "REPLY" ? { replyId: targetId } : { commentId: targetId }) },
        });
        if (!existing) {
          await prisma.moderationRecord.create({
            data: {
              targetType: type,
              postId:     postIdVal    ?? null,
              replyId:    replyIdVal   ?? null,
              commentId:  commentIdVal ?? null,
              autoStatus: "FLAGGED",
              autoReason: reason,
              autoScore:  50,
              status:     "PENDING",
            },
          });
        }
      };

      if (targetType === "POST" && postId) {
        await prisma.post.updateMany({
          where: { id: postId, moderationStatus: "APPROVED" },
          data:  { moderationStatus: "FLAGGED" },
        });
        await ensureModerationRecord("POST", postId, `用户举报：${report.reason}`, postId);
      } else if (targetType === "REPLY" && replyId) {
        await prisma.reply.updateMany({
          where: { id: replyId, moderationStatus: "APPROVED" },
          data:  { moderationStatus: "FLAGGED" },
        });
        await ensureModerationRecord("REPLY", replyId, `用户举报：${report.reason}`, undefined, replyId);
      } else if (targetType === "COMMENT" && commentId) {
        await prisma.comment.updateMany({
          where: { id: commentId, moderationStatus: "APPROVED" },
          data:  { moderationStatus: "FLAGGED" },
        });
        await ensureModerationRecord("COMMENT", commentId, `用户举报：${report.reason}`, undefined, undefined, commentId);
      }
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "处理举报失败" }, { status: 500 });
  }
}
