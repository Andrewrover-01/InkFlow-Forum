import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ContentType, ReportReason } from "@prisma/client";

const reportSchema = z.object({
  contentType: z.nativeEnum(ContentType),
  contentId: z.string().min(1),
  reason: z.nativeEnum(ReportReason),
  description: z.string().max(500).optional(),
});

// POST /api/reports — authenticated user submits a report
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { contentType, contentId, reason, description } =
      reportSchema.parse(body);

    // Prevent duplicate pending report from the same user for the same content
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: session.user.id,
        contentType,
        contentId,
        status: "PENDING",
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "您已举报过该内容，请等待处理" },
        { status: 409 }
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId: session.user.id,
        contentType,
        contentId,
        reason,
        description: description ?? null,
      },
    });

    return NextResponse.json(report, { status: 201 });
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
