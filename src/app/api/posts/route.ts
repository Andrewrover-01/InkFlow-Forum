import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(4, "标题至少4个字符").max(100, "标题最多100个字符"),
  content: z.string().min(10, "内容至少10个字符"),
  summary: z.string().max(200).optional(),
  categoryId: z.string().min(1, "请选择版块"),
  tags: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, content, summary, categoryId, tags } = createPostSchema.parse(body);

    const post = await prisma.post.create({
      data: {
        title,
        content,
        summary,
        authorId: session.user.id,
        categoryId,
        tags: tags && tags.length > 0 ? {
          create: await Promise.all(
            tags.map(async (tagName) => {
              const tag = await prisma.tag.upsert({
                where: { name: tagName },
                update: {},
                create: { name: tagName },
              });
              return { tagId: tag.id };
            })
          ),
        } : undefined,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("Create post error:", error);
    return NextResponse.json({ error: "发帖失败，请稍后重试" }, { status: 500 });
  }
}
