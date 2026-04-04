"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Flag, ChevronLeft, Loader2, CheckCircle, MinusCircle } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";
type ContentType = "POST" | "REPLY" | "COMMENT";
type ReportReason = "SPAM" | "SENSITIVE" | "ILLEGAL" | "PORN" | "OTHER";

interface Report {
  id: string;
  contentType: ContentType;
  contentId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  reporter: { id: string; name: string | null };
  reviewer: { id: string; name: string | null } | null;
  reviewNote: string | null;
}

interface ReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_OPTIONS: { value: ReportStatus | ""; label: string }[] = [
  { value: "", label: "全部" },
  { value: "PENDING", label: "待处理" },
  { value: "RESOLVED", label: "已处理" },
  { value: "DISMISSED", label: "已驳回" },
];

const STATUS_STYLE: Record<ReportStatus, string> = {
  PENDING: "text-amber-700 bg-amber-50 border-amber-200",
  RESOLVED: "text-jade-700 bg-jade-50 border-jade-200",
  DISMISSED: "text-ink-500 bg-parchment-100 border-parchment-300",
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: "待处理",
  RESOLVED: "已处理",
  DISMISSED: "已驳回",
};

const REASON_LABEL: Record<ReportReason, string> = {
  SPAM: "垃圾信息",
  SENSITIVE: "违规内容",
  ILLEGAL: "违法内容",
  PORN: "色情内容",
  OTHER: "其他",
};

const CONTENT_LABEL: Record<ContentType, string> = {
  POST: "帖子",
  REPLY: "回复",
  COMMENT: "评论",
};

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const fetchReports = useCallback(
    async (status: string, p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p) });
        if (status) params.set("status", status);
        const res = await fetch(`/api/admin/reports?${params}`);
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
    fetchReports(statusFilter, page);
  }, [fetchReports, statusFilter, page]);

  async function handleAction(id: string, status: "RESOLVED" | "DISMISSED") {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote: noteMap[id] || undefined }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                reports: prev.reports.map((r) =>
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
        <Flag className="w-5 h-5 text-cinnabar-600" />
        <h1 className="text-2xl font-serif text-ink-800">用户举报</h1>
        {data && (
          <span className="text-sm font-sans text-ink-400">
            共 {data.total} 条举报
          </span>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ReportStatus | "");
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
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-cinnabar-600" />
        </div>
      ) : !data || data.reports.length === 0 ? (
        <div className="card p-12 text-center text-ink-400 font-sans text-sm">
          没有举报记录
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead className="bg-parchment-200/60 text-ink-500 text-xs">
                <tr>
                  <th className="text-left px-4 py-3">类型</th>
                  <th className="text-left px-4 py-3">内容ID</th>
                  <th className="text-left px-4 py-3">举报原因</th>
                  <th className="text-left px-4 py-3">说明</th>
                  <th className="text-left px-4 py-3">举报人</th>
                  <th className="text-left px-4 py-3">状态</th>
                  <th className="text-left px-4 py-3">时间</th>
                  <th className="text-left px-4 py-3">备注</th>
                  <th className="text-left px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-parchment-200">
                {data.reports.map((report) => (
                  <tr key={report.id} className="hover:bg-parchment-50">
                    <td className="px-4 py-3 text-ink-600">
                      {CONTENT_LABEL[report.contentType]}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-400">
                      {report.contentId.slice(0, 10)}…
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full border text-cinnabar-700 bg-cinnabar-50 border-cinnabar-200">
                        {REASON_LABEL[report.reason]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-400 text-xs max-w-[120px] truncate">
                      {report.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-500">
                      {report.reporter.name || "匿名"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          STATUS_STYLE[report.status]
                        }`}
                      >
                        {STATUS_LABEL[report.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-400 text-xs">
                      {formatRelativeTime(report.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={noteMap[report.id] ?? ""}
                        onChange={(e) =>
                          setNoteMap((prev) => ({
                            ...prev,
                            [report.id]: e.target.value,
                          }))
                        }
                        placeholder="处理备注"
                        className="forum-input text-xs py-1 px-2 w-28"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {report.status === "PENDING" ? (
                        actionId === report.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-cinnabar-600" />
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                handleAction(report.id, "RESOLVED")
                              }
                              className="text-jade-700 hover:text-jade-900 transition-colors"
                              title="标记已处理"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleAction(report.id, "DISMISSED")
                              }
                              className="text-ink-400 hover:text-ink-600 transition-colors"
                              title="驳回举报"
                            >
                              <MinusCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-xs text-ink-400">
                          {report.reviewer?.name ?? "—"}
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
