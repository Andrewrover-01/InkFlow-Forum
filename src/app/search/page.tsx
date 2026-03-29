"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Eye, MessageSquare, Heart, Loader2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface PostResult {
  id: string;
  title: string;
  summary: string | null;
  createdAt: string;
  viewCount: number;
  author: { id: string; name: string | null };
  category: { id: string; name: string; slug: string };
  tags: { tag: { id: string; name: string } }[];
  _count: { replies: number; likes: number };
}

interface SearchResponse {
  posts: PostResult[];
  total: number;
  page: number;
  pageSize: number;
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(initialQ !== "");

  const didInitialSearch = useRef(false);

  const runSearch = useCallback(
    async (q: string, page = 1) => {
      if (!q.trim()) return;
      setLoading(true);
      setSearched(true);
      const params = new URLSearchParams({ q: q.trim(), page: String(page) });
      router.replace(`/search?${params.toString()}`, { scroll: false });
      try {
        const res = await fetch(
          `/api/search?${new URLSearchParams({ q: q.trim(), page: String(page) })}`
        );
        const data: SearchResponse = await res.json();
        setResults(data);
      } catch {
        setResults({ posts: [], total: 0, page, pageSize: 20 });
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  // Run initial search on mount if URL has ?q=
  useEffect(() => {
    if (initialQ && !didInitialSearch.current) {
      didInitialSearch.current = true;
      runSearch(initialQ, initialPage);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  const totalPages = results ? Math.ceil(results.total / results.pageSize) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif text-ink-800">搜索帖子</h1>
        <p className="text-sm font-sans text-ink-400 mt-0.5">
          在标题、内容、摘要和标签中搜索
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入关键词搜索帖子..."
            className="forum-input pl-9"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          搜索
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-cinnabar-600" />
        </div>
      )}

      {/* Results */}
      {!loading && searched && results && (
        <>
          <p className="text-sm font-sans text-ink-400">
            找到{" "}
            <span className="text-ink-700 font-medium">{results.total}</span>{" "}
            条结果
            {query && (
              <>
                {" "}关键词：
                <span className="text-cinnabar-600">{query}</span>
              </>
            )}
          </p>

          {results.posts.length === 0 ? (
            <div className="card p-12 text-center">
              <Search className="w-8 h-8 text-ink-300 mx-auto mb-3" />
              <p className="text-ink-400 font-sans">暂无相关帖子</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.posts.map((post) => (
                <Link key={post.id} href={`/post/${post.id}`}>
                  <div className="post-card">
                    <div className="flex items-start gap-3">
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
                          <p className="text-xs font-sans text-ink-400 mt-1 line-clamp-2">
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
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 py-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => runSearch(query, p)}
                  className={`px-3 py-1 text-sm font-sans rounded-sm transition-colors ${
                    p === results.page
                      ? "bg-cinnabar-600 text-white"
                      : "text-ink-600 hover:bg-parchment-200 hover:text-cinnabar-600"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-cinnabar-600" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
