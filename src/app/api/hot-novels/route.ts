import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Revalidate cached response every hour
export const revalidate = 3600;

export async function GET() {
  try {
    const novels = await prisma.hotNovel.findMany({
      orderBy: { rank: "asc" },
      take: 10,
      select: {
        id: true,
        rank: true,
        title: true,
        author: true,
        category: true,
        hotScore: true,
        sourceUrl: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(novels);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch hot novels" },
      { status: 500 }
    );
  }
}
