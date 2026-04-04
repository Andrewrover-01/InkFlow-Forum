"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ShieldCheck, RefreshCw } from "lucide-react";

interface CaptchaWidgetProps {
  /** Action key matching the server-side CAPTCHA action */
  action: string;
  /**
   * Called once when the challenge is solved.
   * @param token   The signed challenge token to include in the API request.
   * @param answer  The slider position (0-100) for slider challenges; undefined
   *                for invisible challenges.
   */
  onToken: (token: string, answer?: number) => void;
  className?: string;
}

type WidgetState = "loading" | "invisible" | "slider" | "success" | "fetchError";

interface ChallengeData {
  type: "invisible" | "slider";
  token: string;
  targetPercent: number;
}

/**
 * Adaptive CAPTCHA widget.
 *
 * - Normal users  → invisible mode: resolves automatically after a short delay
 *   with no visible UI interruption.
 * - Graylisted users / registration → slider mode: the user must drag a handle
 *   into the highlighted target zone.
 *
 * Works on both desktop (mouse) and mobile (touch) via Pointer Events.
 */
export function CaptchaWidget({
  action,
  onToken,
  className = "",
}: CaptchaWidgetProps) {
  const [state, setState] = useState<WidgetState>("loading");
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  // Slider position as a percentage (0-100)
  const [position, setPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [sliderError, setSliderError] = useState("");

  const trackRef = useRef<HTMLDivElement>(null);
  // Guard to ensure onToken is called exactly once per challenge
  const firedRef = useRef(false);

  // ── Fetch a new challenge from the server ────────────────────────────────
  const fetchChallenge = useCallback(async () => {
    // Dev / test bypass — immediately resolve without any server round-trip
    const bypass = process.env.NEXT_PUBLIC_CAPTCHA_BYPASS_TOKEN;
    if (bypass) {
      firedRef.current = true;
      onToken(bypass);
      return;
    }

    setState("loading");
    firedRef.current = false;
    setPosition(0);
    setSliderError("");
    setChallenge(null);

    try {
      const res = await fetch(
        `/api/captcha/challenge?action=${encodeURIComponent(action)}`,
      );
      if (!res.ok) throw new Error("fetch failed");
      const data: ChallengeData = await res.json();
      setChallenge(data);
      setState(data.type);
    } catch {
      setState("fetchError");
    }
  }, [action, onToken]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  // ── Auto-resolve invisible challenge after a short delay ──────────────────
  // The delay discourages trivially fast bot submissions while being imperceptible
  // to real users (the form is typically still being filled in).
  useEffect(() => {
    if (state !== "invisible" || !challenge || firedRef.current) return;
    const t = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        // Invisible mode: resolved silently, no visible state change needed
        onToken(challenge.token);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [state, challenge, onToken]);

  // ── Pointer helpers for slider ────────────────────────────────────────────
  function positionFromPointer(clientX: number): number {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (state !== "slider" || firedRef.current) return;
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setPosition(positionFromPointer(e.clientX));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setPosition(positionFromPointer(e.clientX));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    checkSliderAnswer();
  }

  function checkSliderAnswer() {
    if (!challenge || firedRef.current) return;
    const TOLERANCE = 10;
    if (Math.abs(position - challenge.targetPercent) <= TOLERANCE) {
      firedRef.current = true;
      setState("success");
      onToken(challenge.token, Math.round(position));
    } else {
      setSliderError("位置不对，请再试一次");
      setPosition(0);
      setTimeout(() => setSliderError(""), 1500);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  // Invisible mode has no visible UI — onToken fires silently in the background
  if (state === "invisible" || state === "loading") return null;
  // After invisible resolves, also render nothing
  if (state === "success" && challenge?.type === "invisible") return null;

  return (
    <div
      className={`rounded-sm border border-parchment-300 bg-parchment-50 px-3 py-2.5 ${className}`}
    >
      {/* ── Success ── */}
      {state === "success" && (
        <div className="flex items-center gap-2 text-jade-700">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-sans">安全验证通过</span>
        </div>
      )}

      {/* ── Fetch error ── */}
      {state === "fetchError" && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-cinnabar-600 font-sans">
            验证加载失败，请重试
          </span>
          <button
            type="button"
            onClick={fetchChallenge}
            className="flex items-center gap-1 text-xs text-ink-500 hover:text-ink-700 transition-colors flex-shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            重试
          </button>
        </div>
      )}

      {/* ── Slider puzzle ── */}
      {state === "slider" && challenge && (
        <div className="space-y-2">
          <p className="text-xs text-ink-500 font-sans">
            拖拽滑块到高亮区域完成安全验证
          </p>

          {/* Track */}
          <div
            ref={trackRef}
            className={`relative h-9 rounded-sm bg-parchment-200 border border-parchment-300 select-none touch-none overflow-hidden ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Target zone highlight (centred at targetPercent, width = 20%) */}
            <div
              className="absolute top-0 bottom-0 bg-jade-200/70 border-x border-jade-400/50"
              style={{
                left: `${Math.max(0, challenge.targetPercent - 10)}%`,
                width: "20%",
              }}
            />

            {/* Progress fill */}
            <div
              className="absolute top-0 left-0 bottom-0 bg-cinnabar-400/20"
              style={{ width: `${position}%`, transition: "none" }}
            />

            {/* Draggable handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-sm bg-cinnabar-600 shadow flex items-center justify-center"
              style={{
                left: `calc(${position}% - 16px)`,
                transition: isDragging ? "none" : "left 0.15s",
              }}
            >
              <span className="text-white text-sm font-sans leading-none select-none">
                ⇆
              </span>
            </div>
          </div>

          {sliderError && (
            <p className="text-xs text-cinnabar-600 font-sans">{sliderError}</p>
          )}
        </div>
      )}
    </div>
  );
}
