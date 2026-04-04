/**
 * Machine-based content moderator.
 *
 * Performs automatic text screening using two complementary layers:
 *
 * 1. **Sensitive word Trie/DFA filter** (`word-filter.ts`) — scans text with a
 *    Trie built from built-in word lists (basic + novel-specific) and any
 *    DB-backed custom words added by admins.  Supports variant detection via
 *    noise-character stripping.
 *
 * 2. **Regex pattern blocklist** — catches multi-word phrases and structural
 *    patterns that are harder to express as single words (e.g. "网络赌博").
 *
 * The two layers are run in parallel; the more severe result wins.
 *
 * Results map to three moderation outcomes:
 *   APPROVED  → content is clean, published immediately.
 *   FLAGGED   → suspected violation; content hidden and queued for human review.
 *   REJECTED  → confirmed violation; content blocked outright.
 *
 * Extensibility:
 * - Add entries to `BLOCKLIST` (regex patterns) or to the DB custom word table.
 * - `moderateImage` is a stub ready for a real image-recognition API.
 */

import { ModerationStatus } from "@prisma/client";
import { scanText } from "@/lib/word-filter";

// ── Keyword blocklist ─────────────────────────────────────────────────────────

/**
 * Each category maps to a severity tier:
 *   SEVERE   → auto-REJECT  (score 80–100)
 *   MODERATE → auto-FLAG    (score 40–79)
 *   MILD     → auto-FLAG with low score (score 10–39)
 */

interface BlocklistCategory {
  severity: "SEVERE" | "MODERATE" | "MILD";
  score: number;
  /** Human-readable label surfaced to admins/users when content is flagged or rejected. */
  label: string;
  patterns: RegExp[];
}

// NOTE: patterns use word-boundary-free matching to catch common obfuscation
// techniques (inserting spaces or punctuation between characters).
const BLOCKLIST: BlocklistCategory[] = [
  // ── Severe: political / illegal content ─────────────────────────────────
  {
    severity: "SEVERE",
    score: 90,
    label: "政治违禁内容",
    patterns: [
      /法\s*轮\s*功/i,
      /天\s*安\s*门\s*事\s*件/i,
      /六\s*四\s*事\s*件/i,
    ],
  },
  // ── Severe: gambling ────────────────────────────────────────────────────
  {
    severity: "SEVERE",
    score: 85,
    label: "赌博诈骗",
    patterns: [
      /网\s*络\s*赌\s*博/i,
      /在\s*线\s*赌\s*场/i,
      /博\s*彩\s*平\s*台/i,
      /彩\s*票\s*内\s*幕/i,
    ],
  },
  // ── Severe: fraud / scam ─────────────────────────────────────────────────
  {
    severity: "SEVERE",
    score: 85,
    label: "诈骗内容",
    patterns: [
      /私\s*密\s*兼\s*职/i,
      /日\s*赚\s*千\s*元/i,
      /轻\s*松\s*月\s*入/i,
      /刷\s*单\s*返\s*利/i,
    ],
  },
  // ── Moderate: pornographic ───────────────────────────────────────────────
  {
    severity: "MODERATE",
    score: 70,
    label: "色情低俗内容",
    patterns: [
      /黄\s*色\s*小\s*说/i,
      /成\s*人\s*内\s*容/i,
      /露\s*骨\s*描\s*写/i,
      /色\s*情\s*图/i,
    ],
  },
  // ── Moderate: extreme violence ───────────────────────────────────────────
  {
    severity: "MODERATE",
    score: 65,
    label: "暴力极端内容",
    patterns: [
      /制\s*作\s*炸\s*弹/i,
      /自\s*制\s*武\s*器/i,
      /极\s*端\s*主\s*义/i,
    ],
  },
  // ── Moderate: drug-related ───────────────────────────────────────────────
  {
    severity: "MODERATE",
    score: 60,
    label: "毒品相关",
    patterns: [
      /购\s*买\s*毒\s*品/i,
      /大\s*麻\s*出\s*售/i,
    ],
  },
  // ── Mild: spam / advertising ─────────────────────────────────────────────
  {
    severity: "MILD",
    score: 25,
    label: "垃圾广告",
    patterns: [
      /加\s*微\s*信\s*咨\s*询/i,
      /扫\s*码\s*领\s*红\s*包/i,
      /私\s*聊\s*优\s*惠/i,
    ],
  },
  // ── Mild: insults / harassment ───────────────────────────────────────────
  {
    severity: "MILD",
    score: 20,
    label: "侮辱骚扰",
    patterns: [
      /傻\s*逼/i,
      /操\s*你\s*妈/i,
      /滚\s*出\s*去/i,
      /去\s*死\s*吧/i,
    ],
  },
];

