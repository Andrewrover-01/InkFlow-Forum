"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ShieldCheck, ChevronLeft, Loader2, CheckCircle, XCircle } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";
type ContentType = "POST" | "REPLY" | "COMMENT";

interface ModerationRecord {
  id: string;
  contentType: ContentType;
  contentId: string;
  status: ModerationStatus;
  autoFlags: string[];
  machineScore: number;
  reviewNote: string | null;
  createdAt: string;
  reviewer: { id: string; name: string | null } | null;
}

interface ModerationResponse {
  records: ModerationRecord[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_OPTIONS: { value: ModerationStatus | ""; label: string }[] = [
  { value: "", label: "全部" },
  { value: "PENDING", label: "待审核" },
  { value: "APPROVED", label: "已通过" },
  { value: "REJECTED", label: "已拒绝" },
];

const CONTENT_TYPE_OPTIONS: { value: ContentType | ""; label: string }[] = [
  { value: "", label: "全部类型" },
  { value: "POST", label: "帖子" },
  { value: "REPLY", label: "回复" },
  { value: "COMMENT", label: "评论" },
];

const STATUS_STYLE: Record<ModerationStatus, string> = {
  PENDING: "text-amber-700 bg-amber-50 border-amber-200",
  APPROVED: "text-jade-700 bg-jade-50 border-jade-200",
  REJECTED: "text-cinnabar-600 bg-cinnabar-50 border-cinnabar-200",
};

const STATUS_LABEL: Record<ModerationStatus, string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝",
};

const CONTENT_LABEL: Record<ContentType, string> = {
  POST: "帖子",
  REPLY: "回复",
  COMMENT: "评论",
};

export default function AdminModerationPage() {
  const [data, setData] = useState<ModerationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ModerationStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<ContentType | "">("");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const fetchRecords = useCallback(
    async (status: string, contentType: string, p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p) });
        if (status) params.set("status", status);
        if (contentType) params.set("contentType", contentType);
        const res = await fetch(`/api/admin/moderation?${params}`);
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
    fetchRecords(statusFilter, typeFilter, page);
  }, [fetchRecords, statusFilter, typeFilter, page]);

  async function handleAction(id: string, status: "APPROVED" | "REJECTED") {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/moderation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote: noteMap[id] || undefined }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                records: prev.records.map((r) =>
                  r.id === id ? { ...r, status } : r
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

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-ink-400 hover:text-cinnabar-600 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <ShieldCheck className="w-5 h-5 text-cinnabar-600" />
        <h1 className="text-2xl font-serif text-ink-800">内容审核</h1>
        {data && (
          <span className="text-sm font-sans text-ink-400">
            共 {data.total} 条记录
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ModerationStatus | "");
            setPage(1);
          }}
          className="forum-input text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as ContentType | "");
            setPage(1);
          }}
          className="forum-input text-sm"
        >
          {CONTENT_TYPE_OPTIONS.map((o) => (
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
      ) : !data || data.records.length === 0 ? (
        <div className="card p-12 text-center text-ink-400 font-sans text-sm">
          没有审核记录
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead className="bg-parchment-200/60 text-ink-500 text-xs">
                <tr>
                  <th className="text-left px-4 py-3">类型</th>
                  <th className="text-left px-4 py-3">内容ID</th>
                  <th className="text-left px-4 py-3">风险分</th>
                  <th className="text-left px-4 py-3">标记</th>
                  <th className="text-left px-4 py-3">状态</th>
                  <th className="text-left px-4 py-3">时间</th>
                  <th className="text-left px-4 py-3">备注</th>
                  <th className="text-left px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-parchment-200">
                {data.records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-parchment-50">
                    <td className="px-4 py-3 text-ink-600">
                      {CONTENT_LABEL[rec.contentType]}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-400">
                      {rec.contentId.slice(0, 10)}…
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold ${
                          rec.machineScore >= 80
                            ? "text-cinnabar-600"
                            : rec.machineScore >= 30
                            ? "text-amber-600"
                            : "text-jade-700"
                        }`}
                      >
                        {rec.machineScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-400 text-xs">
                      {rec.autoFlags.length > 0
                        ? rec.autoFlags.join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          STATUS_STYLE[rec.status]
                        }`}
                      >
                        {STATUS_LABEL[rec.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-400 text-xs">
                      {formatRelativeTime(rec.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={noteMap[rec.id] ?? ""}
                        onChange={(e) =>
                          setNoteMap((prev) => ({
                            ...prev,
                            [rec.id]: e.target.value,
                          }))
                        }
                        placeholder="审核备注"
                        className="forum-input text-xs py-1 px-2 w-28"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {rec.status === "PENDING" ? (
                        actionId === rec.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-cinnabar-600" />
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAction(rec.id, "APPROVED")}
                              className="text-jade-700 hover:text-jade-900 transition-colors"
                              title="通过"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction(rec.id, "REJECTED")}
                              className="text-cinnabar-600 hover:text-cinnabar-800 transition-colors"
                              title="拒绝"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-xs text-ink-400">
                          {rec.reviewer?.name ?? "—"}
                        </span>
                      )}
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
