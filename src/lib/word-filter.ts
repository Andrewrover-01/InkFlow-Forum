/**
 * Sensitive word filter using a Trie / DFA approach.
 *
 * Features:
 *   - Two built-in word lists: BASIC (universal) + NOVEL (novel-specific)
 *   - DB-managed custom words loaded on first use and cached for 5 minutes
 *   - Variant-normalisation before matching:
 *       • fullwidth ASCII → half-width
 *       • common evasion separators stripped (spaces, dots, dashes, zero-width chars)
 *       • homoglyph substitution (e.g. ① → 1, О → o)
 *   - Three public APIs:
 *       scanTextSync(text)     → { matched, words }   (synchronous, built-ins only)
 *       scanText(text)         → Promise<ScanResult>  (includes DB custom words)
 *       filterText(text)       → Promise<string>      (replace hits with ★)
 */

import { prisma } from "@/lib/prisma";

// ─── Built-in word lists ──────────────────────────────────────────────────────

/** Universal sensitive words — applicable across the whole forum. */
const BASIC_WORDS: string[] = [
  // Pornography
  "色情", "裸体", "黄色小说", "成人内容", "三级片", "肉文", "H文", "18禁",
  "淫秽", "黄片", "做爱", "性爱", "裸照",
  // Drugs / Weapons
  "毒品", "大麻", "冰毒", "海洛因", "摇头丸", "枪支", "炸弹制造",
  // Fraud / Spam
  "诈骗", "洗钱", "刷单", "兼职赚钱", "快速赚钱", "投资理财", "点击链接",
  // Harmful extremism
  "恐怖袭击", "自杀方法", "人口贩卖",
];

/** Novel-industry-specific words — low-tolerance in serialised fiction context. */
const NOVEL_WORDS: string[] = [
  // Graphic sexual content typical in unregulated novel platforms
  "强奸", "轮奸", "乱伦", "淫乱", "性交", "阴茎", "阴道",
  "AV女优", "援交", "卖淫", "嫖娼", "性奴",
  // Underage-related
  "萝莉文", "幼女", "少女福利", "未成年H",
  // Extremist / political (novel framing)
  "反动小说", "颠覆政府", "推翻政权",
];

// ─── Trie node ────────────────────────────────────────────────────────────────

interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  word?: string; // original (un-normalised) word stored at leaf
}

function createNode(): TrieNode {
  return { children: new Map(), isEnd: false };
}

// ─── Trie class ───────────────────────────────────────────────────────────────

class WordFilter {
  private root: TrieNode = createNode();

  insert(word: string): void {
    const normalised = normalise(word);
    let node = this.root;
    for (const ch of normalised) {
      if (!node.children.has(ch)) {
        node.children.set(ch, createNode());
      }
      node = node.children.get(ch)!;
    }
    node.isEnd = true;
    node.word = word;
  }

  /**
   * Scan `text` for sensitive words.
   * Uses a sliding-window DFA walk: for each position, follow the trie as far
   * as possible; record any complete word found.
   */
  scan(text: string): ScanResult {
    const norm = normalise(text);
    const matched = new Set<string>();

    for (let i = 0; i < norm.length; i++) {
      let node = this.root;
      for (let j = i; j < norm.length; j++) {
        const ch = norm[j];
        if (!node.children.has(ch)) break;
        node = node.children.get(ch)!;
        if (node.isEnd) {
          matched.add(node.word!);
        }
      }
    }

    return { matched: matched.size > 0, words: Array.from(matched) };
  }

  /**
   * Replace every matched sensitive word in `text` with `replacement`.
   */
  filter(text: string, replacement = "★"): string {
    const norm = normalise(text);
    // Collect [start, end) spans in the ORIGINAL text via offset tracking.
    // Because normalisation collapses characters, we need to map normalised
    // positions back to original positions.
    const normToOrig = buildNormToOrigMap(text);

    const spans: Array<[number, number]> = [];

    for (let i = 0; i < norm.length; i++) {
      let node = this.root;
      for (let j = i; j < norm.length; j++) {
        const ch = norm[j];
        if (!node.children.has(ch)) break;
        node = node.children.get(ch)!;
        if (node.isEnd) {
          const origStart = normToOrig[i] ?? i;
          const origEnd = (normToOrig[j] ?? j) + 1;
          spans.push([origStart, origEnd]);
        }
      }
    }

    if (spans.length === 0) return text;

    // Merge overlapping spans and build the result
    spans.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [];
    for (const [s, e] of spans) {
      if (merged.length > 0 && s < merged[merged.length - 1][1]) {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
      } else {
        merged.push([s, e]);
      }
    }

    let result = "";
    let cursor = 0;
    for (const [s, e] of merged) {
      result += text.slice(cursor, s) + replacement.repeat(e - s);
      cursor = e;
    }
    result += text.slice(cursor);
    return result;
  }
}

