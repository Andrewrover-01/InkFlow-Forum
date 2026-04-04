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

const commentSchema = z.object({
  replyId: z.string().min(1),
  content: z.string().min(1).max(500),
  parentId: z.string().optional(),
});

const pipeline = new SecurityPipeline()
  .use(requireAuthPlugin())
  .use(abuseGatePlugin("comment"))
  .use(sanitizePlugin())
  .use(captchaPlugin("comment"));

export async function POST(req: NextRequest) {
  const { blocked, response, ctx } = await pipeline.run(req);
  if (blocked) return response!;

  const session = ctx.session!;

  try {
    const { replyId, content, parentId } = commentSchema.parse(ctx.body);

    const comment = await prisma.comment.create({
      data: {
        content,
        replyId,
        parentId: parentId || null,
        authorId: session.user.id,
      },
    });

    // Machine moderation — fire and forget
    moderateContent(ContentType.COMMENT, comment.id, content).catch(() => {});

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
