"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ChevronLeft,
  Loader2,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type SensitiveWordCategory = "BASIC" | "NOVEL" | "CUSTOM";

interface SensitiveWord {
  id: string;
  word: string;
  category: SensitiveWordCategory;
  severity: number;
  isActive: boolean;
  createdAt: string;
}

interface ListResponse {
  words: SensitiveWord[];
  total: number;
  page: number;
  pageSize: number;
}

const CATEGORY_LABELS: Record<SensitiveWordCategory, string> = {
  BASIC:  "基础通用",
  NOVEL:  "小说专属",
  CUSTOM: "自定义",
};

const CATEGORY_COLORS: Record<SensitiveWordCategory, string> = {
  BASIC:  "text-ink-500 bg-ink-100",
  NOVEL:  "text-amber-700 bg-amber-50",
  CUSTOM: "text-cinnabar-700 bg-cinnabar-50",
};

const SEVERITY_LABEL = (s: number) =>
  s >= 80 ? "严重" : s >= 50 ? "中等" : "轻微";

const SEVERITY_COLOR = (s: number) =>
  s >= 80
    ? "text-red-700 bg-red-50"
    : s >= 50
    ? "text-amber-700 bg-amber-50"
    : "text-ink-500 bg-ink-100";

const CATEGORY_OPTIONS: Array<{ value: SensitiveWordCategory | ""; label: string }> = [
  { value: "",       label: "全部分类" },
  { value: "BASIC",  label: "基础通用" },
  { value: "NOVEL",  label: "小说专属" },
  { value: "CUSTOM", label: "自定义"   },
];

