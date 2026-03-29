import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "slug只能包含小写字母、数字和连字符"),
  icon: z.string().max(10).optional(),
  sortOrder: z.number().int().optional(),
});

// GET /api/admin/categories — list all categories with counts
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const categories = await prisma.category.findMany({
    include: { _count: { select: { posts: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(categories);
}

// POST /api/admin/categories — create category
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, slug, icon, sortOrder } = createSchema.parse(body);

    const existing = await prisma.category.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existing) {
      return NextResponse.json({ error: "版块名称或 slug 已存在" }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        slug,
        icon,
        sortOrder: sortOrder ?? 0,
      },
      include: { _count: { select: { posts: true } } },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
