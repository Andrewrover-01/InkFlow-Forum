"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FileText, Search, ChevronLeft, Loader2, Pin, Lock, Trash2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface AdminPost {
  id: string;
  title: string;
  isPinned: boolean;
  isLocked: boolean;
  status: string;
  createdAt: string;
  viewCount: number;
  author: { id: string; name: string | null };
  category: { id: string; name: string; slug: string };
  _count: { replies: number; likes: number };
}

interface PostsResponse {
  posts: AdminPost[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminPostsPage() {
  const [data, setData] = useState<PostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchPosts = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      let endpoint: string;
      if (q.trim()) {
        const params = new URLSearchParams({ q: q.trim(), page: String(p) });
        endpoint = `/api/search?${params}`;
      } else {
        const params = new URLSearchParams({ page: String(p), limit: "20" });
        endpoint = `/api/posts?${params}`;
      }
      const res = await fetch(endpoint);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts("", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPosts]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchPosts(query, 1);
  }

  async function patchPost(
    id: string,
    patch: { isPinned?: boolean; isLocked?: boolean }
  ) {
    setActionId(id);
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                posts: prev.posts.map((p) =>
                  p.id === id ? { ...p, ...patch } : p
                ),
              }
            : prev
        );
      } else {
        const err = await res.json();
        alert(err.error || "操作失败");
      }
    } catch {
      alert("网络错误，请重试");
    } finally {
      setActionId(null);
    }
  }

  async function deletePost(id: string) {
    if (!confirm("确认删除这篇帖子？")) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                posts: prev.posts.filter((p) => p.id !== id),
                total: prev.total - 1,
              }
            : prev
        );
      } else {
        const err = await res.json();
        alert(err.error || "删除失败");
      }
    } catch {
      alert("网络错误，请重试");
    } finally {
      setActionId(null);
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-ink-400 hover:text-cinnabar-600 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <FileText className="w-5 h-5 text-cinnabar-600" />
        <h1 className="text-2xl font-serif text-ink-800">帖子管理</h1>
        {data && (
          <span className="text-sm font-sans text-ink-400">
            共 {data.total} 篇
          </span>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索帖子标题或内容..."
            className="forum-input pl-9"
          />
        </div>
        <button type="submit" className="btn-primary flex items-center gap-1.5">
          <Search className="w-4 h-4" />
          搜索
        </button>
      </form>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-cinnabar-600" />
        </div>
      ) : !data || data.posts.length === 0 ? (
        <div className="card p-12 text-center text-ink-400 font-sans text-sm">
          没有找到帖子
        </div>
      ) : (
        <div className="space-y-1">
          {data.posts.map((post) => {
            const busy = actionId === post.id;
            return (
              <div
                key={post.id}
                className="card px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {post.isPinned && (
                      <Pin className="w-3 h-3 text-cinnabar-500 flex-shrink-0" />
                    )}
                    {post.isLocked && (
                      <Lock className="w-3 h-3 text-ink-400 flex-shrink-0" />
                    )}
                    <Link
                      href={`/post/${post.id}`}
                      className="font-sans text-sm text-ink-700 hover:text-cinnabar-600 transition-colors truncate"
                    >
                      {post.title}
                    </Link>
                  </div>
                  <p className="text-xs font-sans text-ink-400">
                    {post.author.name} · {post.category.name} ·{" "}
                    {formatRelativeTime(post.createdAt)} · {post._count.replies}
                    楼 · {post.viewCount} 浏览
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cinnabar-600" />
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          patchPost(post.id, { isPinned: !post.isPinned })
                        }
                        title={post.isPinned ? "取消置顶" : "置顶"}
                        className={`p-1.5 rounded-sm transition-colors ${
                          post.isPinned
                            ? "text-cinnabar-600 bg-cinnabar-50"
                            : "text-ink-400 hover:text-cinnabar-600 hover:bg-cinnabar-50"
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() =>
                          patchPost(post.id, { isLocked: !post.isLocked })
                        }
                        title={post.isLocked ? "解锁" : "锁定"}
                        className={`p-1.5 rounded-sm transition-colors ${
                          post.isLocked
                            ? "text-ink-600 bg-ink-100"
                            : "text-ink-400 hover:text-ink-700 hover:bg-parchment-200"
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deletePost(post.id)}
                        title="删除"
                        className="p-1.5 rounded-sm text-ink-400 hover:text-cinnabar-600 hover:bg-cinnabar-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 py-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1 text-sm font-sans rounded-sm transition-colors ${
                p === page
                  ? "bg-cinnabar-600 text-white"
                  : "text-ink-600 hover:bg-parchment-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
