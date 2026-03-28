"use client";

import Image from "next/image";
import { useState } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { MessageSquare, User, Trash2 } from "lucide-react";
import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";
import { LikeButton } from "./like-button";

interface ReplyAuthor {
  id: string;
  name: string | null;
  image: string | null;
}

interface CommentData {
  id: string;
  content: string;
  createdAt: Date | string;
  replyId: string;
  author: ReplyAuthor;
  children?: CommentData[];
}

interface ReplyData {
  id: string;
  content: string;
  floor: number;
  createdAt: Date | string;
  author: ReplyAuthor;
  comments?: CommentData[];
  _count: { likes: number; comments: number };
}

interface ReplyItemProps {
  reply: ReplyData;
  currentUserId?: string;
  currentUserRole?: string;
  likedReplyIds?: string[];
}

export function ReplyItem({ reply, currentUserId, currentUserRole, likedReplyIds = [] }: ReplyItemProps) {
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const canDelete =
    currentUserId &&
    (currentUserId === reply.author.id ||
      currentUserRole === "ADMIN" ||
      currentUserRole === "MODERATOR");

  async function handleDelete() {
    if (!confirm("确认删除这条回复？")) return;
    const res = await fetch(`/api/replies/${reply.id}`, { method: "DELETE" });
    if (res.ok) setDeleted(true);
    else {
      const err = await res.json();
      alert(err.error || "删除失败");
    }
  }

  if (deleted) return null;

  return (
    <div className="card p-4">
      {/* Floor header */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-parchment-200">
        <div className="w-8 h-8 rounded-full bg-cinnabar-100 border border-cinnabar-200 flex items-center justify-center flex-shrink-0">
          {reply.author.image ? (
            <Image
              src={reply.author.image}
              alt={reply.author.name ?? ""}
              width={32}
              height={32}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-3.5 h-3.5 text-cinnabar-600" />
          )}
        </div>
        <div className="flex-1">
          <span className="text-sm font-sans text-ink-700 font-medium">
            {reply.author.name}
          </span>
          <span className="text-xs font-sans text-ink-400 ml-2">
            {formatRelativeTime(reply.createdAt)}
          </span>
        </div>
        <span className="text-xs font-sans text-cinnabar-600 bg-cinnabar-50 px-2 py-0.5 rounded-full border border-cinnabar-200">
          第 {reply.floor} 楼
        </span>
      </div>

      {/* Content */}
      <p className="text-sm font-sans text-ink-700 leading-relaxed whitespace-pre-wrap mb-3">
        {reply.content}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-4 text-xs font-sans text-ink-400">
        <LikeButton
          targetId={reply.id}
          targetType="reply"
          initialCount={reply._count.likes}
          initialLiked={likedReplyIds.includes(reply.id)}
        />
        {currentUserId && (
          <button
            onClick={() => setShowCommentForm(!showCommentForm)}
            className="flex items-center gap-1 hover:text-cinnabar-600 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>评论 ({reply._count.comments})</span>
          </button>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 hover:text-cinnabar-600 transition-colors ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>删除</span>
          </button>
        )}
      </div>

      {/* Comments */}
      {reply.comments && reply.comments.length > 0 && (
        <div className="mt-3 pl-3 border-l-2 border-parchment-300 space-y-2">
          {reply.comments.map((comment: CommentData) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          ))}
        </div>
      )}

      {/* Comment form */}
      {showCommentForm && (
        <div className="mt-3">
          <CommentForm
            replyId={reply.id}
            onSuccess={() => setShowCommentForm(false)}
          />
        </div>
      )}
    </div>
  );
}

