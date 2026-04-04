"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Plus, Trash2, ChevronLeft, Loader2, RefreshCw } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type BlacklistType = "IP" | "FINGERPRINT" | "USER_ID";
type BlacklistLevel = "GRAY" | "BLACK";

interface BlacklistEntry {
  id: string;
  type: BlacklistType;
  value: string;
  level: BlacklistLevel;
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string | null;
}

interface BlacklistResponse {
  entries: BlacklistEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const TYPE_LABEL: Record<BlacklistType, string> = {
  IP: "IP 地址",
  FINGERPRINT: "设备指纹",
  USER_ID: "用户 ID",
};

const LEVEL_LABEL: Record<BlacklistLevel, string> = {
  GRAY: "灰名单",
  BLACK: "黑名单",
};

const LEVEL_COLOR: Record<BlacklistLevel, string> = {
  GRAY: "text-amber-700 bg-amber-50 border-amber-200",
  BLACK: "text-red-700 bg-red-50 border-red-200",
};

export default function AdminBlacklistPage() {
  const [data, setData] = useState<BlacklistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<BlacklistType | "">("");
  const [levelFilter, setLevelFilter] = useState<BlacklistLevel | "">("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "IP" as BlacklistType,
    value: "",
    level: "BLACK" as BlacklistLevel,
    reason: "",
    expiresAt: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchEntries = useCallback(
    async (p: number, type: string, level: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "20" });
        if (type) params.set("type", type);
        if (level) params.set("level", level);
        const res = await fetch(`/api/admin/blacklist?${params.toString()}`);
        if (res.ok) {
          setData(await res.json());
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchEntries(page, typeFilter, levelFilter);
  }, [page, typeFilter, levelFilter, fetchEntries]);

  async function handleDelete(id: string) {
    if (!confirm("确定要删除此条目吗？")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/blacklist/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchEntries(page, typeFilter, levelFilter);
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.value.trim()) {
      setFormError("请填写值");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        value: form.value.trim(),
        level: form.level,
        reason: form.reason.trim() || undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      };
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ type: "IP", value: "", level: "BLACK", reason: "", expiresAt: "" });
        fetchEntries(1, typeFilter, levelFilter);
        setPage(1);
      } else {
        const json = await res.json();
        setFormError(json.error ?? "操作失败");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cinnabar-600" />
          <h1 className="text-2xl font-serif text-ink-800">黑灰名单管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEntries(page, typeFilter, levelFilter)}
            className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700 px-3 py-1.5 border border-parchment-300 rounded-lg hover:bg-parchment-100 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 text-sm bg-cinnabar-600 text-white px-3 py-1.5 rounded-lg hover:bg-cinnabar-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            添加条目
          </button>
        </div>
      </div>

      {/* Back link */}
      <a
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-cinnabar-600 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        返回后台
      </a>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card p-5 space-y-4 border-cinnabar-200"
        >
          <h2 className="font-serif text-ink-800">添加黑灰名单条目</h2>
          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ink-500 mb-1">类型</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as BlacklistType }))}
                className="w-full border border-parchment-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {(Object.keys(TYPE_LABEL) as BlacklistType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1">级别</label>
              <select
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as BlacklistLevel }))}
                className="w-full border border-parchment-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {(Object.keys(LEVEL_LABEL) as BlacklistLevel[]).map((l) => (
                  <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-ink-500 mb-1">值 *</label>
              <input
                type="text"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="IP 地址 / 指纹 hash / 用户 ID"
                className="w-full border border-parchment-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1">原因（可选）</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="例：恶意刷帖"
                className="w-full border border-parchment-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1">到期时间（留空为永久）</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="w-full border border-parchment-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm border border-parchment-300 rounded-lg hover:bg-parchment-100 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1 px-4 py-2 text-sm bg-cinnabar-600 text-white rounded-lg hover:bg-cinnabar-700 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              确认添加
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as BlacklistType | ""); setPage(1); }}
          className="border border-parchment-300 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="">所有类型</option>
          {(Object.entries(TYPE_LABEL) as [BlacklistType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={levelFilter}
          onChange={(e) => { setLevelFilter(e.target.value as BlacklistLevel | ""); setPage(1); }}
          className="border border-parchment-300 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="">所有级别</option>
          {(Object.entries(LEVEL_LABEL) as [BlacklistLevel, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {data && (
          <span className="text-xs text-ink-400 ml-auto">
            共 {data.total} 条记录
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-cinnabar-500" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {!data?.entries.length ? (
            <div className="py-12 text-center text-ink-400 text-sm">暂无记录</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-parchment-100 border-b border-parchment-200">
                <tr>
                  <th className="px-4 py-3 text-left font-sans text-xs text-ink-500">类型</th>
                  <th className="px-4 py-3 text-left font-sans text-xs text-ink-500">值</th>
                  <th className="px-4 py-3 text-left font-sans text-xs text-ink-500">级别</th>
                  <th className="px-4 py-3 text-left font-sans text-xs text-ink-500">原因</th>
                  <th className="px-4 py-3 text-left font-sans text-xs text-ink-500">到期时间</th>
                  <th className="px-4 py-3 text-left font-sans text-xs text-ink-500">创建时间</th>
                  <th className="px-4 py-3 text-right font-sans text-xs text-ink-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-parchment-100">
                {data.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-parchment-50">
                    <td className="px-4 py-3 text-ink-600 font-sans">
                      {TYPE_LABEL[entry.type]}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-700 max-w-[180px] truncate">
                      {entry.value}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-sans ${LEVEL_COLOR[entry.level]}`}>
                        {LEVEL_LABEL[entry.level]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-500 text-xs max-w-[160px] truncate">
                      {entry.reason ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-400 text-xs">
                      {entry.expiresAt ? new Date(entry.expiresAt).toLocaleString("zh-CN") : "永久"}
                    </td>
                    <td className="px-4 py-3 text-ink-400 text-xs">
                      {formatRelativeTime(new Date(entry.createdAt))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-40"
                        title="删除"
                      >
                        {deletingId === entry.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-parchment-300 rounded-lg disabled:opacity-40 hover:bg-parchment-100 transition-colors"
          >
            上一页
          </button>
          <span className="px-3 py-1.5 text-sm text-ink-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm border border-parchment-300 rounded-lg disabled:opacity-40 hover:bg-parchment-100 transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
