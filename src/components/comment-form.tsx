"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CaptchaWidget } from "@/components/captcha-widget";

interface CommentFormProps {
  replyId: string;
  parentId?: string;
  onSuccess?: () => void;
}

export function CommentForm({ replyId, parentId, onSuccess }: CommentFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    if (!captchaToken) {
      setError("请先完成人机验证");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId, parentId, content, captchaToken }),
      });

      if (res.ok) {
        setContent("");
        setCaptchaToken(null); // reset for next comment
        router.refresh();
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
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
          disabled={loading || !content.trim() || !captchaToken}
          className="btn-primary text-xs px-3 disabled:opacity-50"
        >
          {loading ? "..." : "评论"}
        </button>
      </form>
      {error && (
        <p className="text-xs text-cinnabar-600 font-sans">{error}</p>
      )}
      <CaptchaWidget
        action="comment"
        onVerify={setCaptchaToken}
      />
    </div>
  );
}
