/**
 * GET  /api/admin/sensitive-words  — paginated list with optional search
 * POST /api/admin/sensitive-words  — add a new custom sensitive word
 *
 * Accessible by ADMIN and MODERATOR roles.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { SensitiveWordCategory } from "@prisma/client";
import { rebuildCustomWords } from "@/lib/word-filter";

const createSchema = z.object({
  word:     z.string().min(1, "词语不能为空").max(50, "词语最多50个字符").trim(),
  category: z.nativeEnum(SensitiveWordCategory).optional().default("CUSTOM"),
  severity: z.number().int().min(0).max(100).optional().default(50),
});

function isPrivileged(role: string | undefined) {
  return role === "ADMIN" || role === "MODERATOR";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isPrivileged(session.user.role)) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10) || 1);
  const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const skip     = (page - 1) * limit;
  const q        = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category") as SensitiveWordCategory | null;

  const where = {
    ...(q        ? { word:     { contains: q,         mode: "insensitive" as const } } : {}),
    ...(category ? { category: category } : {}),
  };

  try {
    const [words, total] = await Promise.all([
      prisma.sensitiveWord.findMany({
        where,
        orderBy: [{ category: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.sensitiveWord.count({ where }),
    ]);
    return NextResponse.json({ words, total, page, pageSize: limit });
  } catch {
    return NextResponse.json({ error: "获取敏感词列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isPrivileged(session.user.role)) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  let parsed: z.infer<typeof createSchema>;
  try {
    const body = await req.json();
    parsed = createSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "无效的请求格式" }, { status: 400 });
  }

  try {
    const word = await prisma.sensitiveWord.create({
      data: {
        word:      parsed.word,
        category:  parsed.category,
        severity:  parsed.severity,
        createdBy: session.user.id,
      },
    });
    // Invalidate Trie cache so the new word takes effect immediately
    await rebuildCustomWords();
    return NextResponse.json(word, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "该词语已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: "添加敏感词失败" }, { status: 500 });
  }
}
