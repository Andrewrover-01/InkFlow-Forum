"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function UserProfileError({
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
      <h2 className="text-lg font-serif text-ink-700">用户主页加载失败</h2>
      <p className="text-sm font-sans text-ink-400">
        无法加载该用户的主页，可能用户不存在或服务器出现问题。
      </p>
      <button onClick={reset} className="btn-primary">
        重新加载
      </button>
    </div>
  );
}
