"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Flag,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  MinusCircle,
  FileText,
  MessageSquare,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface Report {
  id: string;
  targetType: "POST" | "REPLY" | "COMMENT";
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedNote: string | null;
  reporter: { id: string; name: string | null };
  resolvedBy: { id: string; name: string | null } | null;
  post: {
    id: string;
    title: string;
    author: { id: string; name: string | null };
  } | null;
  reply: {
    id: string;
    content: string;
    floor: number;
    author: { id: string; name: string | null };
    post: { id: string; title: string };
  } | null;
  comment: {
    id: string;
    content: string;
    author: { id: string; name: string | null };
  } | null;
}

interface ListResponse {
  reports: Report[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_OPTIONS = [
  { value: "PENDING",   label: "待处理" },
  { value: "RESOLVED",  label: "已处理" },
  { value: "DISMISSED", label: "已忽略" },
];

export default function AdminReportsPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const fetchReports = useCallback(async (s: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: s, page: String(p) });
      const res = await fetch(`/api/admin/reports?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(status, page); }, [fetchReports, status, page]);

  async function resolve(id: string, action: "RESOLVED" | "DISMISSED") {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: noteMap[id] ?? "" }),
      });
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, reports: prev.reports.filter((r) => r.id !== id), total: prev.total - 1 } : prev
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
          <span className="text-sm font-sans text-ink-400">共 {data.total} 条</span>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatus(opt.value); setPage(1); }}
            className={`px-3 py-1.5 text-sm font-sans rounded-sm transition-colors ${
              status === opt.value
                ? "bg-cinnabar-600 text-white"
                : "text-ink-600 hover:bg-parchment-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-cinnabar-600" />
        </div>
      ) : !data || data.reports.length === 0 ? (
        <div className="card p-12 text-center text-ink-400 font-sans text-sm">
          暂无{STATUS_OPTIONS.find((o) => o.value === status)?.label ?? ""}举报
        </div>
      ) : (
        <div className="space-y-3">
          {data.reports.map((rep) => {
            const busy = actionId === rep.id;
            const contentPreview =
              rep.post?.title ??
              rep.reply?.content.slice(0, 80) ??
              rep.comment?.content.slice(0, 80) ??
              "";
            const contentAuthor =
              rep.post?.author.name ??
              rep.reply?.author.name ??
              rep.comment?.author.name ??
              "未知";
            const targetLabel =
              rep.targetType === "POST"    ? "帖子" :
              rep.targetType === "REPLY"   ? `回复 · 第${rep.reply?.floor}楼` :
                                             "评论";

            return (
              <div key={rep.id} className="card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {rep.targetType === "POST" ? (
                    <FileText className="w-4 h-4 text-cinnabar-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-ink-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-sans text-ink-500 bg-parchment-200 px-2 py-0.5 rounded-sm">
                        {targetLabel}
                      </span>
                      <span className="text-xs font-sans text-cinnabar-600 bg-cinnabar-50 px-2 py-0.5 rounded-sm">
                        {rep.reason}
                      </span>
                    </div>
                    <p className="font-sans text-sm text-ink-700 line-clamp-2">{contentPreview}</p>
                    <p className="text-xs font-sans text-ink-400 mt-1">
                      内容作者: {contentAuthor} · 举报人: {rep.reporter.name} · {formatRelativeTime(rep.createdAt)}
                    </p>
                    {rep.post && (
                      <Link
                        href={`/post/${rep.post.id}`}
                        className="text-xs font-sans text-cinnabar-600 hover:underline"
                        target="_blank"
                      >
                        查看原帖 →
                      </Link>
                    )}
                    {rep.reply?.post && (
                      <Link
                        href={`/post/${rep.reply.post.id}`}
                        className="text-xs font-sans text-cinnabar-600 hover:underline"
                        target="_blank"
                      >
                        查看原帖 →
                      </Link>
                    )}
                  </div>
                </div>

                {/* Action buttons (PENDING only) */}
                {status === "PENDING" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-parchment-200">
                    <input
                      type="text"
                      placeholder="处理备注（可选）"
                      value={noteMap[rep.id] ?? ""}
                      onChange={(e) =>
                        setNoteMap((prev) => ({ ...prev, [rep.id]: e.target.value }))
                      }
                      className="forum-input flex-1 text-sm py-1.5"
                    />
                    {busy ? (
                      <Loader2 className="w-5 h-5 animate-spin text-cinnabar-600" />
                    ) : (
                      <>
                        <button
                          onClick={() => resolve(rep.id, "RESOLVED")}
                          title="处理（标记违规）"
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-sans text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-sm transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          处理
                        </button>
                        <button
                          onClick={() => resolve(rep.id, "DISMISSED")}
                          title="忽略"
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-sans text-ink-600 bg-parchment-200 hover:bg-parchment-300 rounded-sm transition-colors"
                        >
                          <MinusCircle className="w-4 h-4" />
                          忽略
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Show resolver info */}
                {status !== "PENDING" && rep.resolvedBy && (
                  <p className="text-xs font-sans text-ink-400 pt-2 border-t border-parchment-200">
                    处理人: {rep.resolvedBy.name}
                    {rep.resolvedNote && ` · ${rep.resolvedNote}`}
                    {rep.resolvedAt && ` · ${formatRelativeTime(rep.resolvedAt)}`}
                  </p>
                )}
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
