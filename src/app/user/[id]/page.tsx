import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  User,
  CalendarDays,
  MessageSquare,
  Heart,
  PenLine,
  Settings,
  Eye,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface UserPageProps {
  params: Promise<{ id: string }>;
}

async function getUserProfile(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      bio: true,
      image: true,
      role: true,
      createdAt: true,
      _count: {
        select: { posts: true, replies: true, likes: true },
      },
      posts: {
        where: { status: { not: "DELETED" } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: true } },
          _count: { select: { replies: true, likes: true } },
        },
      },
    },
  });
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "管理员",
  MODERATOR: "版主",
  MEMBER: "会员",
  GUEST: "游客",
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "text-cinnabar-600 bg-cinnabar-50 border-cinnabar-200",
  MODERATOR: "text-jade-700 bg-jade-50 border-jade-200",
  MEMBER: "text-ink-600 bg-parchment-100 border-parchment-300",
  GUEST: "text-ink-400 bg-parchment-50 border-parchment-200",
};

export default async function UserProfilePage({ params }: UserPageProps) {
  const { id } = await params;
  const [session, user] = await Promise.all([
    getServerSession(authOptions),
    getUserProfile(id),
  ]);

  if (!user) notFound();

  const isSelf = session?.user?.id === user.id;

  return (
    <div className="space-y-5">
      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-cinnabar-100 border-2 border-cinnabar-200 flex items-center justify-center flex-shrink-0">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || ""}
                width={64}
                height={64}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-7 h-7 text-cinnabar-600" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-serif text-ink-800">
                {user.name || "匿名用户"}
              </h1>
              <span
                className={`text-xs font-sans px-2 py-0.5 rounded-full border ${
                  ROLE_COLOR[user.role] ?? ROLE_COLOR.MEMBER
                }`}
              >
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </div>

            {user.bio && (
              <p className="text-sm font-sans text-ink-500 mt-1 leading-relaxed">
                {user.bio}
              </p>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs font-sans text-ink-400">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {new Date(user.createdAt).toLocaleDateString("zh-CN")} 加入
              </span>
              <span className="flex items-center gap-1">
                <PenLine className="w-3.5 h-3.5" />
                {user._count.posts} 帖
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {user._count.replies} 回复
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                {user._count.likes} 赞
              </span>
            </div>
          </div>

          {/* Settings button (own profile) */}
          {isSelf && (
            <Link
              href="/settings"
              className="flex items-center gap-1.5 text-xs font-sans text-ink-500 hover:text-cinnabar-600 transition-colors border border-parchment-400 rounded-sm px-3 py-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              编辑资料
            </Link>
          )}
        </div>
      </div>

      {/* Posts list */}
      <div className="space-y-3">
        <h2 className="text-base font-serif text-ink-700 flex items-center gap-2">
          <PenLine className="w-4 h-4" />
          发布的帖子 · 共 {user._count.posts} 篇
        </h2>

        {user.posts.length === 0 ? (
          <div className="card p-8 text-center text-ink-400 font-sans text-sm">
            还没有发布帖子
          </div>
        ) : (
          <div className="space-y-2">
            {user.posts.map((post) => (
              <Link key={post.id} href={`/post/${post.id}`}>
                <div className="post-card">
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

                    <h3 className="font-serif text-base text-ink-800 truncate hover:text-cinnabar-700 transition-colors">
                      {post.title}
                    </h3>

                    <div className="flex items-center gap-4 mt-2 text-xs font-sans text-ink-400">
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
