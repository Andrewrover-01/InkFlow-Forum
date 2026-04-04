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

const createPostSchema = z.object({
  title: z.string().min(4, "标题至少4个字符").max(100, "标题最多100个字符"),
  content: z.string().min(10, "内容至少10个字符"),
  summary: z.string().max(200).optional(),
  categoryId: z.string().min(1, "请选择版块"),
  tags: z.array(z.string()).optional(),
});

const pipeline = new SecurityPipeline()
  .use(requireAuthPlugin())
  .use(abuseGatePlugin("post"))
  .use(sanitizePlugin())
  .use(captchaPlugin("post"));

// GET /api/posts?page=1&limit=20 — paginated post list (admin-friendly)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const skip = (page - 1) * limit;

  try {
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { status: { not: "DELETED" } },
        include: {
          author: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { replies: true, likes: true } },
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.post.count({ where: { status: { not: "DELETED" } } }),
    ]);
    return NextResponse.json({ posts, total, page, pageSize: limit });
  } catch {
    return NextResponse.json({ posts: [], total: 0, page, pageSize: limit });
  }
}

export async function POST(req: NextRequest) {
  const { blocked, response, ctx } = await pipeline.run(req);
  if (blocked) return response!;

  const session = ctx.session!;

  try {
    const { title, content, summary, categoryId, tags } = createPostSchema.parse(ctx.body);

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
