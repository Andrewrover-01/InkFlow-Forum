import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { BlacklistType, BlacklistLevel, invalidateCache } from "@/lib/blacklist";

const createSchema = z.object({
  type: z.nativeEnum(BlacklistType),
  value: z.string().min(1, "值不能为空").max(255),
  level: z.nativeEnum(BlacklistLevel).default(BlacklistLevel.BLACK),
  reason: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

// GET /api/admin/blacklist?page=1&limit=20&type=IP&level=BLACK
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const typeFilter = searchParams.get("type") as BlacklistType | null;
  const levelFilter = searchParams.get("level") as BlacklistLevel | null;

  const where = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(levelFilter ? { level: levelFilter } : {}),
  };

  try {
    const [entries, total] = await Promise.all([
      prisma.blacklistEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blacklistEntry.count({ where }),
    ]);
    return NextResponse.json({ entries, total, page, pageSize: limit });
  } catch {
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST /api/admin/blacklist
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { type, value, level, reason, expiresAt } = createSchema.parse(body);

    const entry = await prisma.blacklistEntry.upsert({
      where: { type_value: { type, value } },
      update: {
        level,
        reason: reason ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: session.user.id,
      },
      create: {
        type,
        value,
        level,
        reason: reason ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: session.user.id,
      },
    });

    invalidateCache(type, value);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "输入无效" }, { status: 400 });
    }
    console.error("Blacklist create error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
