/**
 * Machine content moderation engine.
 *
 * Provides two-stage content review:
 *   1. Text screening via a keyword DFA/Set — fast, zero-latency
 *   2. Image moderation stub — placeholder for external API integration
 *
 * Risk scoring:
 *   • Each flag category carries a weight (0–50 points).
 *   • Final score is capped at 100.
 *   • score >= 80  → auto-reject (very high confidence of violation)
 *   • score >= 30  → flag for human review (PENDING)
 *   • score <  30  → pass (APPROVED)
 *
 * Usage:
 *   const result = await moderateText(text);
 *   const record = await moderateContent("POST", postId, text);
 */

import { prisma } from "@/lib/prisma";
import { ContentType, ModerationStatus } from "@prisma/client";

// ─── Keyword lists ───────────────────────────────────────────────────────────
// Categorised sets of patterns. Kept minimal for demonstration; extend via DB
// (see the SensitiveWord table approach in word-filter.ts for production use).

const KEYWORDS: Record<string, string[]> = {
  porn: [
    "色情", "裸体", "黄色小说", "成人内容", "三级片",
    "肉文", "H文", "18禁", "淫", "爱爱", "做爱",
  ],
  illegal: [
    "违禁药品", "毒品", "大麻", "冰毒", "海洛因",
    "枪支", "炸弹制造", "诈骗", "洗钱", "人口贩卖",
  ],
  spam: [
    "点击链接", "微信号", "加我", "私聊", "刷单",
    "兼职赚钱", "投资理财", "快速赚钱",
  ],
  sensitive: [
    "反动", "推翻政府", "颠覆", "暴力革命",
  ],
};

// Build a flat lookup Map<keyword, category> for O(1) multi-category matching
const KEYWORD_MAP = new Map<string, string>();
for (const [category, words] of Object.entries(KEYWORDS)) {
  for (const word of words) {
    KEYWORD_MAP.set(word, category);
  }
}

/** Points per flag category. */
const CATEGORY_WEIGHT: Record<string, number> = {
  porn: 50,
  illegal: 50,
  spam: 20,
  sensitive: 40,
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ModerationTextResult {
  /** Overall risk score 0–100. */
  score: number;
  /** Flag categories triggered (e.g. ["porn", "spam"]). */
  flags: string[];
  /** Recommended action. */
  action: "approve" | "review" | "reject";
}

// ─── Text screening ──────────────────────────────────────────────────────────

/**
 * Screen `text` for policy violations.
 * Checks both the original text and a normalised variant (fullwidth → ASCII).
 */
export function moderateText(text: string): ModerationTextResult {
  const normalised = text
    .toLowerCase()
    // fullwidth digits/letters → ASCII
    .replace(/[\uFF01-\uFF5E]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    // strip common evasion separators
    .replace(/[\s\u200b\u3000*_\-\.]+/g, "");

  const flagSet = new Set<string>();

  for (const [keyword, category] of KEYWORD_MAP) {
    if (normalised.includes(keyword) || text.includes(keyword)) {
      flagSet.add(category);
    }
  }

  const flags = Array.from(flagSet);
  const score = Math.min(
    100,
    flags.reduce((sum, f) => sum + (CATEGORY_WEIGHT[f] ?? 20), 0)
  );

  let action: "approve" | "review" | "reject";
  if (score >= 80) action = "reject";
  else if (score >= 30) action = "review";
  else action = "approve";

  return { score, flags, action };
}

// ─── Image moderation stub ────────────────────────────────────────────────────

export interface ImageModerationResult {
  score: number;
  flags: string[];
  action: "approve" | "review" | "reject";
}

/**
 * Placeholder for image content moderation.
 * In production, replace with a call to an external vision API
 * (e.g. Alibaba Cloud Green, Tencent Cloud TMS, AWS Rekognition).
 */
export async function moderateImage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _imageUrl: string
): Promise<ImageModerationResult> {
  // Stub: always pass — integrate external service here
  return { score: 0, flags: [], action: "approve" };
}

// ─── Full moderation pipeline ─────────────────────────────────────────────────

export interface ContentModerationResult {
  recordId: string;
  status: ModerationStatus;
  score: number;
  flags: string[];
}

/**
 * Run machine review on newly created content.
 * Creates a `ModerationRecord` and updates the content's `moderationStatus`.
 *
 * @param contentType - "POST" | "REPLY" | "COMMENT"
 * @param contentId   - the primary-key of the content row
 * @param text        - the user-submitted text to screen
 * @returns result with the new record id and determined status
 */
export async function moderateContent(
  contentType: ContentType,
  contentId: string,
  text: string
): Promise<ContentModerationResult> {
  const { score, flags, action } = moderateText(text);

  const status: ModerationStatus =
    action === "reject"
      ? ModerationStatus.REJECTED
      : action === "review"
      ? ModerationStatus.PENDING
      : ModerationStatus.APPROVED;

  // Persist the moderation record (non-blocking — failure must not block the write)
  const record = await prisma.moderationRecord.create({
    data: {
      contentType,
      contentId,
      status,
      autoFlags: flags,
      machineScore: score,
    },
  });

  // Update the content row's moderationStatus to reflect machine decision
  await updateContentModerationStatus(contentType, contentId, status);

  return { recordId: record.id, status, score, flags };
}

/**
 * Update the `moderationStatus` field on the underlying content row.
 * Shared by `moderateContent` and the admin PATCH handler.
 */
export async function updateContentModerationStatus(
  contentType: ContentType,
  contentId: string,
  status: ModerationStatus
): Promise<void> {
  try {
    const data = { moderationStatus: status };
    if (contentType === ContentType.POST) {
      await prisma.post.update({ where: { id: contentId }, data });
    } else if (contentType === ContentType.REPLY) {
      await prisma.reply.update({ where: { id: contentId }, data });
    } else if (contentType === ContentType.COMMENT) {
      await prisma.comment.update({ where: { id: contentId }, data });
    }
  } catch {
    // Non-fatal — status sync failure must not block callers
  }
}
