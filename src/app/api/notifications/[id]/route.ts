import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/notifications/[id] — mark single notification as read
export async function PATCH(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!notification) {
    return NextResponse.json({ error: "通知不存在" }, { status: 404 });
  }

  if (notification.userId !== session.user.id) {
    return NextResponse.json({ error: "无权操作此通知" }, { status: 403 });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
    select: { id: true, isRead: true },
  });

  return NextResponse.json(updated);
}
