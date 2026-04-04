import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addToBlacklist } from "@/lib/blacklist";
import { z } from "zod";
import { BlacklistType, BlacklistLevel } from "@prisma/client";

const PAGE_SIZE = 20;

const createSchema = z.object({
  key: z.string().min(1, "标识符不能为空"),
  type: z.nativeEnum(BlacklistType),
  level: z.nativeEnum(BlacklistLevel),
  reason: z.string().max(200).optional(),
  expiresAt: z.string().datetime().optional(),
});

// GET /api/admin/blacklist?page=1&type=IP&level=BLACK&q=
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const q = searchParams.get("q")?.trim();
  const typeFilter = searchParams.get("type") as BlacklistType | null;
  const levelFilter = searchParams.get("level") as BlacklistLevel | null;

  const where = {
    ...(q ? { key: { contains: q } } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(levelFilter ? { level: levelFilter } : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.blacklistEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.blacklistEntry.count({ where }),
  ]);

  return NextResponse.json({ entries, total, page, pageSize: PAGE_SIZE });
}

// POST /api/admin/blacklist  — add or upsert an entry
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { key, type, level, reason, expiresAt } = createSchema.parse(body);

    await addToBlacklist(
      key,
      type,
      level,
      reason,
      expiresAt ? new Date(expiresAt) : undefined
    );

    const entry = await prisma.blacklistEntry.findUnique({
      where: { key_type: { key, type } },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("Blacklist create error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
