"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Plus, Trash2, Search, Loader2, ShieldOff, ShieldAlert } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type BlacklistType = "IP" | "USER_ID" | "FINGERPRINT";
type BlacklistLevel = "BLACK" | "GRAY";

interface BlacklistEntry {
  id: string;
  key: string;
  type: BlacklistType;
  level: BlacklistLevel;
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ApiResponse {
  entries: BlacklistEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const TYPE_LABEL: Record<BlacklistType, string> = {
  IP: "IP地址",
  USER_ID: "用户ID",
  FINGERPRINT: "设备指纹",
};

const LEVEL_STYLE: Record<BlacklistLevel, string> = {
  BLACK: "text-red-700 bg-red-50 border-red-200",
  GRAY:  "text-amber-700 bg-amber-50 border-amber-200",
};

const LEVEL_LABEL: Record<BlacklistLevel, string> = {
  BLACK: "黑名单",
  GRAY:  "灰名单",
};

export default function BlacklistPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<BlacklistType | "">("");
  const [levelFilter, setLevelFilter] = useState<BlacklistLevel | "">("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    key: "",
    type: "IP" as BlacklistType,
    level: "BLACK" as BlacklistLevel,
    reason: "",
    expiresAt: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(
    async (q: string, t: BlacklistType | "", l: BlacklistLevel | "", p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p) });
        if (q) params.set("q", q);
        if (t) params.set("type", t);
        if (l) params.set("level", l);
        const res = await fetch(`/api/admin/blacklist?${params}`);
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchEntries(query, typeFilter, levelFilter, page);
  }, [fetchEntries, query, typeFilter, levelFilter, page]);

  async function handleDelete(id: string) {
    if (!confirm("确认移除此条目？")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/blacklist/${id}`, { method: "DELETE" });
      if (res.ok) fetchEntries(query, typeFilter, levelFilter, page);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = {
        key: addForm.key,
        type: addForm.type,
        level: addForm.level,
      };
      if (addForm.reason) body.reason = addForm.reason;
      if (addForm.expiresAt) body.expiresAt = new Date(addForm.expiresAt).toISOString();

      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowAdd(false);
        setAddForm({ key: "", type: "IP", level: "BLACK", reason: "", expiresAt: "" });
        fetchEntries(query, typeFilter, levelFilter, 1);
        setPage(1);
      } else {
        const json = await res.json();
        setError(json.error ?? "添加失败");
      }
    } finally {
      setAddLoading(false);
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cinnabar-600" />
          <h1 className="text-2xl font-serif text-ink-800">黑灰名单管理</h1>
          {data && (
            <span className="ml-2 text-xs font-sans text-ink-400 bg-parchment-100 px-2 py-0.5 rounded-full border border-parchment-300">
              {data.total} 条记录
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cinnabar-600 hover:bg-cinnabar-700 text-white text-sm font-sans rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加条目
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card p-5">
          <h2 className="font-serif text-ink-700 mb-4">添加黑灰名单</h2>
          <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-sans text-ink-500 mb-1">类型</label>
              <select
                className="w-full border border-parchment-300 rounded-lg px-3 py-2 text-sm font-sans text-ink-700 bg-white"
                value={addForm.type}
                onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value as BlacklistType }))}
              >
                {(Object.keys(TYPE_LABEL) as BlacklistType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-sans text-ink-500 mb-1">等级</label>
              <select
                className="w-full border border-parchment-300 rounded-lg px-3 py-2 text-sm font-sans text-ink-700 bg-white"
                value={addForm.level}
                onChange={(e) => setAddForm((f) => ({ ...f, level: e.target.value as BlacklistLevel }))}
              >
                <option value="BLACK">黑名单（直接封禁）</option>
                <option value="GRAY">灰名单（自动触发）</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-sans text-ink-500 mb-1">标识符 *</label>
              <input
                required
                className="w-full border border-parchment-300 rounded-lg px-3 py-2 text-sm font-sans text-ink-700"
                placeholder={addForm.type === "IP" ? "192.168.1.1" : addForm.type === "USER_ID" ? "用户ID" : "设备指纹"}
                value={addForm.key}
                onChange={(e) => setAddForm((f) => ({ ...f, key: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-sans text-ink-500 mb-1">原因</label>
              <input
                className="w-full border border-parchment-300 rounded-lg px-3 py-2 text-sm font-sans text-ink-700"
                placeholder="可选备注"
                value={addForm.reason}
                onChange={(e) => setAddForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-sans text-ink-500 mb-1">到期时间（留空=永久）</label>
              <input
                type="datetime-local"
                className="w-full border border-parchment-300 rounded-lg px-3 py-2 text-sm font-sans text-ink-700"
                value={addForm.expiresAt}
                onChange={(e) => setAddForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-3">
              <button
                type="submit"
                disabled={addLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-cinnabar-600 hover:bg-cinnabar-700 text-white text-sm font-sans rounded-lg transition-colors disabled:opacity-60"
              >
                {addLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                确认添加
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setError(null); }}
                className="px-4 py-2 border border-parchment-300 text-ink-600 text-sm font-sans rounded-lg hover:bg-parchment-50 transition-colors"
              >
                取消
              </button>
            </div>
            {error && <p className="sm:col-span-2 text-xs text-red-600 font-sans">{error}</p>}
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input
            className="w-full pl-8 pr-3 py-2 border border-parchment-300 rounded-lg text-sm font-sans text-ink-700 bg-white"
            placeholder="搜索标识符…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="border border-parchment-300 rounded-lg px-3 py-2 text-sm font-sans text-ink-700 bg-white"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as BlacklistType | ""); setPage(1); }}
        >
          <option value="">全部类型</option>
          {(Object.keys(TYPE_LABEL) as BlacklistType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABEL[t]}</option>
          ))}
        </select>
        <select
          className="border border-parchment-300 rounded-lg px-3 py-2 text-sm font-sans text-ink-700 bg-white"
          value={levelFilter}
          onChange={(e) => { setLevelFilter(e.target.value as BlacklistLevel | ""); setPage(1); }}
        >
          <option value="">全部等级</option>
          <option value="BLACK">黑名单</option>
          <option value="GRAY">灰名单</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-ink-400 font-sans text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            加载中…
          </div>
        ) : !data?.entries.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-ink-400">
            <ShieldOff className="w-8 h-8" />
            <p className="font-sans text-sm">暂无记录</p>
          </div>
        ) : (
          <table className="w-full text-sm font-sans">
            <thead className="bg-parchment-100 border-b border-parchment-200">
              <tr>
                <th className="text-left px-4 py-3 text-ink-600 font-medium">标识符</th>
                <th className="text-left px-4 py-3 text-ink-600 font-medium">类型</th>
                <th className="text-left px-4 py-3 text-ink-600 font-medium">等级</th>
                <th className="text-left px-4 py-3 text-ink-600 font-medium hidden md:table-cell">原因</th>
                <th className="text-left px-4 py-3 text-ink-600 font-medium hidden lg:table-cell">到期</th>
                <th className="text-left px-4 py-3 text-ink-600 font-medium">添加时间</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-parchment-100">
              {data.entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-parchment-50/50">
                  <td className="px-4 py-3 text-ink-700 font-mono text-xs break-all max-w-[200px]">
                    {entry.key}
                  </td>
                  <td className="px-4 py-3 text-ink-500">{TYPE_LABEL[entry.type]}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${LEVEL_STYLE[entry.level]}`}>
                      {entry.level === "BLACK"
                        ? <Shield className="w-3 h-3" />
                        : <ShieldAlert className="w-3 h-3" />}
                      {LEVEL_LABEL[entry.level]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-500 hidden md:table-cell">
                    {entry.reason ?? <span className="text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-500 hidden lg:table-cell">
                    {entry.expiresAt
                      ? formatRelativeTime(new Date(entry.expiresAt))
                      : <span className="text-ink-300">永久</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-400">
                    {formatRelativeTime(new Date(entry.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="p-1.5 hover:text-red-600 text-ink-400 transition-colors disabled:opacity-40"
                      title="移除"
                    >
                      {deletingId === entry.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm font-sans border border-parchment-300 rounded-lg text-ink-600 hover:bg-parchment-50 disabled:opacity-40"
          >
            上一页
          </button>
          <span className="px-3 py-1.5 text-sm font-sans text-ink-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm font-sans border border-parchment-300 rounded-lg text-ink-600 hover:bg-parchment-50 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