export default function AdminSensitiveWordsPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SensitiveWordCategory | "">("");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);

  // Add-word form state
  const [showForm, setShowForm] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newSeverity, setNewSeverity] = useState(50);
  const [newCategory, setNewCategory] = useState<SensitiveWordCategory>("CUSTOM");
  const [adding, setAdding] = useState(false);

  const fetchWords = useCallback(async (q: string, cat: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q)   params.set("q",        q);
      if (cat) params.set("category", cat);
      const res  = await fetch(`/api/admin/sensitive-words?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWords(query, category, page); }, [fetchWords, query, category, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchWords(query, category, 1);
  }

  async function toggleActive(id: string, current: boolean) {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/sensitive-words/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive: !current }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? { ...prev, words: prev.words.map((w) => w.id === id ? { ...w, isActive: !current } : w) }
            : prev,
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

  async function deleteWord(id: string, word: string) {
    if (!confirm(`确认删除敏感词「${word}」？`)) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/sensitive-words/${id}`, { method: "DELETE" });
      if (res.ok) {
        setData((prev) =>
          prev
            ? { ...prev, words: prev.words.filter((w) => w.id !== id), total: prev.total - 1 }
            : prev,
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

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    if (!newWord.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/sensitive-words", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ word: newWord.trim(), category: newCategory, severity: newSeverity }),
      });
      if (res.ok) {
        setNewWord("");
        setNewSeverity(50);
        setNewCategory("CUSTOM");
        setShowForm(false);
        fetchWords(query, category, 1);
      } else {
        const err = await res.json();
        alert(err.error || "添加失败");
      }
    } catch {
      alert("网络错误，请重试");
    } finally {
      setAdding(false);
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
        <ShieldAlert className="w-5 h-5 text-cinnabar-600" />
        <h1 className="text-2xl font-serif text-ink-800">敏感词管理</h1>
        {data && (
          <span className="text-sm font-sans text-ink-400">共 {data.total} 个词条</span>
        )}
        <div className="ml-auto">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary flex items-center gap-1.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            添加词条
          </button>
        </div>
      </div>

      {/* Add word form */}
      {showForm && (
        <form onSubmit={addWord} className="card p-4 space-y-3">
          <h2 className="font-serif text-ink-700 text-base">新增自定义敏感词</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-sans text-ink-500 mb-1">词语 *</label>
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="输入敏感词"
                maxLength={50}
                required
                className="forum-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-sans text-ink-500 mb-1">分类</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as SensitiveWordCategory)}
                className="forum-input w-full"
              >
                <option value="CUSTOM">自定义</option>
                <option value="BASIC">基础通用</option>
                <option value="NOVEL">小说专属</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-sans text-ink-500 mb-1">
                严重程度: {newSeverity} ({SEVERITY_LABEL(newSeverity)})
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={newSeverity}
                onChange={(e) => setNewSeverity(Number(e.target.value))}
                className="w-full accent-cinnabar-600"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={adding}
              className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              确认添加
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm font-sans text-ink-600 hover:bg-parchment-200 rounded-sm transition-colors"
            >
              取消
            </button>
          </div>
          <p className="text-xs font-sans text-ink-400">
            注：严重程度 ≥80 自动拒绝内容；40-79 标记人工审核；&lt;40 轻微标记。
          </p>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索词语..."
              className="forum-input pl-9 w-full"
            />
          </div>
          <button type="submit" className="btn-primary text-sm">搜索</button>
        </form>
        <div className="flex gap-1">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setCategory(opt.value as SensitiveWordCategory | ""); setPage(1); }}
              className={`px-3 py-1.5 text-sm font-sans rounded-sm transition-colors ${
                category === opt.value
                  ? "bg-cinnabar-600 text-white"
                  : "text-ink-600 hover:bg-parchment-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Word list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-cinnabar-600" />
        </div>
      ) : !data || data.words.length === 0 ? (
        <div className="card p-12 text-center text-ink-400 font-sans text-sm">
          暂无词条
        </div>
      ) : (
        <div className="card divide-y divide-parchment-200">
          {data.words.map((w) => {
            const busy = actionId === w.id;
            return (
              <div key={w.id} className={`flex items-center gap-3 px-4 py-3 ${!w.isActive ? "opacity-50" : ""}`}>
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="font-sans text-sm text-ink-800 font-medium">{w.word}</span>
                  <span className={`text-xs font-sans px-1.5 py-0.5 rounded-sm ${CATEGORY_COLORS[w.category]}`}>
                    {CATEGORY_LABELS[w.category]}
                  </span>
                  <span className={`text-xs font-sans px-1.5 py-0.5 rounded-sm ${SEVERITY_COLOR(w.severity)}`}>
                    {SEVERITY_LABEL(w.severity)} ({w.severity})
                  </span>
                  {!w.isActive && (
                    <span className="text-xs font-sans text-ink-400 bg-ink-100 px-1.5 py-0.5 rounded-sm">
                      已禁用
                    </span>
                  )}
                </div>
                <span className="text-xs font-sans text-ink-400 flex-shrink-0 hidden sm:block">
                  {formatRelativeTime(w.createdAt)}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cinnabar-600" />
                  ) : (
                    <>
                      <button
                        onClick={() => toggleActive(w.id, w.isActive)}
                        title={w.isActive ? "禁用" : "启用"}
                        className="p-1.5 rounded-sm text-ink-400 hover:text-cinnabar-600 hover:bg-cinnabar-50 transition-colors"
                      >
                        {w.isActive
                          ? <ToggleRight className="w-4 h-4 text-emerald-600" />
                          : <ToggleLeft  className="w-4 h-4" />
                        }
                      </button>
                      {/* Only custom words can be deleted */}
                      {w.category === "CUSTOM" && (
                        <button
                          onClick={() => deleteWord(w.id, w.word)}
                          title="删除"
                          className="p-1.5 rounded-sm text-ink-400 hover:text-cinnabar-600 hover:bg-cinnabar-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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

      {/* Legend */}
      <div className="card p-4 space-y-2">
        <h3 className="text-sm font-serif text-ink-700">词库说明</h3>
        <ul className="text-xs font-sans text-ink-500 space-y-1">
          <li><strong>基础通用词库</strong>：内置，覆盖政治违禁、赌博、诈骗、毒品、骚扰等场景，只可启用/禁用。</li>
          <li><strong>小说专属词库</strong>：内置，针对低俗色情小说、盗版内容、未成年相关违规内容，只可启用/禁用。</li>
          <li><strong>自定义词库</strong>：管理员手动添加，可编辑和删除，变更立即生效（5分钟内更新缓存）。</li>
          <li>严重程度 ≥80 → 内容直接被拒绝；40–79 → 标记人工审核；&lt;40 → 轻微标记。</li>
        </ul>
      </div>
    </div>
  );
}