// ─── Normalisation ────────────────────────────────────────────────────────────

/** Map of common homoglyphs to their canonical form. */
const HOMOGLYPHS: Record<string, string> = {
  "０": "0", "１": "1", "２": "2", "３": "3", "４": "4",
  "５": "5", "６": "6", "７": "7", "８": "8", "９": "9",
  // Cyrillic letters often confused with Latin
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x",
  // Circle-enclosed digits
  "①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5",
  "⑥": "6", "⑦": "7", "⑧": "8", "⑨": "9", "⑩": "10",
};

/** Regex for evasion separators (zero-width chars, common punctuation used to split words). */
const SEPARATOR_RE = /[\s\u200b\u200c\u200d\u3000\u00a0*_\-\.~·•,，。！!?？]+/g;

/** Normalise text for sensitive-word comparison. Exported for reuse. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    // fullwidth ASCII → half-width (！ → !, ０ → 0, Ａ → a, etc.)
    .replace(/[\uFF01-\uFF5E]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    // homoglyph substitution
    .replace(/[０-９аеорсх①-⑩]/g, (c) => HOMOGLYPHS[c] ?? c)
    // strip evasion separators
    .replace(SEPARATOR_RE, "");
}

/**
 * Build a mapping: normalisedIndex → originalIndex
 * so we can map trie hit positions back to the original string for replacement.
 */
function buildNormToOrigMap(original: string): number[] {
  const map: number[] = [];
  const lower = original.toLowerCase();

  let ni = 0; // normalised index
  for (let oi = 0; oi < lower.length; oi++) {
    let ch = lower[oi];
    // fullwidth → halfwidth
    if (ch.charCodeAt(0) >= 0xff01 && ch.charCodeAt(0) <= 0xff5e) {
      ch = String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
    }
    // homoglyph
    ch = HOMOGLYPHS[ch] ?? ch;
    // skip separators
    SEPARATOR_RE.lastIndex = 0; // reset before test to avoid stale lastIndex
    if (SEPARATOR_RE.test(ch)) {
      SEPARATOR_RE.lastIndex = 0;
      continue;
    }
    SEPARATOR_RE.lastIndex = 0;
    map[ni] = oi;
    ni++;
  }
  return map;
}

// ─── Singleton filters & cache ────────────────────────────────────────────────

let builtinFilter: WordFilter | null = null;

function getBuiltinFilter(): WordFilter {
  if (!builtinFilter) {
    builtinFilter = new WordFilter();
    for (const w of BASIC_WORDS) builtinFilter.insert(w);
    for (const w of NOVEL_WORDS) builtinFilter.insert(w);
  }
  return builtinFilter;
}

// DB custom word cache
let cachedFilter: WordFilter | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getFullFilter(): Promise<WordFilter> {
  const now = Date.now();
  if (cachedFilter && now < cacheExpiry) return cachedFilter;

  const builtin = getBuiltinFilter();
  let dbWords: string[] = [];

  try {
    const rows = await prisma.sensitiveWord.findMany({
      where: { isActive: true },
      select: { word: true },
    });
    dbWords = rows.map((r) => r.word);
  } catch {
    // If DB is unavailable, fall back to built-in only
    return builtin;
  }

  if (dbWords.length === 0) {
    cachedFilter = builtin;
  } else {
    const full = new WordFilter();
    for (const w of BASIC_WORDS) full.insert(w);
    for (const w of NOVEL_WORDS) full.insert(w);
    for (const w of dbWords) full.insert(w);
    cachedFilter = full;
  }

  cacheExpiry = now + CACHE_TTL_MS;
  return cachedFilter;
}

/** Invalidate the DB word cache (call after admin adds/removes words). */
export function invalidateWordFilterCache(): void {
  cachedFilter = null;
  cacheExpiry = 0;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ScanResult {
  matched: boolean;
  words: string[];
}

/**
 * Synchronous scan using built-in word lists only (no DB).
 * Safe to call in tight loops / middleware.
 */
export function scanTextSync(text: string): ScanResult {
  return getBuiltinFilter().scan(text);
}

/**
 * Async scan using built-in + DB custom words.
 */
export async function scanText(text: string): Promise<ScanResult> {
  const filter = await getFullFilter();
  return filter.scan(text);
}

/**
 * Replace all sensitive words in `text` with ★ characters.
 * Uses built-in + DB custom words.
 */
export async function filterText(text: string): Promise<string> {
  const filter = await getFullFilter();
  return filter.filter(text);
}

// ─── Exports for admin ────────────────────────────────────────────────────────

export { BASIC_WORDS, NOVEL_WORDS };
