import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// DELETE /api/replies/[id] — author or admin/moderator can delete
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  const reply = await prisma.reply.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  });

  if (!reply) {
    return NextResponse.json({ error: "回复不存在" }, { status: 404 });
  }

  const isAuthor = reply.authorId === session.user.id;
  const isMod = session.user.role === "ADMIN" || session.user.role === "MODERATOR";

  if (!isAuthor && !isMod) {
    return NextResponse.json({ error: "无权删除此回复" }, { status: 403 });
  }

  try {
    await prisma.reply.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
