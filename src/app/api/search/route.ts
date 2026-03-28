import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  if (!q) {
    return NextResponse.json({ posts: [], total: 0, page, pageSize: PAGE_SIZE });
  }

  const skip = (page - 1) * PAGE_SIZE;

  try {
    const where = {
      status: { not: "DELETED" as const },
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { content: { contains: q, mode: "insensitive" as const } },
        { summary: { contains: q, mode: "insensitive" as const } },
        {
          tags: {
            some: {
              tag: { name: { contains: q, mode: "insensitive" as const } },
            },
          },
        },
      ],
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: true } },
          _count: { select: { replies: true, likes: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({ posts, total, page, pageSize: PAGE_SIZE });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ posts: [], total: 0, page, pageSize: PAGE_SIZE });
  }
}
