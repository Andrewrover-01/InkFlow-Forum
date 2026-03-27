"use client";

import { useState } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { User, Reply } from "lucide-react";
import { CommentForm } from "./comment-form";

interface CommentItemProps {
  comment: any;
  currentUserId?: string;
  depth?: number;
}

export function CommentItem({ comment, currentUserId, depth = 0 }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const maxDepth = 3;

  return (
    <div className={depth > 0 ? "pl-3 border-l border-parchment-200" : ""}>
      <div className="py-1.5">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-full bg-parchment-200 border border-parchment-300 flex items-center justify-center flex-shrink-0 mt-0.5">
            {comment.author.image ? (
              <img
                src={comment.author.image}
                alt={comment.author.name}
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
            {currentUserId && depth < maxDepth && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1 text-xs font-sans text-ink-400 hover:text-cinnabar-600 transition-colors mt-1"
              >
                <Reply className="w-3 h-3" />
                回复
              </button>
            )}
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
            {comment.children.map((child: any) => (
              <CommentItem
                key={child.id}
                comment={child}
                currentUserId={currentUserId}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
