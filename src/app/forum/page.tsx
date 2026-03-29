import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import { MessageSquare, Eye, Heart, Pin, Lock, PenLine } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface ForumPageProps {
  searchParams: Promise<{ page?: string }>;
}

async function getPosts(page: number) {
  const skip = (page - 1) * PAGE_SIZE;
  try {
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { status: { not: "DELETED" } },
        include: {
          author: { select: { id: true, name: true, image: true } },
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: true } },
          _count: { select: { replies: true, likes: true } },
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: PAGE_SIZE,
      }),
      prisma.post.count({ where: { status: { not: "DELETED" } } }),
    ]);
    return { posts, total };
  } catch {
    return { posts: [], total: 0 };
  }
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const [session, { posts, total }] = await Promise.all([
    getServerSession(authOptions),
    getPosts(page),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-ink-800">论坛首页</h1>
          <p className="text-sm font-sans text-ink-400 mt-0.5">
            共 {total} 篇帖子
          </p>
        </div>
        {session && (
          <Link href="/post/create" className="btn-primary flex items-center gap-1.5">
            <PenLine className="w-4 h-4" />
            发新帖
          </Link>
        )}
      </div>

      {/* Post list */}
      <div className="space-y-2">
        {posts.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-ink-400 font-sans">暂无帖子，快来发第一帖！</p>
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
                      <span className="text-xs font-sans bg-parchment-200 text-ink-500 px-2 py-0.5 rounded-full">
                        {post.category.name}
                      </span>
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
        basePath="/forum"
      />
    </div>
  );
}
