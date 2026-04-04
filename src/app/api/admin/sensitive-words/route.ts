import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { invalidateWordFilterCache } from "@/lib/word-filter";

const PAGE_SIZE = 50;

const createSchema = z.object({
  word: z.string().min(1, "词语不能为空").max(50, "词语最多50个字符"),
  category: z.enum(["basic", "novel", "custom"]).default("custom"),
  isActive: z.boolean().default(true),
});

// GET /api/admin/sensitive-words?page=1&q=&category=
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")
  ) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const page = Math.max(
    1,
    parseInt(searchParams.get("page") ?? "1", 10) || 1
  );
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(q ? { word: { contains: q } } : {}),
    ...(category ? { category } : {}),
  };

  const [words, total] = await Promise.all([
    prisma.sensitiveWord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.sensitiveWord.count({ where }),
  ]);

  return NextResponse.json({ words, total, page, pageSize: PAGE_SIZE });
}

// POST /api/admin/sensitive-words
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")
  ) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { word, category, isActive } = createSchema.parse(body);

    const created = await prisma.sensitiveWord.create({
      data: { word, category, isActive },
    });

    invalidateWordFilterCache();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json({ error: "该词语已存在" }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
