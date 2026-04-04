/**
 * GET /api/admin/moderation
 * List moderation records that are pending human review.
 * Accessible by ADMIN and MODERATOR roles.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ModerationStatus, ModerationTargetType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")
  ) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10) || 1);
  const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const skip   = (page - 1) * limit;
  const status = (searchParams.get("status") ?? "PENDING") as ModerationStatus;
  const type   = searchParams.get("type") as ModerationTargetType | null;

  const where = {
    status,
    ...(type ? { targetType: type } : {}),
  };

  try {
    const [records, total] = await Promise.all([
      prisma.moderationRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take:    limit,
        include: {
          post: {
            select: {
              id: true, title: true,
              author: { select: { id: true, name: true } },
            },
          },
          reply: {
            select: {
              id: true, content: true, floor: true,
              author: { select: { id: true, name: true } },
              post:   { select: { id: true, title: true } },
            },
          },
          comment: {
            select: {
              id: true, content: true,
              author: { select: { id: true, name: true } },
            },
          },
          reviewer: { select: { id: true, name: true } },
        },
      }),
      prisma.moderationRecord.count({ where }),
    ]);

    return NextResponse.json({ records, total, page, pageSize: limit });
  } catch {
    return NextResponse.json({ error: "获取审核列表失败" }, { status: 500 });
  }
}
