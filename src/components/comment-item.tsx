"use client";

import Image from "next/image";
import { useState } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { User, Reply, Trash2 } from "lucide-react";
import { CommentForm } from "./comment-form";

interface CommentAuthor {
  id: string;
  name: string | null;
  image: string | null;
}

interface CommentData {
  id: string;
  content: string;
  createdAt: Date | string;
  replyId: string;
  author: CommentAuthor;
  children?: CommentData[];
}

interface CommentItemProps {
  comment: CommentData;
  currentUserId?: string;
  currentUserRole?: string;
  depth?: number;
}

export function CommentItem({ comment, currentUserId, currentUserRole, depth = 0 }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const maxDepth = 3;

  const canDelete =
    currentUserId &&
    (currentUserId === comment.author.id ||
      currentUserRole === "ADMIN" ||
      currentUserRole === "MODERATOR");

  async function handleDelete() {
    if (!confirm("确认删除这条评论？")) return;
    const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
    if (res.ok) setDeleted(true);
    else {
      const err = await res.json();
      alert(err.error || "删除失败");
    }
  }

  if (deleted) return null;

  return (
    <div className={depth > 0 ? "pl-3 border-l border-parchment-200" : ""}>
      <div className="py-1.5">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-full bg-parchment-200 border border-parchment-300 flex items-center justify-center flex-shrink-0 mt-0.5">
            {comment.author.image ? (
              <Image
                src={comment.author.image}
                alt={comment.author.name ?? ""}
                width={24}
                height={24}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-3 h-3 text-ink-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-sans text-ink-700 font-medium">
                {comment.author.name}
              </span>
              <span className="text-xs font-sans text-ink-400">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
            <p className="text-xs font-sans text-ink-600 leading-relaxed mt-0.5">
              {comment.content}
            </p>
            <div className="flex items-center gap-3 mt-1">
              {currentUserId && depth < maxDepth && (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="flex items-center gap-1 text-xs font-sans text-ink-400 hover:text-cinnabar-600 transition-colors"
                >
                  <Reply className="w-3 h-3" />
                  回复
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 text-xs font-sans text-ink-400 hover:text-cinnabar-600 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  删除
                </button>
              )}
            </div>
          </div>
        </div>

        {showReplyForm && (
          <div className="mt-2 ml-8">
            <CommentForm
              replyId={comment.replyId}
              parentId={comment.id}
              onSuccess={() => setShowReplyForm(false)}
            />
          </div>
        )}

        {/* Nested children */}
        {comment.children && comment.children.length > 0 && (
          <div className="mt-1 ml-8 space-y-1">
            {comment.children.map((child: CommentData) => (
              <CommentItem
                key={child.id}
                comment={child}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

