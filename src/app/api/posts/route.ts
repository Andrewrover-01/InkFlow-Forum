import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  buildSecurityContext,
  createSecurityPipeline,
  authPlugin,
  abuseGatePlugin,
  captchaPlugin,
  sanitizePlugin,
} from "@/lib/api-security";
import { moderateContent } from "@/lib/content-moderator";

const createPostSchema = z.object({
  title: z.string().min(4, "标题至少4个字符").max(100, "标题最多100个字符"),
  content: z.string().min(10, "内容至少10个字符"),
  summary: z.string().max(200).optional(),
  categoryId: z.string().min(1, "请选择版块"),
  tags: z.array(z.string()).optional(),
  captchaToken: z.string().optional(),
  captchaAnswer: z.number().optional(),
});

// GET /api/posts?page=1&limit=20 — paginated post list (admin-friendly)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const skip = (page - 1) * limit;

  try {
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { status: { not: "DELETED" } },
        include: {
          author: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { replies: true, likes: true } },
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.post.count({ where: { status: { not: "DELETED" } } }),
    ]);
    return NextResponse.json({ posts, total, page, pageSize: limit });
  } catch {
    return NextResponse.json({ posts: [], total: 0, page, pageSize: limit });
  }
}

export async function POST(req: NextRequest) {
  // Build shared security context (resolves session, IP, fingerprint once)
  const ctx = await buildSecurityContext(req);

  // ── Pre-body security checks (auth + abuse gate) ───────────────────────────
  const preGuard = await createSecurityPipeline([
    authPlugin(),
    abuseGatePlugin("post"),
  ]).run(ctx);
  if (preGuard) return preGuard;

  // ── Parse and validate request body ───────────────────────────────────────
  let parsed: z.infer<typeof createPostSchema>;
  try {
    const body = await req.json();
    parsed = createPostSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "无效的请求格式" }, { status: 400 });
  }

  // ── Body-level security checks (sanitize + captcha) ───────────────────────
  const bodyGuard = await createSecurityPipeline([
    sanitizePlugin(() => ({
      title:   parsed.title,
      content: parsed.content,
      summary: parsed.summary,
    })),
    captchaPlugin("post", () => parsed.captchaToken, () => parsed.captchaAnswer),
  ]).run(ctx);
  if (bodyGuard) return bodyGuard;

  // ── Machine content moderation ────────────────────────────────────────────
  const modResult = await moderateContent({
    textFields: [parsed.title, parsed.content, parsed.summary ?? ""],
  });

  if (modResult.status === "REJECTED") {
    return NextResponse.json(
      { error: `内容违规，无法发布：${modResult.reason ?? "包含违禁内容"}` },
      { status: 422 },
    );
  }

  // ── Business logic ─────────────────────────────────────────────────────────
  try {
    const post = await prisma.post.create({
      data: {
        title:            parsed.title,
        content:          parsed.content,
        summary:          parsed.summary,
        authorId:         ctx.session!.user!.id,
        categoryId:       parsed.categoryId,
        moderationStatus: modResult.status, // APPROVED or FLAGGED
        tags:
          parsed.tags && parsed.tags.length > 0
            ? {
                create: await Promise.all(
                  parsed.tags.map(async (tagName) => {
                    const tag = await prisma.tag.upsert({
                      where:  { name: tagName },
                      update: {},
                      create: { name: tagName },
                    });
                    return { tagId: tag.id };
                  }),
                ),
              }
            : undefined,
      },
    });

    // Persist the moderation audit record (fire-and-forget)
    if (modResult.status !== "APPROVED") {
      prisma.moderationRecord
        .create({
          data: {
            targetType: "POST",
            postId:     post.id,
            autoStatus: modResult.status,
            autoReason: modResult.reason,
            autoScore:  modResult.score,
            status:     "PENDING",
          },
        })
        .catch(() => {});
    }

    return NextResponse.json(
      {
        ...post,
        ...(modResult.status === "FLAGGED" && {
          warning: "您的帖子正在审核中，审核通过后将公开显示",
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "发帖失败，请稍后重试" }, { status: 500 });
  }
}
