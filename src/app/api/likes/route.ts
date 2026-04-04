import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkAbuse } from "@/lib/abuse-gate";

const likeSchema = z
  .object({
    postId: z.string().optional(),
    replyId: z.string().optional(),
    commentId: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(data.postId) || Boolean(data.replyId) || Boolean(data.commentId),
    { message: "必须指定点赞目标" }
  );

// Toggle like
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const gate = await checkAbuse({ action: "like", userId: session.user.id, req });
  if (gate.blocked) return gate.response!;

  try {
    const body = await req.json();
    const { postId, replyId, commentId } = likeSchema.parse(body);
    const userId = session.user.id;

    const existing = await prisma.like.findFirst({
      where: {
        userId,
        ...(postId ? { postId } : {}),
        ...(replyId ? { replyId } : {}),
        ...(commentId ? { commentId } : {}),
      },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    } else {
      await prisma.like.create({
        data: {
          userId,
          postId: postId ?? null,
          replyId: replyId ?? null,
          commentId: commentId ?? null,
        },
      });

      // Notify the owner of the liked content (skip self-likes)
      try {
        let targetOwnerId: string | null = null;
        let notifPostId: string | null = postId ?? null;
        const notifReplyId: string | null = replyId ?? null;

        if (postId) {
          const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { authorId: true },
          });
          targetOwnerId = post?.authorId ?? null;
        } else if (replyId) {
          const reply = await prisma.reply.findUnique({
            where: { id: replyId },
            select: { authorId: true, postId: true },
          });
          targetOwnerId = reply?.authorId ?? null;
          notifPostId = reply?.postId ?? null;
        }

        if (targetOwnerId && targetOwnerId !== userId) {
          await prisma.notification.create({
            data: {
              userId: targetOwnerId,
              type: "LIKE",
              fromUserId: userId,
              postId: notifPostId,
              replyId: notifReplyId,
            },
          });
        }
      } catch {
        // Notification failure should not block the like response
      }

      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("Like error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}

// Check like status
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ liked: false });
  }

  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId") ?? undefined;
  const replyId = searchParams.get("replyId") ?? undefined;
  const commentId = searchParams.get("commentId") ?? undefined;

  const existing = await prisma.like.findFirst({
    where: {
      userId: session.user.id,
      ...(postId ? { postId } : {}),
      ...(replyId ? { replyId } : {}),
      ...(commentId ? { commentId } : {}),
    },
  });

  return NextResponse.json({ liked: Boolean(existing) });
}
