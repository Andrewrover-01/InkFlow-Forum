/**
 * Input sanitization utilities.
 *
 * Strips characters that are dangerous regardless of context:
 *   • Null bytes (\x00)      — bypass certain parsers / DB issues
 *   • Non-printable control chars (except \t \n \r)
 *
 * Does NOT perform HTML escaping — that is the responsibility of
 * the rendering layer (React already escapes by default).
 *
 * Usage:
 *   const clean = sanitizeBody(await req.json());
 *   const { title } = schema.parse(clean);
 */

/** Strip null bytes and non-printable control characters from a string. */
export function sanitizeString(value: string): string {
  return value
    .replace(/\0/g, "")                            // null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // control chars (keep \t \n \r)
}

/** Recursively sanitize all string values inside a plain object / array. */
function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > 8) return value;
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[sanitizeString(k)] = sanitizeValue(v, depth + 1);
    }
    return result;
  }
  return value;
}

/**
 * Sanitize a parsed JSON body.
 * Always returns a plain object (never null / array).
 */
export function sanitizeBody(raw: unknown): Record<string, unknown> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return sanitizeValue(raw, 0) as Record<string, unknown>;
}
