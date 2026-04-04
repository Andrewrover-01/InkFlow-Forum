"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Filter,
  ChevronLeft,
  Loader2,
  Trash2,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type Category = "basic" | "novel" | "custom";

interface SensitiveWord {
  id: string;
  word: string;
  category: Category;
  isActive: boolean;
  createdAt: string;
}

interface WordsResponse {
  words: SensitiveWord[];
  total: number;
  page: number;
  pageSize: number;
}

const CATEGORY_OPTIONS: { value: Category | ""; label: string }[] = [
  { value: "", label: "全部类型" },
  { value: "basic", label: "基础词库" },
  { value: "novel", label: "小说专属" },
  { value: "custom", label: "自定义" },
];

const CATEGORY_STYLE: Record<Category, string> = {
  basic: "text-ink-600 bg-parchment-100 border-parchment-300",
  novel: "text-jade-700 bg-jade-50 border-jade-200",
  custom: "text-cinnabar-600 bg-cinnabar-50 border-cinnabar-200",
};

const CATEGORY_LABEL: Record<Category, string> = {
  basic: "基础",
  novel: "小说",
  custom: "自定义",
};

export default function AdminSensitiveWordsPage() {
  const [data, setData] = useState<WordsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "">("");
  const [page, setPage] = useState(1);
  const [newWord, setNewWord] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("custom");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchWords = useCallback(
    async (q: string, cat: string, p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p) });
        if (q) params.set("q", q);
        if (cat) params.set("category", cat);
        const res = await fetch(`/api/admin/sensitive-words?${params}`);
        const json = await res.json();
        setData(json);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchWords(query, categoryFilter, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchWords, categoryFilter, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchWords(query, categoryFilter, 1);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newWord.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/sensitive-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: newWord.trim(), category: newCategory }),
      });
      if (res.ok) {
        setNewWord("");
        fetchWords(query, categoryFilter, 1);
      } else {
        const err = await res.json();
        alert(err.error || "添加失败");
      }
    } catch {
      alert("网络错误，请重试");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/admin/sensitive-words/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                words: prev.words.map((w) =>
                  w.id === id ? { ...w, isActive: !isActive } : w
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
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除该敏感词？")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/sensitive-words/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                words: prev.words.filter((w) => w.id !== id),
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
      setDeletingId(null);
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="text-ink-400 hover:text-cinnabar-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <Filter className="w-5 h-5 text-cinnabar-600" />
        <h1 className="text-2xl font-serif text-ink-800">敏感词管理</h1>
        {data && (
          <span className="text-sm font-sans text-ink-400">
            共 {data.total} 个词条
          </span>
        )}
      </div>

      {/* Add new word */}
      <form onSubmit={handleCreate} className="card p-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-sans text-ink-500 mb-1">
            新增敏感词
          </label>
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="输入敏感词…"
            className="forum-input w-full"
            maxLength={50}
          />
        </div>
        <div>
          <label className="block text-xs font-sans text-ink-500 mb-1">
            类型
          </label>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as Category)}
            className="forum-input"
          >
            <option value="basic">基础词库</option>
            <option value="novel">小说专属</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={creating || !newWord.trim()}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          添加
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索词语…"
              className="forum-input pl-9"
            />
          </div>
          <button type="submit" className="btn-primary flex items-center gap-1">
            <Search className="w-4 h-4" />
            搜索
          </button>
        </form>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value as Category | "");
            setPage(1);
          }}
          className="forum-input text-sm"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-cinnabar-600" />
        </div>
      ) : !data || data.words.length === 0 ? (
        <div className="card p-12 text-center text-ink-400 font-sans text-sm">
          没有找到词条
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead className="bg-parchment-200/60 text-ink-500 text-xs">
                <tr>
                  <th className="text-left px-4 py-3">词语</th>
                  <th className="text-left px-4 py-3">类型</th>
                  <th className="text-left px-4 py-3">状态</th>
                  <th className="text-left px-4 py-3">添加时间</th>
                  <th className="text-left px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-parchment-200">
                {data.words.map((w) => (
                  <tr key={w.id} className="hover:bg-parchment-50">
                    <td className="px-4 py-3 font-medium text-ink-800">
                      {w.word}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          CATEGORY_STYLE[w.category]
                        }`}
                      >
                        {CATEGORY_LABEL[w.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-sans ${
                          w.isActive
                            ? "text-jade-700"
                            : "text-ink-400"
                        }`}
                      >
                        {w.isActive ? "启用" : "禁用"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-400 text-xs">
                      {formatRelativeTime(w.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {togglingId === w.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-cinnabar-600" />
                        ) : (
                          <button
                            onClick={() => handleToggle(w.id, w.isActive)}
                            className="text-ink-400 hover:text-jade-700 transition-colors"
                            title={w.isActive ? "禁用" : "启用"}
                          >
                            {w.isActive ? (
                              <ToggleRight className="w-5 h-5 text-jade-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5" />
                            )}
                          </button>
                        )}
                        {deletingId === w.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-cinnabar-600" />
                        ) : (
                          <button
                            onClick={() => handleDelete(w.id)}
                            className="text-ink-400 hover:text-cinnabar-600 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
