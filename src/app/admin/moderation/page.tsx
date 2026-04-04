"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  MessageSquare,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface ModerationRecord {
  id: string;
  targetType: "POST" | "REPLY" | "COMMENT";
  autoStatus: string;
  autoReason: string | null;
  autoScore: number;
  status: string;
  reviewedAt: string | null;
  createdAt: string;
  reviewer: { id: string; name: string | null } | null;
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
  records: ModerationRecord[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_OPTIONS = [
  { value: "PENDING",  label: "待审核" },
  { value: "APPROVED", label: "已通过" },
  { value: "REJECTED", label: "已拒绝" },
];

export default function AdminModerationPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const fetchRecords = useCallback(async (s: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: s, page: String(p) });
      const res = await fetch(`/api/admin/moderation?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(status, page); }, [fetchRecords, status, page]);

  async function review(id: string, decision: "APPROVED" | "REJECTED") {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/moderation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: noteMap[id] ?? "" }),
      });
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, records: prev.records.filter((r) => r.id !== id), total: prev.total - 1 } : prev
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
        <h1 className="text-2xl font-serif text-ink-800">内容审核队列</h1>
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
      ) : !data || data.records.length === 0 ? (
        <div className="card p-12 text-center text-ink-400 font-sans text-sm">
          暂无待审核内容
        </div>
      ) : (
        <div className="space-y-3">
          {data.records.map((rec) => {
            const busy = actionId === rec.id;
            const contentPreview =
              rec.post?.title ??
              rec.reply?.content.slice(0, 80) ??
              rec.comment?.content.slice(0, 80) ??
              "";
            const author =
              rec.post?.author.name ??
              rec.reply?.author.name ??
              rec.comment?.author.name ??
              "未知";
            const targetLabel =
              rec.targetType === "POST"    ? "帖子" :
              rec.targetType === "REPLY"   ? `回复 · 第${rec.reply?.floor}楼` :
                                             "评论";

            return (
              <div key={rec.id} className="card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {rec.targetType === "POST" ? (
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
                        {rec.autoReason ?? "规则触发"}
                      </span>
                      <span className="text-xs font-sans text-ink-400">
                        评分: {rec.autoScore}
                      </span>
                    </div>
                    <p className="font-sans text-sm text-ink-700 line-clamp-2">{contentPreview}</p>
                    <p className="text-xs font-sans text-ink-400 mt-1">
                      作者: {author} · {formatRelativeTime(rec.createdAt)}
                    </p>
                    {rec.post && (
                      <Link
                        href={`/post/${rec.post.id}`}
                        className="text-xs font-sans text-cinnabar-600 hover:underline"
                        target="_blank"
                      >
                        查看原帖 →
                      </Link>
                    )}
                    {rec.reply?.post && (
                      <Link
                        href={`/post/${rec.reply.post.id}`}
                        className="text-xs font-sans text-cinnabar-600 hover:underline"
                        target="_blank"
                      >
                        查看原帖 →
                      </Link>
                    )}
                  </div>
                </div>

                {/* Review note input + action buttons (only for PENDING) */}
                {status === "PENDING" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-parchment-200">
                    <input
                      type="text"
                      placeholder="审核备注（可选）"
                      value={noteMap[rec.id] ?? ""}
                      onChange={(e) =>
                        setNoteMap((prev) => ({ ...prev, [rec.id]: e.target.value }))
                      }
                      className="forum-input flex-1 text-sm py-1.5"
                    />
                    {busy ? (
                      <Loader2 className="w-5 h-5 animate-spin text-cinnabar-600" />
                    ) : (
                      <>
                        <button
                          onClick={() => review(rec.id, "APPROVED")}
                          title="通过"
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-sans text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-sm transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          通过
                        </button>
                        <button
                          onClick={() => review(rec.id, "REJECTED")}
                          title="拒绝"
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-sans text-cinnabar-700 bg-cinnabar-50 hover:bg-cinnabar-100 rounded-sm transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          拒绝
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Show reviewer info for already-reviewed records */}
                {status !== "PENDING" && rec.reviewer && (
                  <p className="text-xs font-sans text-ink-400 pt-2 border-t border-parchment-200">
                    审核人: {rec.reviewer.name} · {rec.reviewedAt ? formatRelativeTime(rec.reviewedAt) : ""}
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
