import { prisma } from "@/lib/prisma";
import { Flame } from "lucide-react";
import { unstable_cache } from "next/cache";

const getHotNovels = unstable_cache(
  async () => {
    try {
      return await prisma.hotNovel.findMany({
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
        },
      });
    } catch {
      return [];
    }
  },
  ["hot-novels"],
  { revalidate: 3600 } // cache for 1 hour
);

export async function HotNovelsSidebar() {
  const novels = await getHotNovels();

  const rankColors = [
    "text-cinnabar-600 font-bold",
    "text-cinnabar-500 font-bold",
    "text-cinnabar-400 font-bold",
  ];

  return (
    <aside className="card p-4 sticky top-4">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-3 pb-3 border-b border-parchment-300">
        <Flame className="w-4 h-4 text-cinnabar-500" />
        <h2 className="text-sm font-serif text-ink-800">热门小说</h2>
      </div>

      {novels.length === 0 ? (
        <p className="text-xs font-sans text-ink-400 text-center py-4">
          暂无数据
        </p>
      ) : (
        <ol className="space-y-2.5">
          {novels.map((novel) => (
            <li key={novel.id}>
              {novel.sourceUrl ? (
                <a
                  href={novel.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 group"
                >
                  <NovelRow novel={novel} rankColors={rankColors} />
                </a>
              ) : (
                <div className="flex items-start gap-2">
                  <NovelRow novel={novel} rankColors={rankColors} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <p className="text-center text-xs font-sans text-ink-300 mt-4 pt-3 border-t border-parchment-300">
        每小时更新
      </p>
    </aside>
  );
}

function NovelRow({
  novel,
  rankColors,
}: {
  novel: {
    rank: number;
    title: string;
    author: string;
    category: string;
    hotScore: number;
    sourceUrl: string | null;
  };
  rankColors: string[];
}) {
  const rankClass =
    novel.rank <= 3
      ? rankColors[novel.rank - 1]
      : "text-ink-400 font-sans";

  return (
    <>
      <span
        className={`text-xs w-5 flex-shrink-0 text-center mt-0.5 ${rankClass}`}
      >
        {novel.rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-serif text-ink-800 leading-snug truncate group-hover:text-cinnabar-600 transition-colors">
          {novel.title}
        </p>
        <p className="text-xs font-sans text-ink-400 mt-0.5 truncate">
          {novel.author} · {novel.category}
        </p>
      </div>
    </>
  );
}
