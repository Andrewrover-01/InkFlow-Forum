import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "slug只能包含小写字母、数字和连字符").optional(),
  icon: z.string().max(10).optional(),
  sortOrder: z.number().int().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/categories/[id]
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, description, slug, icon, sortOrder } = updateSchema.parse(body);

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(slug !== undefined && { slug }),
        ...(icon !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: { _count: { select: { posts: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/admin/categories/[id]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const postCount = await prisma.post.count({
      where: { categoryId: id, status: { not: "DELETED" } },
    });

    if (postCount > 0) {
      return NextResponse.json(
        { error: `该版块下还有 ${postCount} 篇帖子，请先移动或删除帖子` },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
