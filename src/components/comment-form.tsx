"use client";

import { useState, useCallback } from "react";
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
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState<number | undefined>();
  const [captchaKey, setCaptchaKey] = useState(0);

  const handleCaptchaToken = useCallback((token: string, answer?: number) => {
    setCaptchaToken(token);
    setCaptchaAnswer(answer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !captchaToken) return;
    setLoading(true);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId, parentId, content, captchaToken, captchaAnswer }),
      });

      if (res.ok) {
        setContent("");
        setCaptchaToken("");
        setCaptchaAnswer(undefined);
        setCaptchaKey((k) => k + 1);
        router.refresh();
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      {/* CAPTCHA (invisible for normal users, never visible unless graylisted) */}
      <CaptchaWidget
        key={captchaKey}
        action="comment"
        onToken={handleCaptchaToken}
      />
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
    </div>
  );
}
