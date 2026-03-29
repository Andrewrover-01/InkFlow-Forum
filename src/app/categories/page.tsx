import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BookOpen, MessageSquare } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "版块分类",
};

export const dynamic = "force-dynamic";

async function getCategories() {
  try {
    return await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { posts: true } },
        posts: {
          where: { status: { not: "DELETED" } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            title: true,
            createdAt: true,
            author: { select: { name: true } },
          },
        },
      },
    });
  } catch {
    return [];
  }
}

const CATEGORY_ICONS: Record<string, string> = {
  wuxia: "⚔️",
  xianxia: "🌙",
  history: "📜",
  romance: "🌸",
  mystery: "🔮",
  fantasy: "🐉",
};

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-serif text-ink-800">版块分类</h1>
        <p className="text-sm font-sans text-ink-400 mt-0.5">
          共 {categories.length} 个版块
        </p>
      </div>

      {/* Category grid */}
      {categories.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-ink-400 font-sans">暂无版块，请联系管理员添加</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => {
            const latestPost = cat.posts[0];
            const icon = cat.icon ?? CATEGORY_ICONS[cat.slug] ?? "📖";

            return (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="card p-5 hover:shadow-md transition-shadow duration-200 group block"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="text-3xl flex-shrink-0 leading-none">{icon}</div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-serif text-base text-ink-800 group-hover:text-cinnabar-600 transition-colors">
                      {cat.name}
                    </h2>
                    {cat.description && (
                      <p className="text-xs font-sans text-ink-400 mt-0.5 line-clamp-2">
                        {cat.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-3 text-xs font-sans text-ink-400">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {cat._count.posts} 篇帖子
                      </span>
                    </div>

                    {/* Latest post */}
                    {latestPost && (
                      <div className="mt-2 pt-2 border-t border-parchment-200">
                        <div className="flex items-center gap-1 text-xs font-sans text-ink-400">
                          <BookOpen className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate text-ink-600">
                            {latestPost.title}
                          </span>
                          <span className="flex-shrink-0 ml-1">
                            · {latestPost.author.name}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
