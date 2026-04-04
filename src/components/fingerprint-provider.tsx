"use client";

import { useEffect } from "react";

/**
 * Sets a stable device fingerprint cookie (`__fp`) on first visit.
 * The cookie is a random UUID persisted for 1 year.
 * It is read server-side by the abuse-gate to track and block devices
 * independently of IP address or user account.
 */
export function FingerprintProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only generate if not already set
    if (document.cookie.split(";").some((c) => c.trim().startsWith("__fp="))) {
      return;
    }

    // Generate a random UUID as the device fingerprint
    const fp =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

    const maxAge = 365 * 24 * 60 * 60; // 1 year in seconds
    document.cookie = `__fp=${fp}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }, []);

  return <>{children}</>;
}
