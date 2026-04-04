import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { BlacklistLevel, invalidateCache } from "@/lib/blacklist";

const updateSchema = z.object({
  level: z.nativeEnum(BlacklistLevel).optional(),
  reason: z.string().max(500).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/blacklist/[id]
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { level, reason, expiresAt } = updateSchema.parse(body);

    const updated = await prisma.blacklistEntry.update({
      where: { id },
      data: {
        ...(level !== undefined && { level }),
        ...(reason !== undefined && { reason }),
        ...(expiresAt !== undefined && {
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        }),
      },
    });

    invalidateCache(updated.type, updated.value);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/admin/blacklist/[id]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const entry = await prisma.blacklistEntry.delete({ where: { id } });
    invalidateCache(entry.type, entry.value);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
