/**
 * Input sanitization utilities.
 *
 * Provides helper functions to clean and validate user-supplied strings before
 * they are stored or processed.  This is a defence-in-depth layer — the primary
 * validation is done by Zod schemas in each route; sanitization runs on top to
 * strip dangerous byte sequences and detect anomalies.
 */

/**
 * Remove ASCII null bytes and non-printable control characters.
 * Preserves common whitespace: horizontal tab (0x09), newline (0x0A),
 * carriage return (0x0D).
 */
export function removeControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Sanitize a plain-text string: strip control characters, trim surrounding
 * whitespace, and truncate to `maxLength`.
 */
export function sanitizeText(input: string, maxLength = 1_000): string {
  return removeControlChars(input).trim().slice(0, maxLength);
}

/**
 * Sanitize rich content (post body, reply text, …): strip HTML tags to
 * neutralise injection attempts, then apply plain-text sanitization.
 */
export function sanitizeRichText(input: string, maxLength = 10_000): string {
  const stripped = input.replace(/<[^>]*>/g, ""); // strip all HTML tags
  return sanitizeText(stripped, maxLength);
}

/**
 * Detect obviously malicious patterns in user input.
 * Returns `true` when a pattern indicative of script injection or null-byte
 * smuggling is found.
 *
 * This is intentionally conservative to avoid false positives on legitimate
 * content (e.g. a forum post about web development).  Only the clearest
 * injection vectors are matched.
 *
 * Used for *logging and rejection* purposes in the security pipeline.
 */
export function isSuspiciousInput(input: string): boolean {
  return (
    /<\s*script/i.test(input) ||    // <script …> tags
    /javascript\s*:/i.test(input) || // javascript: URI scheme
    /\x00/.test(input)               // null bytes
  );
}

/**
 * Sanitize all top-level string values in a plain object.
 * Non-string values are left untouched.  Returns a new object.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  maxLength = 1_000,
): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] =
      typeof value === "string" ? sanitizeText(value, maxLength) : value;
  }
  return result as T;
}
