import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import { MessageSquare, Eye, Heart, Pin, Lock, PenLine } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pagination } from "@/components/pagination";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}

async function getCategory(slug: string) {
  try {
    return await prisma.category.findUnique({ where: { slug } });
  } catch {
    return null;
  }
}

async function getPosts(
  categoryId: string,
  page: number,
  sort: string
) {
  const skip = (page - 1) * PAGE_SIZE;

  const orderBy =
    sort === "hot"
      ? [{ isPinned: "desc" as const }, { viewCount: "desc" as const }]
      : [{ isPinned: "desc" as const }, { createdAt: "desc" as const }];

  try {
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { categoryId, status: { not: "DELETED" } },
        include: {
          author: { select: { id: true, name: true, image: true } },
          tags: { include: { tag: true } },
          _count: { select: { replies: true, likes: true } },
        },
        orderBy,
        skip,
        take: PAGE_SIZE,
      }),
      prisma.post.count({
        where: { categoryId, status: { not: "DELETED" } },
      }),
    ]);

    return { posts, total };
  } catch {
    return { posts: [], total: 0 };
  }
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  return { title: category?.name ?? "版块" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const { page: pageStr, sort = "latest" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const [session, category] = await Promise.all([
    getServerSession(authOptions),
    getCategory(slug),
  ]);

  if (!category) notFound();

  const { posts, total } = await getPosts(category.id, page, sort);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-sans text-ink-400">
        <Link href="/categories" className="hover:text-cinnabar-600 transition-colors">
          版块分类
        </Link>
        <span>›</span>
        <span className="text-ink-600">{category.name}</span>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-ink-800">{category.name}</h1>
          {category.description && (
            <p className="text-sm font-sans text-ink-400 mt-0.5">
              {category.description}
            </p>
          )}
          <p className="text-xs font-sans text-ink-400 mt-1">
            共 {total} 篇帖子
          </p>
        </div>
        {session && (
          <Link
            href="/post/create"
            className="btn-primary flex items-center gap-1.5"
          >
            <PenLine className="w-4 h-4" />
            发新帖
          </Link>
        )}
      </div>

      {/* Sort tabs */}
      <div className="flex items-center gap-2 text-sm font-sans">
        <Link
          href={`/categories/${slug}?sort=latest`}
          className={`px-3 py-1.5 rounded-sm transition-colors ${
            sort !== "hot"
              ? "bg-cinnabar-600 text-white"
              : "text-ink-500 hover:text-cinnabar-600 hover:bg-parchment-200"
          }`}
        >
          最新
        </Link>
        <Link
          href={`/categories/${slug}?sort=hot`}
          className={`px-3 py-1.5 rounded-sm transition-colors ${
            sort === "hot"
              ? "bg-cinnabar-600 text-white"
              : "text-ink-500 hover:text-cinnabar-600 hover:bg-parchment-200"
          }`}
        >
          最热
        </Link>
      </div>

      {/* Post list */}
      <div className="space-y-2">
        {posts.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-ink-400 font-sans">
              该版块暂无帖子，快来发第一帖！
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`}>
              <div className="post-card">
                <div className="flex items-start gap-3">
                  {/* Status badges */}
                  <div className="flex flex-col gap-1 pt-0.5">
                    {post.isPinned && (
                      <Pin className="w-3.5 h-3.5 text-cinnabar-500 flex-shrink-0" />
                    )}
                    {post.isLocked && (
                      <Lock className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {post.tags.map(({ tag }) => (
                        <span
                          key={tag.id}
                          className="text-xs font-sans text-jade-600 bg-jade-50 px-2 py-0.5 rounded-full border border-jade-200"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>

                    <h2 className="font-serif text-base text-ink-800 truncate hover:text-cinnabar-700 transition-colors">
                      {post.title}
                    </h2>

                    {post.summary && (
                      <p className="text-xs font-sans text-ink-400 mt-1 line-clamp-1">
                        {post.summary}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs font-sans text-ink-400">
                      <span>{post.author.name}</span>
                      <span>{formatRelativeTime(post.createdAt)}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {post.viewCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />{" "}
                        {post._count.replies}楼
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {post._count.likes}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath={`/categories/${slug}`}
        extraParams={sort !== "latest" ? { sort } : {}}
      />
    </div>
  );
}