// ── Result type ───────────────────────────────────────────────────────────────

export interface TextModerationResult {
  /** Final moderation decision. */
  status: ModerationStatus;
  /**
   * Human-readable label of the first triggered rule.
   * Undefined when the content is APPROVED.
   */
  reason?: string;
  /**
   * Severity score 0–100.  Higher = more severe.
   * 0 means no rule triggered.
   */
  score: number;
}

// ── Core text-screening function ──────────────────────────────────────────────

/**
 * Scan `text` against both the Trie word filter and the regex blocklist.
 * The more severe result across both layers is returned.
 *
 * NOTE: This is now async because the Trie filter may need to load custom
 * words from the database on first call (subsequent calls use a 5-min cache).
 */
export async function moderateText(text: string): Promise<TextModerationResult> {
  // Normalise for regex layer: collapse repeated whitespace / punctuation
  const normalised = text.replace(/[\s\u3000\u00A0]+/g, " ");

  // ── Layer 1: Regex blocklist ─────────────────────────────────────────────
  let regexResult: TextModerationResult = { status: "APPROVED", score: 0 };
  for (const category of BLOCKLIST) {
    for (const pattern of category.patterns) {
      if (pattern.test(normalised)) {
        const status: ModerationStatus =
          category.severity === "SEVERE" ? "REJECTED" : "FLAGGED";
        regexResult = { status, reason: category.label, score: category.score };
        break;
      }
    }
    if (regexResult.status === "REJECTED") break;
  }

  // ── Layer 2: Trie/DFA word filter ────────────────────────────────────────
  const trieScan = await scanText(text);
  let trieResult: TextModerationResult = { status: "APPROVED", score: 0 };
  if (trieScan.hits.length > 0) {
    trieResult = {
      status: trieScan.worstSeverity >= 80 ? "REJECTED" : "FLAGGED",
      reason: trieScan.hits[0].word,
      score:  trieScan.score,
    };
  }

  // Return the more severe of the two results
  if (regexResult.score >= trieResult.score) return regexResult;
  return trieResult;
}

// ── Image moderation stub ─────────────────────────────────────────────────────

export interface ImageModerationResult {
  status: ModerationStatus;
  reason?: string;
  score: number;
}

/**
 * Stub for image content screening.
 *
 * Replace the body with a call to an external image-recognition API
 * (e.g. Tencent Cloud Image Moderation, AWS Rekognition) to enable real
 * image-level moderation.  The function must remain async for forward
 * compatibility.
 *
 * @param _imageUrl  Public URL of the image to scan.
 */
export async function moderateImage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _imageUrl: string,
): Promise<ImageModerationResult> {
  // Stub — always approve.  Swap in real API call here.
  return { status: "APPROVED", score: 0 };
}

// ── Combined moderation entry point ──────────────────────────────────────────

export interface ContentModerationInput {
  /** All text fields to screen (title, content, summary, …). */
  textFields: string[];
  /** Optional image URLs to screen. */
  imageUrls?: string[];
}

export interface ContentModerationResult extends TextModerationResult {
  /** True when the decision was driven by an image finding. */
  fromImage: boolean;
}

/**
 * Run full content moderation (text + optional images).
 * Returns the most severe result across all fields.
 */
export async function moderateContent(
  input: ContentModerationInput,
): Promise<ContentModerationResult> {
  let worst: ContentModerationResult = {
    status:    "APPROVED",
    score:     0,
    fromImage: false,
  };

  // ── Text screening ────────────────────────────────────────────────────────
  for (const text of input.textFields) {
    if (!text) continue;
    const result = await moderateText(text);
    if (result.score > worst.score) {
      worst = { ...result, fromImage: false };
    }
    // Short-circuit: no point continuing once we have a REJECTED verdict
    if (worst.status === "REJECTED") return worst;
  }

  // ── Image screening ───────────────────────────────────────────────────────
  for (const url of input.imageUrls ?? []) {
    if (!url) continue;
    const result = await moderateImage(url);
    if (result.score > worst.score) {
      worst = { ...result, fromImage: true };
    }
    if (worst.status === "REJECTED") return worst;
  }

  return worst;
}
