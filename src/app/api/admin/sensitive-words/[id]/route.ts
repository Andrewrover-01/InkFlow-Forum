import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { invalidateWordFilterCache } from "@/lib/word-filter";

const patchSchema = z.object({
  word: z.string().min(1).max(50).optional(),
  category: z.enum(["basic", "novel", "custom"]).optional(),
  isActive: z.boolean().optional(),
});

function adminOrModerator(role: string) {
  return role === "ADMIN" || role === "MODERATOR";
}

// PATCH /api/admin/sensitive-words/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !adminOrModerator(session.user.role ?? "")) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    const updated = await prisma.sensitiveWord.update({
      where: { id },
      data,
    });

    invalidateWordFilterCache();
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// DELETE /api/admin/sensitive-words/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !adminOrModerator(session.user.role ?? "")) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.sensitiveWord.delete({ where: { id } });
    invalidateWordFilterCache();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
