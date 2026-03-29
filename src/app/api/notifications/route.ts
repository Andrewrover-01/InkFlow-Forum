import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

// GET /api/notifications — current user's notifications (paginated)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        type: true,
        isRead: true,
        createdAt: true,
        postId: true,
        replyId: true,
        fromUser: {
          select: { id: true, name: true, image: true },
        },
        post: {
          select: { id: true, title: true },
        },
        reply: {
          select: { id: true, floor: true },
        },
      },
    }),
    prisma.notification.count({ where: { userId: session.user.id } }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);

  return NextResponse.json({
    notifications,
    total,
    unreadCount,
    page,
    pageSize: PAGE_SIZE,
  });
}
