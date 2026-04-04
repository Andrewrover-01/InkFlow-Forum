"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PenLine } from "lucide-react";
import { CaptchaWidget } from "@/components/captcha-widget";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function CreatePostPage() {
  const { status } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!captchaToken) {
      setError("请先完成人机验证");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          content: formData.get("content"),
          summary: formData.get("summary"),
          categoryId: formData.get("categoryId"),
          tags: (formData.get("tags") as string)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          captchaToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "发帖失败");
        setCaptchaToken(null); // reset on failure
      } else {
        router.push(`/post/${data.id}`);
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-ink-400 font-sans">加载中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <PenLine className="w-5 h-5 text-cinnabar-600" />
        <h1 className="text-2xl font-serif text-ink-800">发布新帖</h1>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              版块 <span className="text-cinnabar-600">*</span>
            </label>
            <select name="categoryId" required className="forum-input">
              <option value="">请选择版块</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              标题 <span className="text-cinnabar-600">*</span>
            </label>
            <input
              name="title"
              type="text"
              required
              minLength={4}
              maxLength={100}
              className="forum-input"
              placeholder="请输入帖子标题（4-100字）"
            />
          </div>

          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              摘要
            </label>
            <input
              name="summary"
              type="text"
              maxLength={200}
              className="forum-input"
              placeholder="简短描述帖子内容（可选）"
            />
          </div>

          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              正文 <span className="text-cinnabar-600">*</span>
            </label>
            <textarea
              name="content"
              required
              minLength={10}
              rows={12}
              className="forum-input resize-none"
              placeholder="在此写下你的故事或见解，文字温雅，以飨读者..."
            />
          </div>

          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              标签
            </label>
            <input
              name="tags"
              type="text"
              className="forum-input"
              placeholder="多个标签用逗号分隔，如：武侠, 经典推荐"
            />
          </div>

          <CaptchaWidget
            action="post"
            onVerify={setCaptchaToken}
            onError={(msg) => setError(`验证加载失败: ${msg}`)}
          />

          {error && (
            <p className="text-sm text-cinnabar-600 font-sans bg-cinnabar-50 border border-cinnabar-200 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !captchaToken}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
            >
              <PenLine className="w-3.5 h-3.5" />
              {loading ? "发布中..." : "发布帖子"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
