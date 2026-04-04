/**
 * PATCH /api/admin/moderation/[id]
 * Human review decision: approve or reject a flagged content record.
 * Accessible by ADMIN and MODERATOR roles.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ModerationStatus } from "@prisma/client";

const reviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note:     z.string().max(500).optional(),
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

  let parsed: z.infer<typeof reviewSchema>;
  try {
    const body = await req.json();
    parsed = reviewSchema.parse(body);
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
    const record = await prisma.moderationRecord.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "审核记录不存在" }, { status: 404 });
    }

    const decision: ModerationStatus = parsed.decision;

    // Update the moderation record
    const updated = await prisma.moderationRecord.update({
      where: { id },
      data: {
        status:     decision,
        reviewerId: session.user.id,
        reviewNote: parsed.note ?? null,
        reviewedAt: new Date(),
      },
    });

    // Propagate the decision to the content itself
    if (record.targetType === "POST" && record.postId) {
      await prisma.post.update({
        where: { id: record.postId },
        data:  { moderationStatus: decision },
      });
    } else if (record.targetType === "REPLY" && record.replyId) {
      await prisma.reply.update({
        where: { id: record.replyId },
        data:  { moderationStatus: decision },
      });
    } else if (record.targetType === "COMMENT" && record.commentId) {
      await prisma.comment.update({
        where: { id: record.commentId },
        data:  { moderationStatus: decision },
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "审核操作失败" }, { status: 500 });
  }
}
