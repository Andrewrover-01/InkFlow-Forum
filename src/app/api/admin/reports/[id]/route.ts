import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"]),
  reviewNote: z.string().max(500).optional(),
});

// PATCH /api/admin/reports/[id] — resolve or dismiss a user report
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")
  ) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { status, reviewNote } = patchSchema.parse(body);

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: "举报记录不存在" }, { status: 404 });
    }

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status,
        reviewerId: session.user.id,
        reviewNote: reviewNote ?? null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
