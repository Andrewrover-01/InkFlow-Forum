import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ModerationStatus, ContentType } from "@prisma/client";

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional(),
});

// PATCH /api/admin/moderation/[id] — approve or reject a record
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")
  ) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { status, reviewNote } = patchSchema.parse(body);

    const record = await prisma.moderationRecord.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    const updated = await prisma.moderationRecord.update({
      where: { id },
      data: {
        status: status as ModerationStatus,
        reviewerId: session.user.id,
        reviewNote: reviewNote ?? null,
        updatedAt: new Date(),
      },
    });

    // Propagate the decision to the content row
    try {
      const newStatus = status as ModerationStatus;
      if (record.contentType === ContentType.POST) {
        await prisma.post.update({
          where: { id: record.contentId },
          data: { moderationStatus: newStatus },
        });
      } else if (record.contentType === ContentType.REPLY) {
        await prisma.reply.update({
          where: { id: record.contentId },
          data: { moderationStatus: newStatus },
        });
      } else if (record.contentType === ContentType.COMMENT) {
        await prisma.comment.update({
          where: { id: record.contentId },
          data: { moderationStatus: newStatus },
        });
      }
    } catch {
      // Non-fatal — the moderation record itself is updated
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
