"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface LikeButtonProps {
  targetId: string;
  targetType: "post" | "reply" | "comment";
  initialCount: number;
  initialLiked?: boolean;
  size?: "sm" | "md";
}

export function LikeButton({
  targetId,
  targetType,
  initialCount,
  initialLiked = false,
  size = "sm",
}: LikeButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function handleLike() {
    if (!session) {
      router.push("/auth/login");
      return;
    }
    if (loading) return;

    // Optimistic update
    const newLiked = !liked;
    setLiked(newLiked);
    setCount((c) => c + (newLiked ? 1 : -1));
    setLoading(true);

    try {
      const payload =
        targetType === "post"
          ? { postId: targetId }
          : targetType === "reply"
          ? { replyId: targetId }
          : { commentId: targetId };

      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Revert on error
        setLiked(liked);
        setCount((c) => c + (newLiked ? -1 : 1));
      }
    } catch {
      setLiked(liked);
      setCount((c) => c + (newLiked ? -1 : 1));
    } finally {
      setLoading(false);
    }
  }

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      aria-label={liked ? "取消点赞" : "点赞"}
      className={`flex items-center gap-1 transition-colors disabled:opacity-70 ${
        liked
          ? "text-cinnabar-600"
          : "text-ink-400 hover:text-cinnabar-600"
      }`}
    >
      <Heart
        className={`${iconSize} transition-all ${
          liked ? "fill-cinnabar-600 stroke-cinnabar-600" : ""
        }`}
      />
      <span>{count}</span>
    </button>
  );
}
