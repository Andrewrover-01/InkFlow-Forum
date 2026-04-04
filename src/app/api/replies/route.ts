import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkAbuse } from "@/lib/abuse-gate";

const replySchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const gate = await checkAbuse({ action: "reply", userId: session.user.id, req });
  if (gate.blocked) return gate.response!;

  try {
    const body = await req.json();
    const { postId, content } = replySchema.parse(body);

    const post = await prisma.post.findUnique({
      where: { id: postId, status: { not: "DELETED" } },
    });

    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    if (post.isLocked) {
      return NextResponse.json({ error: "帖子已锁定" }, { status: 403 });
    }

    // Get current floor count
    const lastReply = await prisma.reply.findFirst({
      where: { postId },
      orderBy: { floor: "desc" },
    });

    const floor = (lastReply?.floor ?? 0) + 1;

    const reply = await prisma.reply.create({
      data: {
        content,
        floor,
        postId,
        authorId: session.user.id,
      },
    });

    // Notify post author (skip if author is replying to their own post)
    if (post.authorId !== session.user.id) {
      prisma.notification
        .create({
          data: {
            userId: post.authorId,
            type: "REPLY",
            fromUserId: session.user.id,
            postId: post.id,
            replyId: reply.id,
          },
        })
        .catch(() => {
          // Notification failure should not block the reply response
        });
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
