"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Shield, CheckCircle, Loader2 } from "lucide-react";

export type CaptchaMode = "invisible" | "slider";

interface CaptchaWidgetProps {
  /** Which write action this widget guards. */
  action: "register" | "post" | "reply" | "comment";
  /** Called with the verified token once the user passes the challenge. */
  onVerify: (token: string) => void;
  /** Called if the challenge fetch fails (parent can show an error). */
  onError?: (msg: string) => void;
}

const SLIDER_FULL_WIDTH = 256; // px — must match CSS below

/**
 * CaptchaWidget
 *
 * Two display modes, determined by the server:
 *
 * "invisible" — A small "验证中…" indicator auto-resolves after 1.5 s.
 *               Normal authenticated users see this — zero friction.
 *
 * "slider"    — User drags a thumb to the right end (≥85% of track width).
 *               Shown for registration and graylisted identifiers.
 *               Touch-friendly: works on both PC and mobile.
 *
 * CI bypass: if NEXT_PUBLIC_CAPTCHA_BYPASS_TOKEN is set, the widget
 * immediately calls onVerify(bypassToken) without rendering anything.
 */
export function CaptchaWidget({ action, onVerify, onError }: CaptchaWidgetProps) {
  const [mode, setMode] = useState<CaptchaMode | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  // Slider state
  const [dragging, setDragging] = useState(false);
  const [sliderX, setSliderX] = useState(0);
  const startXRef = useRef<number>(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const THUMB_SIZE = 40; // px

  const handleVerified = useCallback(
    (tok: string) => {
      setVerified(true);
      setToken(tok);
      onVerify(tok);
    },
    [onVerify]
  );

  // Fetch challenge on mount
  useEffect(() => {
    // CI bypass: skip widget entirely
    const bypass = process.env.NEXT_PUBLIC_CAPTCHA_BYPASS_TOKEN;
    if (bypass) {
      handleVerified(bypass);
      return;
    }

    let cancelled = false;
    async function fetchChallenge() {
      try {
        const res = await fetch(`/api/captcha/challenge?action=${action}`);
        if (!res.ok) throw new Error("challenge_fetch_failed");
        const json = await res.json();
        if (cancelled) return;
        setToken(json.token as string);
        setMode(json.mode as CaptchaMode);
        setLoading(false);

        // Invisible mode: auto-resolve after 1.5 s
        if (json.mode === "invisible") {
          setTimeout(() => {
            if (!cancelled) handleVerified(json.token as string);
          }, 1500);
        }
      } catch (err) {
        if (!cancelled) {
          onError?.((err as Error).message ?? "captcha_error");
          setLoading(false);
        }
      }
    }
    fetchChallenge();
    return () => { cancelled = true; };
  }, [action, handleVerified, onError]);

  // ── Slider drag handlers ──────────────────────────────────────────────

  const getTrackWidth = () =>
    trackRef.current?.getBoundingClientRect().width ?? SLIDER_FULL_WIDTH;

  function onPointerDown(e: React.PointerEvent) {
    if (verified) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    startXRef.current = e.clientX - sliderX;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || verified) return;
    const trackWidth = getTrackWidth();
    const maxX = trackWidth - THUMB_SIZE;
    const newX = Math.min(maxX, Math.max(0, e.clientX - startXRef.current));
    setSliderX(newX);
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    const trackWidth = getTrackWidth();
    const maxX = trackWidth - THUMB_SIZE;
    // Require ≥85% of track dragged
    if (sliderX >= maxX * 0.85 && token) {
      setSliderX(maxX);
      handleVerified(token);
    } else {
      // Snap back
      setSliderX(0);
    }
  }

  // Touch equivalents (pointer events cover both on modern browsers, but keep
  // touch handlers for older Safari)
  function onTouchStart(e: React.TouchEvent) {
    if (verified) return;
    startXRef.current = e.touches[0].clientX - sliderX;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging || verified) return;
    const trackWidth = getTrackWidth();
    const maxX = trackWidth - THUMB_SIZE;
    const newX = Math.min(maxX, Math.max(0, e.touches[0].clientX - startXRef.current));
    setSliderX(newX);
  }

  function onTouchEnd() {
    onPointerUp();
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (!mode && !loading && !verified) return null;

  // Invisible mode — small status chip
  if (mode === "invisible" || (verified && mode !== "slider")) {
    return (
      <div className="flex items-center gap-2 text-xs font-sans text-ink-400 py-1 select-none">
        {verified ? (
          <>
            <CheckCircle className="w-3.5 h-3.5 text-jade-600" />
            <span className="text-jade-600">验证通过</span>
          </>
        ) : (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>安全验证中…</span>
          </>
        )}
      </div>
    );
  }

  // Loading state (before mode is known)
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs font-sans text-ink-400 py-1 select-none">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>加载验证…</span>
      </div>
    );
  }

  // Slider mode
  const trackWidth = SLIDER_FULL_WIDTH;
  const maxX = trackWidth - THUMB_SIZE;
  const fillPct = verified ? 100 : (sliderX / Math.max(1, maxX)) * 100;

  return (
    <div className="select-none" aria-label="人机验证">
      <div
        ref={trackRef}
        className="relative rounded-full border border-parchment-300 bg-parchment-50 overflow-hidden"
        style={{ width: trackWidth, height: THUMB_SIZE }}
      >
        {/* Fill track */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-colors ${
            verified ? "bg-jade-100" : "bg-cinnabar-50"
          }`}
          style={{ width: `${fillPct}%` }}
        />

        {/* Label text */}
        <span
          className={`absolute inset-0 flex items-center justify-center text-xs font-sans pointer-events-none transition-opacity ${
            dragging || verified ? "opacity-0" : "opacity-100"
          } ${verified ? "text-jade-600" : "text-ink-400"}`}
        >
          {verified ? "验证通过 ✓" : "← 拖动滑块验证 →"}
        </span>

        {/* Thumb */}
        <div
          className={`absolute top-0 bottom-0 flex items-center justify-center rounded-full border shadow-sm cursor-grab active:cursor-grabbing transition-colors touch-none ${
            verified
              ? "bg-jade-500 border-jade-600 text-white"
              : dragging
              ? "bg-cinnabar-500 border-cinnabar-600 text-white"
              : "bg-white border-parchment-300 text-ink-400 hover:border-cinnabar-400"
          }`}
          style={{ width: THUMB_SIZE, height: THUMB_SIZE, left: sliderX }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          role="slider"
          aria-valuenow={Math.round(fillPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="验证滑块"
        >
          {verified ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
        </div>
      </div>
      <p className="mt-1 text-xs font-sans text-ink-400 flex items-center gap-1">
        <Shield className="w-3 h-3" />
        墨香安全验证 · 防止机器人操作
      </p>
    </div>
  );
}
