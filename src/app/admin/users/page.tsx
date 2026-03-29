"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Users, Search, ChevronLeft, Loader2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type UserRole = "ADMIN" | "MODERATOR" | "MEMBER" | "GUEST";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  createdAt: string;
  _count: { posts: number; replies: number };
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

const ROLE_OPTIONS: UserRole[] = ["ADMIN", "MODERATOR", "MEMBER", "GUEST"];

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "管理员",
  MODERATOR: "版主",
  MEMBER: "会员",
  GUEST: "游客",
};

const ROLE_COLOR: Record<UserRole, string> = {
  ADMIN: "text-cinnabar-600 bg-cinnabar-50 border-cinnabar-200",
  MODERATOR: "text-jade-700 bg-jade-50 border-jade-200",
  MEMBER: "text-ink-600 bg-parchment-100 border-parchment-300",
  GUEST: "text-ink-400 bg-parchment-50 border-parchment-200",
};

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers("", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUsers]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchUsers(query, 1);
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                users: prev.users.map((u) =>
                  u.id === userId ? { ...u, role } : u
                ),
              }
            : prev
        );
      } else {
        const err = await res.json();
        alert(err.error || "修改失败");
      }
    } catch {
      alert("网络错误，请重试");
    } finally {
      setUpdatingId(null);
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
        <Users className="w-5 h-5 text-cinnabar-600" />
        <h1 className="text-2xl font-serif text-ink-800">用户管理</h1>
        {data && (
          <span className="text-sm font-sans text-ink-400">
            共 {data.total} 名用户
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
            placeholder="搜索用户名或邮箱..."
            className="forum-input pl-9"
          />
        </div>
        <button type="submit" className="btn-primary flex items-center gap-1.5">
          <Search className="w-4 h-4" />
          搜索
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-cinnabar-600" />
        </div>
      ) : !data || data.users.length === 0 ? (
        <div className="card p-12 text-center text-ink-400 font-sans text-sm">
          没有找到用户
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead className="bg-parchment-200/60 text-ink-500 text-xs">
                <tr>
                  <th className="text-left px-4 py-3">用户</th>
                  <th className="text-left px-4 py-3">邮箱</th>
                  <th className="text-left px-4 py-3">帖/回</th>
                  <th className="text-left px-4 py-3">加入时间</th>
                  <th className="text-left px-4 py-3">角色</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-parchment-200">
                {data.users.map((user) => (
                  <tr key={user.id} className="hover:bg-parchment-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/user/${user.id}`}
                        className="text-ink-700 hover:text-cinnabar-600 transition-colors font-medium"
                      >
                        {user.name || "匿名"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-500">{user.email}</td>
                    <td className="px-4 py-3 text-ink-400">
                      {user._count.posts} / {user._count.replies}
                    </td>
                    <td className="px-4 py-3 text-ink-400">
                      {formatRelativeTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {updatingId === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-cinnabar-600" />
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value as UserRole)
                          }
                          className={`text-xs px-2 py-1 rounded-full border font-sans cursor-pointer ${
                            ROLE_COLOR[user.role]
                          }`}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
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
