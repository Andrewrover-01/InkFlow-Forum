import Link from "next/link";
import { BookOpen, Feather, Users, MessageSquare } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-12 px-4">
        <div className="inline-flex items-center gap-2 bg-cinnabar-50 border border-cinnabar-200 rounded-full px-4 py-1.5 mb-6">
          <Feather className="w-3.5 h-3.5 text-cinnabar-600" />
          <span className="text-xs font-sans text-cinnabar-700">古风小说社区</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif text-ink-800 mb-4 tracking-wide">
          墨香论坛
        </h1>
        <p className="text-ink-500 font-sans text-base md:text-lg max-w-xl mx-auto leading-relaxed">
          探索古典文学与历史的世界，与志同道合的文人墨客共话诗书，分享你的故事与感悟
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link href="/forum" className="btn-primary px-6 py-2.5 text-base">
            进入论坛
          </Link>
          <Link href="/auth/register" className="btn-secondary px-6 py-2.5 text-base">
            免费注册
          </Link>
        </div>
      </section>

      {/* Stats Row */}
      <section className="grid grid-cols-3 gap-4">
        {[
          { icon: Users, label: "注册会员", value: "1,024" },
          { icon: BookOpen, label: "精彩帖子", value: "8,192" },
          { icon: MessageSquare, label: "楼层评论", value: "65,536" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-4 text-center">
            <Icon className="w-5 h-5 text-cinnabar-500 mx-auto mb-2" />
            <p className="text-2xl font-serif text-ink-800 font-semibold">{value}</p>
            <p className="text-xs font-sans text-ink-400 mt-0.5">{label}</p>
          </div>
        ))}
      </section>

      {/* Categories Preview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif text-ink-700">版块分类</h2>
          <Link
            href="/categories"
            className="text-xs font-sans text-cinnabar-600 hover:text-cinnabar-700 transition-colors"
          >
            查看全部 →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: "武侠江湖", icon: "⚔️", desc: "侠义恩仇录", slug: "wuxia" },
            { name: "仙侠修真", icon: "🌙", desc: "飞升问道路", slug: "xianxia" },
            { name: "历史风云", icon: "📜", desc: "朝代更迭史", slug: "history" },
            { name: "言情才女", icon: "🌸", desc: "红粉佳人传", slug: "romance" },
          ].map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="card p-4 hover:shadow-md transition-shadow duration-200 group"
            >
              <div className="text-2xl mb-2">{cat.icon}</div>
              <h3 className="font-serif text-sm text-ink-800 group-hover:text-cinnabar-600 transition-colors">
                {cat.name}
              </h3>
              <p className="text-xs font-sans text-ink-400 mt-1">{cat.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Forum entrance CTA */}
      <section className="card p-6 text-center bg-gradient-to-br from-parchment-50 to-parchment-100">
        <p className="font-serif text-ink-600 text-base mb-4">
          &ldquo;读万卷书，行万里路&rdquo; — 欢迎加入墨香论坛
        </p>
        <Link href="/forum" className="btn-primary inline-flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          浏览最新帖子
        </Link>
      </section>
    </div>
  );
}
