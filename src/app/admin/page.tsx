import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import {
  Users,
  FileText,
  FolderOpen,
  MessageSquare,
  LayoutDashboard,
  ShieldCheck,
  Flag,
  ShieldAlert,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const [userCount, postCount, categoryCount, replyCount, pendingModerationCount, pendingReportCount, sensitiveWordCount, latestPosts] =
    await Promise.all([
      prisma.user.count(),
      prisma.post.count({ where: { status: { not: "DELETED" } } }),
      prisma.category.count(),
      prisma.reply.count(),
      prisma.moderationRecord.count({ where: { status: "PENDING" } }),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.sensitiveWord.count({ where: { isActive: true } }),
      prisma.post.findMany({
        where: { status: { not: "DELETED" } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          author: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { replies: true } },
        },
      }),
    ]);
  return { userCount, postCount, categoryCount, replyCount, pendingModerationCount, pendingReportCount, sensitiveWordCount, latestPosts };
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const { userCount, postCount, categoryCount, replyCount, pendingModerationCount, pendingReportCount, sensitiveWordCount, latestPosts } =
    await getStats();

  const statCards = [
    { icon: Users,        label: "注册用户",   value: userCount,               href: "/admin/users"           },
    { icon: FileText,     label: "发布帖子",   value: postCount,               href: "/admin/posts"           },
    { icon: FolderOpen,   label: "版块分类",   value: categoryCount,           href: "/admin/categories"      },
    { icon: MessageSquare,label: "回复总数",   value: replyCount,              href: "/admin/posts"           },
    { icon: ShieldCheck,  label: "待人工审核", value: pendingModerationCount,  href: "/admin/moderation"      },
    { icon: Flag,         label: "待处理举报", value: pendingReportCount,      href: "/admin/reports"         },
    { icon: ShieldAlert,  label: "活跃敏感词", value: sensitiveWordCount,      href: "/admin/sensitive-words" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <LayoutDashboard className="w-5 h-5 text-cinnabar-600" />
        <h1 className="text-2xl font-serif text-ink-800">管理后台</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statCards.map(({ icon: Icon, label, value, href }) => (
          <Link key={label} href={href}>
            <div className="card p-5 hover:shadow-md transition-shadow text-center">
              <Icon className="w-6 h-6 text-cinnabar-500 mx-auto mb-2" />
              <p className="text-2xl font-serif text-ink-800">{value}</p>
              <p className="text-xs font-sans text-ink-400 mt-1">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { href: "/admin/users",          label: "用户管理", desc: "查看/搜索用户，修改角色" },
          { href: "/admin/posts",          label: "帖子管理", desc: "置顶、锁定、删除帖子" },
          { href: "/admin/categories",     label: "版块管理", desc: "创建/编辑/删除版块" },
          { href: "/admin/blacklist",      label: "黑灰名单", desc: "管理封禁 IP、设备指纹、账号" },
          { href: "/admin/moderation",     label: "内容审核", desc: "机器标记内容人工复审" },
          { href: "/admin/reports",        label: "用户举报", desc: "处理用户提交的违规举报" },
          { href: "/admin/sensitive-words",label: "敏感词库", desc: "管理自定义敏感词，启用/禁用" },
        ].map(({ href, label, desc }) => (
          <Link key={href} href={href}>
            <div className="card p-4 hover:shadow-md transition-shadow">
              <p className="font-serif text-ink-800 mb-1">{label}</p>
              <p className="text-xs font-sans text-ink-400">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Latest posts */}
      <div className="space-y-2">
        <h2 className="text-base font-serif text-ink-700">最新帖子</h2>
        <div className="card divide-y divide-parchment-200">
          {latestPosts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-parchment-100/50"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/post/${post.id}`}
                  className="font-sans text-sm text-ink-700 hover:text-cinnabar-600 transition-colors truncate block"
                >
                  {post.title}
                </Link>
                <p className="text-xs font-sans text-ink-400 mt-0.5">
                  {post.author.name} · {post.category.name} ·{" "}
                  {formatRelativeTime(post.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-400 font-sans flex-shrink-0">
                <MessageSquare className="w-3 h-3" />
                {post._count.replies}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
