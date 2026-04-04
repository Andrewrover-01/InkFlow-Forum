import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  SecurityPipeline,
  requireAuthPlugin,
  abuseGatePlugin,
  sanitizePlugin,
  captchaPlugin,
} from "@/lib/api-security";
import { moderateContent } from "@/lib/content-moderator";
import { ContentType } from "@prisma/client";

const replySchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

const pipeline = new SecurityPipeline()
  .use(requireAuthPlugin())
  .use(abuseGatePlugin("reply"))
  .use(sanitizePlugin())
  .use(captchaPlugin("reply"));

export async function POST(req: NextRequest) {
  const { blocked, response, ctx } = await pipeline.run(req);
  if (blocked) return response!;

  const session = ctx.session!;

  try {
    const { postId, content } = replySchema.parse(ctx.body);

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

    // Machine moderation — fire and forget
    moderateContent(ContentType.REPLY, reply.id, content).catch(() => {});

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
