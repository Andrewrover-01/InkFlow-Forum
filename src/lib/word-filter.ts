/**
 * Trie/DFA-based sensitive word filter.
 *
 * Architecture overview:
 * ──────────────────────
 * 1. A **Trie** (prefix tree) is built from all active sensitive words.
 *    Each node stores a map of child nodes (character → node) and a flag
 *    indicating whether it represents the end of a known sensitive word.
 *
 * 2. Text is **normalised** before matching to catch common obfuscation
 *    techniques: separator characters (spaces, punctuation, common full-width
 *    variants) inserted between characters are stripped, and a position map
 *    is maintained so matches can be traced back to the original text.
 *
 * 3. The scanner runs in **O(n × d)** time where n = text length and d =
 *    maximum word depth in the Trie.  For typical forum content this is fast
 *    enough without needing Aho-Corasick.
 *
 * 4. **Built-in word lists** cover three categories:
 *    - BASIC  — generic terms (political, gambling, fraud, obscene, etc.)
 *    - NOVEL  — novel/fiction-platform-specific terms
 *    - CUSTOM — words added by administrators via the admin UI (stored in DB)
 *
 * 5. **Custom words** are loaded from the database with a 5-minute TTL cache
 *    so admin changes take effect quickly without per-request DB queries.
 *
 * Public API:
 * ──────────
 *   scanText(text)         → { hits, score, worstSeverity }
 *   filterText(text)       → text with sensitive words replaced by ★
 *   rebuildCustomWords()   → force-reload custom words from DB (call after CRUD)
 */

import { prisma } from "@/lib/prisma";

// ── Trie Node ─────────────────────────────────────────────────────────────────

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEnd = false;
  word = "";
  severity = 0;
}

// ── Built-in word lists ───────────────────────────────────────────────────────

// severity: 0-100  higher = more severe
// Format: [word, severity]
type WordEntry = [string, number];

/** 基础通用词库 — covers political, illegal, obscene, gambling, fraud, harassment */
const BASIC_WORDS: WordEntry[] = [
  // Political / illegal
  ["法轮功", 90],
  ["天安门事件", 90],
  ["六四事件", 90],
  ["推翻政府", 90],
  ["颠覆国家", 90],
  ["分裂国家", 90],
  // Gambling / fraud
  ["网络赌博", 85],
  ["在线赌场", 85],
  ["博彩平台", 85],
  ["彩票内幕", 80],
  ["私密兼职", 80],
  ["日赚千元", 80],
  ["轻松月入", 80],
  ["刷单返利", 80],
  ["网络诈骗", 85],
  // Drugs
  ["购买毒品", 85],
  ["大麻出售", 85],
  ["冰毒", 85],
  ["海洛因", 85],
  // Terrorism / extreme violence
  ["制作炸弹", 90],
  ["自制武器", 85],
  ["极端主义", 85],
  ["恐怖袭击", 90],
  // Obscene / adult (generic)
  ["色情图", 70],
  ["裸聊", 70],
  ["援交", 75],
  // Spam / ads
  ["加微信咨询", 25],
  ["扫码领红包", 25],
  ["私聊优惠", 25],
  // Harassment
  ["傻逼", 20],
  ["滚出去", 20],
  ["去死吧", 20],
];

/** 小说行业专属词库 — vulgar/inappropriate content specific to novel platforms */
const NOVEL_WORDS: WordEntry[] = [
  // Vulgar/pornographic novel content
  ["黄色小说", 70],
  ["成人小说", 65],
  ["色情小说", 70],
  ["情色文学", 60],
  ["露骨描写", 65],
  ["淫秽内容", 75],
  ["性描写", 60],
  ["肉文", 55],
  // Piracy / copyright infringement
  ["免费全文下载", 50],
  ["小说盗版", 50],
  ["全集下载", 45],
  // Clickbait / fake rankings
  ["小说排行内幕", 30],
  ["刷推荐", 30],
  ["刷收藏", 30],
  // Violence in novel context (extreme)
  ["详细杀人手法", 80],
  ["虐待儿童", 85],
  ["未成年性", 90],
  ["萝莉文", 85],
  ["幼女文", 90],
];

// ── Noise characters stripped during normalisation ────────────────────────────

// Characters that can be inserted between real characters as obfuscation
// We strip these only when they appear between two "content" characters.
const NOISE_REGEX = /[\s\u3000\u00A0\u200B\u200C\u200D\uFEFF·・•\-_.,!！。，、；;:：""''【】「」（）()\[\]{}@#$%^&*+=|\\/<>?~`]/g;

// ── Trie builder ──────────────────────────────────────────────────────────────

function buildTrie(words: WordEntry[]): TrieNode {
  const root = new TrieNode();
  for (const [word, severity] of words) {
    if (!word) continue;
    let node = root;
    for (const ch of word) {
      let child = node.children.get(ch);
      if (!child) {
        child = new TrieNode();
        node.children.set(ch, child);
      }
      node = child;
    }
    node.isEnd = true;
    node.word = word;
    node.severity = severity;
  }
  return root;
}

// ── Normalisation helpers ─────────────────────────────────────────────────────

/**
 * Remove noise characters and return both:
 * - `normalised`: the cleaned string
 * - `posMap`: normalised[i] → index of that char in original string
 */
function normalise(text: string): { normalised: string; posMap: number[] } {
  const normalised: string[] = [];
  const posMap: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!NOISE_REGEX.test(ch)) {
      normalised.push(ch);
      posMap.push(i);
    }
    // Reset lastIndex since we're reusing the regex with test()
    NOISE_REGEX.lastIndex = 0;
  }
  return { normalised: normalised.join(""), posMap };
}

