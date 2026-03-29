"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function PostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card p-12 text-center space-y-4">
      <AlertTriangle className="w-8 h-8 text-cinnabar-500 mx-auto" />
      <h2 className="text-lg font-serif text-ink-700">帖子加载失败</h2>
      <p className="text-sm font-sans text-ink-400">
        无法读取帖子内容，可能帖子已被删除或服务器出现问题。
      </p>
      <button onClick={reset} className="btn-primary">
        重新加载
      </button>
    </div>
  );
}
