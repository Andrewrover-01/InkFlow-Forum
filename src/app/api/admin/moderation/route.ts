import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ModerationStatus, ContentType } from "@prisma/client";

const PAGE_SIZE = 20;

// GET /api/admin/moderation?status=PENDING&contentType=POST&page=1
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")
  ) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as ModerationStatus | null;
  const contentType = searchParams.get("contentType") as ContentType | null;
  const page = Math.max(
    1,
    parseInt(searchParams.get("page") ?? "1", 10) || 1
  );
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(status ? { status } : {}),
    ...(contentType ? { contentType } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.moderationRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        reviewer: { select: { id: true, name: true } },
      },
    }),
    prisma.moderationRecord.count({ where }),
  ]);

  return NextResponse.json({ records, total, page, pageSize: PAGE_SIZE });
}
