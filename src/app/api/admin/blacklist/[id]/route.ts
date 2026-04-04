import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeFromBlacklist } from "@/lib/blacklist";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// DELETE /api/admin/blacklist/[id]
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  const entry = await prisma.blacklistEntry.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json({ error: "条目不存在" }, { status: 404 });
  }

  await removeFromBlacklist(entry.key, entry.type);
  return NextResponse.json({ success: true });
}
