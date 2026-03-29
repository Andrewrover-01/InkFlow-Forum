"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CommentFormProps {
  replyId: string;
  parentId?: string;
  onSuccess?: () => void;
}

export function CommentForm({ replyId, parentId, onSuccess }: CommentFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId, parentId, content }),
      });

      if (res.ok) {
        setContent("");
        router.refresh();
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="forum-input flex-1 text-xs"
        placeholder="写下评论..."
        maxLength={500}
        required
      />
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="btn-primary text-xs px-3 disabled:opacity-50"
      >
        {loading ? "..." : "评论"}
      </button>
    </form>
  );
}
