"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeletePostButtonProps {
  postId: string;
}

export function DeletePostButton({ postId }: DeletePostButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/forum");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "删除失败");
        setLoading(false);
        setConfirming(false);
      }
    } catch {
      alert("网络错误，请重试");
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-sans text-ink-500">确认删除？</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs font-sans text-cinnabar-600 hover:text-cinnabar-700 disabled:opacity-50 underline"
        >
          {loading ? "删除中..." : "确认"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs font-sans text-ink-400 hover:text-ink-600 underline"
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1 text-xs font-sans text-ink-400 hover:text-cinnabar-600 transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />
      删除
    </button>
  );
}
