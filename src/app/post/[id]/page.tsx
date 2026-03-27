import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Eye, Heart, MessageSquare, User, Pin, Lock, Tag } from "lucide-react";
import { ReplyForm } from "@/components/reply-form";
import { ReplyItem } from "@/components/reply-item";

export const dynamic = "force-dynamic";

interface PostPageProps {
  params: { id: string };
}

async function getPost(id: string) {
  return await prisma.post.findUnique({
    where: { id, status: { not: "DELETED" } },
    include: {
      author: { select: { id: true, name: true, image: true, bio: true } },
      category: { select: { id: true, name: true, slug: true } },
      tags: { include: { tag: true } },
      replies: {
        orderBy: { floor: "asc" },
        include: {
          author: { select: { id: true, name: true, image: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, name: true, image: true } },
              children: {
                include: {
                  author: { select: { id: true, name: true, image: true } },
                },
              },
            },
            where: { parentId: null },
          },
          _count: { select: { likes: true, comments: true } },
        },
      },
      _count: { select: { likes: true, replies: true } },
    },
  });
}

export default async function PostPage({ params }: PostPageProps) {
  const [session, post] = await Promise.all([
    getServerSession(authOptions),
    getPost(params.id),
  ]);

  if (!post) notFound();

  // Increment view count (fire-and-forget)
  prisma.post.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  return (
    <div className="space-y-4">
      {/* Post header */}
      <article className="card p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-sans text-ink-400 mb-4">
          <a href="/forum" className="hover:text-cinnabar-600 transition-colors">
            论坛首页
          </a>
          <span>›</span>
          <a
            href={`/categories/${post.category.slug}`}
            className="hover:text-cinnabar-600 transition-colors"
          >
            {post.category.name}
          </a>
          <span>›</span>
          <span className="text-ink-600 truncate max-w-[200px]">{post.title}</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-2 mb-3">
          {post.isPinned && <Pin className="w-4 h-4 text-cinnabar-500 flex-shrink-0 mt-1" />}
          {post.isLocked && <Lock className="w-4 h-4 text-ink-400 flex-shrink-0 mt-1" />}
          <h1 className="text-2xl font-serif text-ink-800 leading-snug">{post.title}</h1>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-3 h-3 text-ink-400" />
            {post.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="text-xs font-sans text-jade-600 bg-jade-50 px-2 py-0.5 rounded-full border border-jade-200"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Author info */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-parchment-200">
          <div className="w-9 h-9 rounded-full bg-cinnabar-100 border border-cinnabar-200 flex items-center justify-center flex-shrink-0">
            {post.author.image ? (
              <img
                src={post.author.image}
                alt={post.author.name || ""}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-cinnabar-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-sans text-ink-700 font-medium">
              {post.author.name}
            </p>
            <p className="text-xs font-sans text-ink-400">
              {formatRelativeTime(post.createdAt)}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs font-sans text-ink-400">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> {post.viewCount}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" /> {post._count.likes}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> {post._count.replies}楼
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-sm max-w-none font-sans text-ink-700 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>
      </article>

      {/* Replies (楼层) */}
      <div className="space-y-3">
        <h2 className="text-base font-serif text-ink-700 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          回复 · 共 {post._count.replies} 楼
        </h2>

        {post.replies.map((reply) => (
          <ReplyItem
            key={reply.id}
            reply={reply}
            currentUserId={session?.user?.id}
          />
        ))}
      </div>

      {/* Reply form */}
      {session ? (
        !post.isLocked ? (
          <ReplyForm postId={post.id} />
        ) : (
          <div className="card p-4 text-center text-ink-400 text-sm font-sans">
            <Lock className="w-4 h-4 mx-auto mb-1" />
            帖子已锁定，无法回复
          </div>
        )
      ) : (
        <div className="card p-4 text-center text-sm font-sans text-ink-400">
          <a href="/auth/login" className="text-cinnabar-600 hover:text-cinnabar-700">
            登录
          </a>{" "}
          后方可回复
        </div>
      )}
    </div>
  );
}
