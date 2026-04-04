import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { abuseGate } from "@/lib/abuse-gate";

const commentSchema = z.object({
  replyId: z.string().min(1),
  content: z.string().min(1).max(500),
  parentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const blocked = await abuseGate({ action: "comment", userId: session.user.id, req });
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const { replyId, content, parentId } = commentSchema.parse(body);

    const comment = await prisma.comment.create({
      data: {
        content,
        replyId,
        parentId: parentId || null,
        authorId: session.user.id,
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
