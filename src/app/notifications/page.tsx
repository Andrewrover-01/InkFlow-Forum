"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { NotificationItem, NotificationData } from "@/components/notification-item";
import { Pagination } from "@/components/pagination";

interface NotificationsResponse {
  notifications: NotificationData[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

function NotificationsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?page=${p}`);
      const json: NotificationsResponse = await res.json();
      setData(json);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchNotifications(page);
    }
  }, [status, page, fetchNotifications]);

  function handleMarkRead(id: string) {
    fetch(`/api/notifications/${id}`, { method: "PATCH" }).then(() => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
          notifications: prev.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        };
      });
    });
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          unreadCount: 0,
          notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
        };
      });
    } finally {
      setMarkingAll(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && !data && loading)) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-7 w-24 bg-parchment-300 rounded-sm" />
        <div className="card divide-y divide-parchment-200">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-parchment-300 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-48 bg-parchment-300 rounded-sm" />
                <div className="h-3 w-32 bg-parchment-200 rounded-sm" />
                <div className="h-3 w-16 bg-parchment-200 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-cinnabar-600" />
          <h1 className="text-2xl font-serif text-ink-800">站内通知</h1>
          {data && data.unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-cinnabar-500 text-white text-xs font-sans font-medium">
              {data.unreadCount > 99 ? "99+" : data.unreadCount}
            </span>
          )}
        </div>

        {data && data.unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={markingAll}
            className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            {markingAll ? "标记中..." : "全部已读"}
          </button>
        )}
      </div>

      {/* Notification list */}
      {data && data.notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-8 h-8 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-400 font-sans">暂无通知</p>
        </div>
      ) : (
        <div className="card divide-y divide-parchment-200 overflow-hidden">
          {(data?.notifications ?? []).map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/notifications"
        />
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
          <div className="h-7 w-24 bg-parchment-300 rounded-sm" />
          <div className="card p-8 text-center">
            <div className="h-4 w-16 bg-parchment-200 rounded-sm mx-auto" />
          </div>
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}

