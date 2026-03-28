import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { UserRole } from "@prisma/client";

const updateSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/users/[id] — update role
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent demoting self
  if (id === session.user.id) {
    return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { role } = updateSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id },
      data: { ...(role !== undefined && { role }) },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
