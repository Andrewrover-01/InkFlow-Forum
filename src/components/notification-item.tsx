"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MessageSquare, User } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export interface NotificationData {
  id: string;
  type: "REPLY" | "LIKE";
  isRead: boolean;
  createdAt: string;
  postId: string | null;
  replyId: string | null;
  fromUser: { id: string; name: string | null; image: string | null } | null;
  post: { id: string; title: string } | null;
  reply: { id: string; floor: number } | null;
}

interface Props {
  notification: NotificationData;
  onMarkRead: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead }: Props) {
  const { id, type, isRead, createdAt, fromUser, post, reply } = notification;

  const href = post ? `/post/${post.id}` : "/notifications";

  function handleClick() {
    if (!isRead) {
      onMarkRead(id);
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-parchment-100 ${
        isRead ? "opacity-70" : "bg-parchment-50"
      }`}
    >
      {/* Type icon */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
          type === "REPLY"
            ? "bg-jade-100 text-jade-600"
            : "bg-cinnabar-100 text-cinnabar-600"
        }`}
      >
        {type === "REPLY" ? (
          <MessageSquare className="w-3.5 h-3.5" />
        ) : (
          <Heart className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {/* Sender avatar */}
          <div className="w-5 h-5 rounded-full bg-cinnabar-100 border border-cinnabar-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {fromUser?.image ? (
              <Image
                src={fromUser.image}
                alt={fromUser.name || ""}
                width={20}
                height={20}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-3 h-3 text-cinnabar-600" />
            )}
          </div>
          <span className="text-sm font-sans text-ink-700 font-medium truncate">
            {fromUser?.name || "某用户"}
          </span>
          <span className="text-sm font-sans text-ink-500">
            {type === "REPLY" ? "回复了你的帖子" : "赞了你的内容"}
          </span>
        </div>

        {post && (
          <p className="text-xs font-sans text-ink-400 truncate">
            《{post.title}》
            {type === "REPLY" && reply && (
              <span className="ml-1">第 {reply.floor} 楼</span>
            )}
          </p>
        )}

        <p className="text-xs font-sans text-ink-300 mt-0.5">
          {formatRelativeTime(createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!isRead && (
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-cinnabar-500 mt-2" />
      )}
    </Link>
  );
}
