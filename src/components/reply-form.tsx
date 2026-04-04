"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { CaptchaWidget } from "@/components/captcha-widget";

interface ReplyFormProps {
  postId: string;
}

export function ReplyForm({ postId }: ReplyFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState<number | undefined>();
  // Incrementing this key forces the CaptchaWidget to refetch a new challenge
  // after a successful submission so the next reply can be verified.
  const [captchaKey, setCaptchaKey] = useState(0);

  const handleCaptchaToken = useCallback((token: string, answer?: number) => {
    setCaptchaToken(token);
    setCaptchaAnswer(answer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    if (!captchaToken) {
      setError("请先完成安全验证");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content, captchaToken, captchaAnswer }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "回复失败");
      } else {
        setContent("");
        // Reset captcha for the next reply
        setCaptchaToken("");
        setCaptchaAnswer(undefined);
        setCaptchaKey((k) => k + 1);
        router.refresh();
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4">
      <h3 className="text-sm font-serif text-ink-700 mb-3">发表回复</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="forum-input resize-none"
          rows={4}
          placeholder="写下你的回复，言辞温雅，以礼相待..."
          maxLength={2000}
          required
        />
        {error && (
          <p className="text-xs text-cinnabar-600 font-sans">{error}</p>
        )}
        {/* CAPTCHA (invisible for normal users, slider for graylisted) */}
        <CaptchaWidget
          key={captchaKey}
          action="reply"
          onToken={handleCaptchaToken}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs font-sans text-ink-400">
            {content.length}/2000
          </span>
          <button
            type="submit"
            disabled={loading || !content.trim() || !captchaToken}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? "发送中..." : "发表回复"}
          </button>
        </div>
      </form>
    </div>
  );
}