// ── Match result type ─────────────────────────────────────────────────────────

export interface SensitiveHit {
  word: string;
  severity: number;
  /** Start index in the ORIGINAL text */
  start: number;
  /** End index (exclusive) in the ORIGINAL text */
  end: number;
}

export interface ScanResult {
  hits: SensitiveHit[];
  /** Maximum severity found (0 if clean) */
  worstSeverity: number;
  /** Aggregate score (capped at 100) based on all hits */
  score: number;
}

// ── Core scanner ──────────────────────────────────────────────────────────────

/**
 * Scan normalised text against a Trie.
 * Returns all (possibly overlapping) matches.
 */
function scanWithTrie(
  normalised: string,
  posMap: number[],
  root: TrieNode,
): SensitiveHit[] {
  const hits: SensitiveHit[] = [];

  for (let i = 0; i < normalised.length; i++) {
    let node = root;
    for (let j = i; j < normalised.length; j++) {
      const ch = normalised[j];
      const child = node.children.get(ch);
      if (!child) break;
      node = child;
      if (node.isEnd) {
        // posMap[j] is always defined here: j < normalised.length === posMap.length
        hits.push({
          word:     node.word,
          severity: node.severity,
          start:    posMap[i],
          end:      posMap[j] + 1,
        });
        // Don't break — there may be longer matches starting at same position
      }
    }
  }

  return hits;
}

// ── Combined filter state ─────────────────────────────────────────────────────

// The combined Trie is rebuilt from built-in + custom words together.
let combinedTrie: TrieNode | null = null;

// Static Trie using only built-in words (no DB); lazily built by scanTextSync.
let staticTrie: TrieNode | null = null;

// Cache: custom words loaded from DB
let customWordsCache: WordEntry[] = [];
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Force-reload custom words from DB and rebuild the Trie. */
export async function rebuildCustomWords(): Promise<void> {
  try {
    const dbWords = await prisma.sensitiveWord.findMany({
      where:  { isActive: true },
      select: { word: true, severity: true },
    });
    customWordsCache = dbWords.map((w) => [w.word, w.severity] as WordEntry);
  } catch {
    // DB unavailable — keep stale cache
  }
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  combinedTrie   = buildTrie([...BASIC_WORDS, ...NOVEL_WORDS, ...customWordsCache]);
}

/** Return (or lazily build) the combined Trie. */
async function getTrie(): Promise<TrieNode> {
  if (!combinedTrie || Date.now() > cacheExpiresAt) {
    await rebuildCustomWords();
  }
  return combinedTrie!;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Scan `text` for sensitive words.
 *
 * @returns `ScanResult` with all hits, worst severity, and an aggregate score.
 */
export async function scanText(text: string): Promise<ScanResult> {
  if (!text) return { hits: [], worstSeverity: 0, score: 0 };

  const trie = await getTrie();
  const { normalised, posMap } = normalise(text);
  const hits = scanWithTrie(normalised, posMap, trie);

  if (hits.length === 0) return { hits: [], worstSeverity: 0, score: 0 };

  const worstSeverity = Math.max(...hits.map((h) => h.severity));
  // Aggregate score: worst hit + small bonus per additional hit (capped at 100)
  const score = Math.min(100, worstSeverity + (hits.length - 1) * 5);

  return { hits, worstSeverity, score };
}

/**
 * Replace sensitive words in `text` with ★ characters (one per character).
 * Also returns the scan result.
 */
export async function filterText(
  text: string,
): Promise<{ filtered: string; scan: ScanResult }> {
  const scan = await scanText(text);
  if (scan.hits.length === 0) return { filtered: text, scan };

  // Sort hits by start ascending to apply replacements left to right
  const sorted = [...scan.hits].sort((a, b) => a.start - b.start);

  const chars = text.split("");
  let lastEnd = 0;

  for (const hit of sorted) {
    if (hit.start < lastEnd) continue; // overlapping — skip
    const len = [...text.slice(hit.start, hit.end)].length;
    for (let k = hit.start; k < hit.start + len && k < chars.length; k++) {
      chars[k] = "★";
    }
    lastEnd = hit.end;
  }

  return { filtered: chars.join(""), scan };
}

// ── Synchronous scanner (using built-in words only, no DB) ───────────────────

/**
 * Synchronous scan using ONLY built-in words (no DB).
 * Used as a fast pre-check in routes that cannot await async DB loading.
 * Returns the same ScanResult shape.
 */
export function scanTextSync(text: string): ScanResult {
  if (!text) return { hits: [], worstSeverity: 0, score: 0 };

  // Lazily build a static trie from built-in words
  if (!staticTrie) {
    staticTrie = buildTrie([...BASIC_WORDS, ...NOVEL_WORDS]);
  }

  const { normalised, posMap } = normalise(text);
  const hits = scanWithTrie(normalised, posMap, staticTrie);

  if (hits.length === 0) return { hits: [], worstSeverity: 0, score: 0 };

  const worstSeverity = Math.max(...hits.map((h) => h.severity));
  const score = Math.min(100, worstSeverity + (hits.length - 1) * 5);
  return { hits, worstSeverity, score };
}
