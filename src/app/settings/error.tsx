"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function SettingsError({
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
      <h2 className="text-lg font-serif text-ink-700">设置加载失败</h2>
      <p className="text-sm font-sans text-ink-400">
        无法加载个人设置，请稍后重试。
      </p>
      <button onClick={reset} className="btn-primary">
        重新加载
      </button>
    </div>
  );
}
