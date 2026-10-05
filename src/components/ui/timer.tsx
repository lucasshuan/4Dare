"use client";

import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useClock, useServerClock } from "@/lib/hooks/use-server-clock";
import { formatClock, isLowClock } from "@/lib/names";
import { useLoopSound } from "@/lib/sound";

/**
 * The step clock. While a reveal is on screen (now < stepStartsAt) it recharges:
 * the bar refills and the digits count back up to the full step, landing exactly
 * when the step starts. Then it counts down. With `alarm` (the clock waits on the
 * viewer), it turns to the "no" colour near the end and a clock ticks in a loop
 * from then until it runs out. When the
 * deadline comes sooner mid-step (votes and answers cut it), the lost time
 * drains off the digits and the bar in a blink and a "−18 s" drops off it.
 */
export function Timer({
  deadline,
  stepStartsAt,
  rechargeFrom,
  offset,
  compact,
  alarm,
  totalMs,
}: {
  deadline: number | null;
  stepStartsAt: number | null;
  /** When the refill began (the reveal's start); without it the refill takes the whole wait. */
  rechargeFrom?: number | null;
  offset: number;
  compact?: boolean;
  alarm?: boolean;
  /** The step's full length; the bar measures against it, so a cut shows as a drop. */
  totalMs?: number | null;
}) {
  const t = useTranslations("common");
  const change = useClockCut(deadline, stepStartsAt, offset);
  // a cut (a vote, an answer) or time given back (a vote taken back)
  const cut = change && !change.gain ? change : null;
  const gain = change?.gain ? change : null;
  // every frame while a cut shows, so its drain runs smooth
  const now = useServerClock(offset, cut ? 16 : 100);
  const full =
    deadline === null || stepStartsAt === null
      ? 0
      : (totalMs ?? deadline - stepStartsAt);
  useLoopSound(
    "tick",
    !!alarm &&
      deadline !== null &&
      stepStartsAt !== null &&
      now >= stepStartsAt &&
      now < deadline &&
      isLowClock((deadline - now) / 1000, full),
  );
  if (deadline === null || stepStartsAt === null) return null;
  const total = full;
  const recharging = now < stepStartsAt;
  let fraction: number;
  let shown: number;
  if (recharging) {
    const from = Math.min(rechargeFrom ?? now, stepStartsAt);
    const p = stepStartsAt === from ? 1 : (now - from) / (stepStartsAt - from);
    fraction = Math.min(1, Math.max(0, p));
    shown = (total / 1000) * fraction;
  } else {
    // the time a cut took is still there for a blink, draining away (ease out)
    const drain = cut ? Math.max(0, 1 - (now - cut.at) / CUT_DRAIN_MS) : 0;
    const left = Math.max(0, deadline - now) + (cut ? cut.ms * drain ** 3 : 0);
    fraction = total > 0 ? left / total : 0;
    shown = left / 1000;
  }
  const low = !!alarm && !recharging && isLowClock(shown, total);
  return (
    <div
      role="timer"
      aria-label={t("timeLeft", {
        time: formatClock(recharging ? total / 1000 : shown),
      })}
      className={cn(
        "relative inline-flex h-10 items-center gap-3 rounded-pill border bg-surface px-4 font-medium font-mono text-lg tabular-nums transition-[color,border-color,box-shadow] duration-500",
        low || cut ? "border-no text-no" : "border-line text-ink",
        recharging && "border-sky/50",
        // the cut lands with a short red glow, time given back with a green one
        cut && "shadow-[0_0_0_4px_var(--no-soft)] duration-200",
        gain && "border-yes shadow-[0_0_0_4px_var(--yes-soft)] duration-200",
      )}
    >
      <AnimatePresence>
        {change ? (
          <m.span
            key={change.key}
            aria-hidden="true"
            initial={{ opacity: 0, y: -6, scale: 0.85 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { type: "spring", stiffness: 520, damping: 26 },
            }}
            exit={{ opacity: 0, y: 10, transition: { duration: 0.35 } }}
            className={cn(
              "pointer-events-none absolute top-full right-3 mt-1.5 whitespace-nowrap rounded-pill px-2 py-0.5 font-semibold text-[13px] shadow-card",
              change.gain ? "bg-yes text-on-yes" : "bg-no text-on-no",
            )}
          >
            {t(change.gain ? "clockGain" : "clockCut", {
              seconds: Math.round(change.ms / 1000),
            })}
          </m.span>
        ) : null}
      </AnimatePresence>
      {/* always mounted, so screen readers hear the change when the text arrives */}
      <output className="sr-only">
        {change
          ? t(change.gain ? "clockGainLabel" : "clockCutLabel", {
              seconds: Math.round(change.ms / 1000),
            })
          : ""}
      </output>
      <span>{formatClock(shown)}</span>
      <span
        className={cn(
          "h-1.5 overflow-hidden rounded-pill bg-sunken",
          compact ? "w-10" : "w-18",
        )}
      >
        <span
          className={cn(
            "block h-full origin-left rounded-pill transition-[transform,background-color] duration-100 ease-linear",
            low || cut ? "bg-no" : recharging ? "bg-sky" : "bg-ink",
            // a cut drains the bar frame by frame, with no lag behind the digits
            cut && "duration-0",
          )}
          style={{ transform: `scaleX(${fraction})` }}
        />
      </span>
    </div>
  );
}

/** How long a cut stays on screen (ms). */
const CUT_SHOWN_MS = 1800;
/** How long the time a cut took takes to drain off the digits and the bar (ms). */
const CUT_DRAIN_MS = 180;

/**
 * Notices the deadline moving within the same step, sooner (a vote or an
 * answer cut the clock) or later (a vote taken back gave its time back), and
 * reports by how much (`ms`, always positive) and when (server time), for a
 * moment. A new step is never a change.
 */
function useClockCut(
  deadline: number | null,
  stepStartsAt: number | null,
  offset: number,
) {
  const clock = useClock(offset);
  const now = useRef(clock.now);
  useEffect(() => {
    now.current = clock.now;
  });
  const last = useRef({ deadline, stepStartsAt });
  const [cut, setCut] = useState<{
    ms: number;
    gain: boolean;
    key: number;
    at: number;
  } | null>(null);
  useEffect(() => {
    const prev = last.current;
    last.current = { deadline, stepStartsAt };
    if (stepStartsAt !== prev.stepStartsAt) return setCut(null);
    if (deadline === null || prev.deadline === null) return;
    const moved = deadline - prev.deadline;
    if (Math.abs(moved) >= 500)
      setCut({
        ms: Math.abs(moved),
        gain: moved > 0,
        key: deadline,
        at: now.current(),
      });
  }, [deadline, stepStartsAt]);
  useEffect(() => {
    if (!cut) return;
    const id = window.setTimeout(() => setCut(null), CUT_SHOWN_MS);
    return () => window.clearTimeout(id);
  }, [cut]);
  return cut;
}
