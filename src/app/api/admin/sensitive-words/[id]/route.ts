/**
 * PATCH  /api/admin/sensitive-words/[id]  — update word, severity or active flag
 * DELETE /api/admin/sensitive-words/[id]  — remove a word
 *
 * Accessible by ADMIN and MODERATOR roles.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rebuildCustomWords } from "@/lib/word-filter";

const updateSchema = z.object({
  word:     z.string().min(1).max(50).trim().optional(),
  severity: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isPrivileged(role: string | undefined) {
  return role === "ADMIN" || role === "MODERATOR";
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isPrivileged(session.user.role)) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  let parsed: z.infer<typeof updateSchema>;
  try {
    const body = await req.json();
    parsed = updateSchema.parse(body);
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
    const updated = await prisma.sensitiveWord.update({
      where: { id },
      data: {
        ...(parsed.word     !== undefined && { word:     parsed.word     }),
        ...(parsed.severity !== undefined && { severity: parsed.severity }),
        ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
      },
    });
    await rebuildCustomWords();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "敏感词不存在" }, { status: 404 });
    }
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "该词语已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isPrivileged(session.user.role)) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.sensitiveWord.delete({ where: { id } });
    await rebuildCustomWords();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "敏感词不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
