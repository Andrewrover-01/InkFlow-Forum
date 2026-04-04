"use client";

import { useEffect } from "react";

/**
 * Generates a lightweight, stable browser fingerprint from publicly available
 * browser properties and stores it in the `__fp` cookie so that every
 * subsequent request automatically carries it.
 *
 * This is intentionally simple — it is a best-effort signal for the
 * server-side risk engine, not a cryptographic identity.
 */
function buildFingerprint(): string {
  if (typeof window === "undefined") return "";

  const parts: string[] = [
    navigator.userAgent,
    navigator.language ?? "",
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    String(navigator.hardwareConcurrency ?? ""),
    String((navigator as { deviceMemory?: number }).deviceMemory ?? ""),
  ];

  // Lightweight djb2-style hash
  let hash = 5381;
  const str = parts.join("|");
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash >>>= 0; // keep it unsigned 32-bit
  }
  return hash.toString(36);
}

/**
 * Drop the fingerprint into a first-party cookie so the browser sends it
 * automatically with every same-origin request.
 */
function setFingerprintCookie(fp: string): void {
  const maxAge = 30 * 24 * 60 * 60; // 30 days
  document.cookie = `__fp=${encodeURIComponent(fp)}; max-age=${maxAge}; path=/; SameSite=Strict`;
}

/**
 * Invisible component — mounts once, computes the fingerprint, and persists it
 * to a cookie.  Add it near the root of the application (e.g. inside
 * `<Providers>` or the root layout body).
 */
export function FingerprintProvider() {
  useEffect(() => {
    const fp = buildFingerprint();
    if (fp) setFingerprintCookie(fp);
  }, []);

  return null;
}
