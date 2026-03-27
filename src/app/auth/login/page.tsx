"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/forum");
      router.refresh();
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <BookOpen className="w-8 h-8 text-cinnabar-600 mx-auto mb-2" />
          <h1 className="text-2xl font-serif text-ink-800">登录墨香论坛</h1>
          <p className="text-sm font-sans text-ink-400 mt-1">欢迎回来，墨客</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="forum-input"
              placeholder="••••••••"
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
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <p className="text-center text-sm font-sans text-ink-400 mt-4">
          还没有账号？{" "}
          <Link
            href="/auth/register"
            className="text-cinnabar-600 hover:text-cinnabar-700"
          >
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
