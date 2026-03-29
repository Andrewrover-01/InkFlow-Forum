"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PenLine } from "lucide-react";
import { use } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface PostData {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  categoryId: string;
  authorId: string;
  tags: { tag: { id: string; name: string } }[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditPostPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [post, setPost] = useState<PostData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Fetch post and categories
  useEffect(() => {
    if (status !== "authenticated") return;

    Promise.all([
      fetch(`/api/posts/${id}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([postData, catsData]) => {
        if (postData.error) {
          setFetchError(postData.error);
          return;
        }
        // Check ownership / admin
        const isAuthor = postData.authorId === session?.user?.id;
        const isAdmin =
          session?.user?.role === "ADMIN" ||
          session?.user?.role === "MODERATOR";
        if (!isAuthor && !isAdmin) {
          setFetchError("你没有权限编辑此帖");
          return;
        }
        setPost(postData);
        setCategories(Array.isArray(catsData) ? catsData : []);
      })
      .catch(() => setFetchError("加载失败，请刷新重试"));
  }, [id, status, session]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "保存失败");
      } else {
        router.push(`/post/${id}`);
      }
    } catch {
      setSubmitError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && !post && !fetchError)) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-ink-400 font-sans">加载中...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="card p-12 text-center space-y-3">
        <p className="text-cinnabar-600 font-sans">{fetchError}</p>
        <button onClick={() => router.back()} className="btn-secondary">
          返回
        </button>
      </div>
    );
  }

  if (!post) return null;

  const initialTags = post.tags.map(({ tag }) => tag.name).join(", ");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <PenLine className="w-5 h-5 text-cinnabar-600" />
        <h1 className="text-2xl font-serif text-ink-800">编辑帖子</h1>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              版块 <span className="text-cinnabar-600">*</span>
            </label>
            <select
              name="categoryId"
              required
              defaultValue={post.categoryId}
              className="forum-input"
            >
              <option value="">请选择版块</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
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
              defaultValue={post.title}
              className="forum-input"
              placeholder="请输入帖子标题（4-100字）"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              摘要
            </label>
            <input
              name="summary"
              type="text"
              maxLength={200}
              defaultValue={post.summary ?? ""}
              className="forum-input"
              placeholder="简短描述帖子内容（可选）"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              正文 <span className="text-cinnabar-600">*</span>
            </label>
            <textarea
              name="content"
              required
              minLength={10}
              rows={12}
              defaultValue={post.content}
              className="forum-input resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              标签
            </label>
            <input
              name="tags"
              type="text"
              defaultValue={initialTags}
              className="forum-input"
              placeholder="多个标签用逗号分隔，如：武侠, 经典推荐"
            />
          </div>

          {submitError && (
            <p className="text-sm text-cinnabar-600 font-sans bg-cinnabar-50 border border-cinnabar-200 rounded-sm px-3 py-2">
              {submitError}
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
              disabled={loading}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
            >
              <PenLine className="w-3.5 h-3.5" />
              {loading ? "保存中..." : "保存修改"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
