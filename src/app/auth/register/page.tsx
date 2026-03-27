"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "注册失败，请重试");
      } else {
        router.push("/auth/login?registered=true");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <BookOpen className="w-8 h-8 text-cinnabar-600 mx-auto mb-2" />
          <h1 className="text-2xl font-serif text-ink-800">注册墨香论坛</h1>
          <p className="text-sm font-sans text-ink-400 mt-1">加入我们的古风社区</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              笔名
            </label>
            <input
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={20}
              className="forum-input"
              placeholder="请输入笔名（2-20字）"
            />
          </div>

          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              邮箱
            </label>
            <input
              name="email"
              type="email"
              required
              className="forum-input"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              密码
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="forum-input"
              placeholder="至少6位密码"
            />
          </div>

          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              确认密码
            </label>
            <input
              name="confirm"
              type="password"
              required
              className="forum-input"
              placeholder="再次输入密码"
            />
          </div>

          {error && (
            <p className="text-sm text-cinnabar-600 font-sans bg-cinnabar-50 border border-cinnabar-200 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2.5 disabled:opacity-50"
          >
            {loading ? "注册中..." : "注册"}
          </button>
        </form>

        <p className="text-center text-sm font-sans text-ink-400 mt-4">
          已有账号？{" "}
          <Link
            href="/auth/login"
            className="text-cinnabar-600 hover:text-cinnabar-700"
          >
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
