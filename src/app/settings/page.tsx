"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Settings, User } from "lucide-react";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  bio: string | null;
  image: string | null;
}

export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setFetchError(data.error);
        } else {
          setProfile(data);
        }
      })
      .catch(() => setFetchError("加载失败，请刷新重试"));
  }, [status]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          bio: formData.get("bio"),
          image: formData.get("image"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "保存失败");
      } else {
        setProfile(data);
        setSuccess(true);
        // Update the session so the navbar reflects the new name/image
        await updateSession({ name: data.name, image: data.image });
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && !profile && !fetchError)) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-ink-400 font-sans">加载中...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="card p-12 text-center">
        <p className="text-cinnabar-600 font-sans">{fetchError}</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-cinnabar-600" />
        <h1 className="text-2xl font-serif text-ink-800">个人设置</h1>
      </div>

      <div className="card p-6">
        {/* Current avatar preview */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-parchment-200">
          <div className="w-14 h-14 rounded-full bg-cinnabar-100 border-2 border-cinnabar-200 flex items-center justify-center overflow-hidden">
            {profile.image ? (
              <Image
                src={profile.image}
                alt={profile.name || ""}
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-cinnabar-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-sans text-ink-700 font-medium">
              {profile.name || "未设置昵称"}
            </p>
            <p className="text-xs font-sans text-ink-400">{profile.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              昵称 <span className="text-cinnabar-600">*</span>
            </label>
            <input
              name="name"
              type="text"
              required
              maxLength={30}
              defaultValue={profile.name ?? ""}
              className="forum-input"
              placeholder="你的显示名称"
            />
          </div>

          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              个人简介
            </label>
            <textarea
              name="bio"
              rows={3}
              maxLength={200}
              defaultValue={profile.bio ?? ""}
              className="forum-input resize-none"
              placeholder="简单介绍一下自己（最多200字）"
            />
          </div>

          <div>
            <label className="block text-sm font-sans text-ink-600 mb-1">
              头像 URL
            </label>
            <input
              name="image"
              type="url"
              defaultValue={profile.image ?? ""}
              className="forum-input"
              placeholder="https://example.com/avatar.jpg"
            />
            <p className="text-xs font-sans text-ink-400 mt-1">
              请填写图片的完整网址，留空则使用默认头像
            </p>
          </div>

          {error && (
            <p className="text-sm text-cinnabar-600 font-sans bg-cinnabar-50 border border-cinnabar-200 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-jade-700 font-sans bg-jade-50 border border-jade-200 rounded-sm px-3 py-2">
              ✓ 保存成功
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => router.push(`/user/${session?.user?.id}`)}
              className="btn-secondary"
            >
              查看主页
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? "保存中..." : "保存修改"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
