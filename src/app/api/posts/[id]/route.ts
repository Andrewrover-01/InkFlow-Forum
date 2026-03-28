import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updatePostSchema = z.object({
  title: z.string().min(4, "标题至少4个字符").max(100, "标题最多100个字符").optional(),
  content: z.string().min(10, "内容至少10个字符").optional(),
  summary: z.string().max(200).optional(),
  categoryId: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  // Moderator/Admin only
  isPinned: z.boolean().optional(),
  isLocked: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/posts/[id] — fetch a single post (for the edit form)
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  try {
    const post = await prisma.post.findUnique({
      where: { id, status: { not: "DELETED" } },
      include: {
        tags: { include: { tag: true } },
      },
    });
    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// PATCH /api/posts/[id] — edit post (author or admin)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const post = await prisma.post.findUnique({
      where: { id, status: { not: "DELETED" } },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    const isAuthor = post.authorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "MODERATOR";
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "无权编辑此帖" }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, summary, categoryId, tags, isPinned, isLocked } = updatePostSchema.parse(body);

    // isPinned / isLocked require MODERATOR or ADMIN
    const isModerator = session.user.role === "ADMIN" || session.user.role === "MODERATOR";
    if ((isPinned !== undefined || isLocked !== undefined) && !isModerator) {
      return NextResponse.json({ error: "需要版主或管理员权限" }, { status: 403 });
    }

    // Replace tags if provided
    const tagsData =
      tags !== undefined
        ? {
            deleteMany: {},
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
          }
        : undefined;

    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(summary !== undefined && { summary }),
        ...(categoryId !== undefined && { categoryId }),
        ...(tagsData !== undefined && { tags: tagsData }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isLocked !== undefined && { isLocked }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("Update post error:", error);
    return NextResponse.json({ error: "编辑失败，请稍后重试" }, { status: 500 });
  }
}

// DELETE /api/posts/[id] — soft-delete post (author or admin)
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true },
    });

    if (!post || post.status === "DELETED") {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    const isAuthor = post.authorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "MODERATOR";
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "无权删除此帖" }, { status: 403 });
    }

    await prisma.post.update({
      where: { id },
      data: { status: "DELETED" },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}
