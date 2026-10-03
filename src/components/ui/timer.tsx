"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useServerClock } from "@/lib/hooks/use-server-clock";
import { formatClock, isLowClock } from "@/lib/names";
import { useLoopSound } from "@/lib/sound";

/**
 * The step clock. While a reveal is on screen (now < stepStartsAt) it recharges:
 * the bar refills and the digits count back up to the full step, landing exactly
 * when the step starts. Then it counts down, turning to the "no" colour near the end;
 * with `tick`, a clock ticks in a loop from then until it runs out.
 */
export function Timer({
  deadline,
  stepStartsAt,
  rechargeFrom,
  offset,
  compact,
  tick,
}: {
  deadline: number | null;
  stepStartsAt: number | null;
  /** When the refill began (the reveal's start); without it the refill takes the whole wait. */
  rechargeFrom?: number | null;
  offset: number;
  compact?: boolean;
  tick?: boolean;
}) {
  const t = useTranslations("common");
  const now = useServerClock(offset, 100);
  useLoopSound(
    "tick",
    !!tick &&
      deadline !== null &&
      stepStartsAt !== null &&
      now >= stepStartsAt &&
      now < deadline &&
      isLowClock((deadline - now) / 1000, deadline - stepStartsAt),
  );
  if (deadline === null || stepStartsAt === null) return null;
  const total = deadline - stepStartsAt;
  const recharging = now < stepStartsAt;
  let fraction: number;
  let shown: number;
  if (recharging) {
    const from = Math.min(rechargeFrom ?? now, stepStartsAt);
    const p = stepStartsAt === from ? 1 : (now - from) / (stepStartsAt - from);
    fraction = Math.min(1, Math.max(0, p));
    shown = (total / 1000) * fraction;
  } else {
    const left = Math.max(0, deadline - now);
    fraction = total > 0 ? left / total : 0;
    shown = left / 1000;
  }
  const low = !recharging && isLowClock(shown, total);
  return (
    <div
      role="timer"
      aria-label={t("timeLeft", {
        time: formatClock(recharging ? total / 1000 : shown),
      })}
      className={cn(
        "inline-flex h-10 items-center gap-3 rounded-pill border bg-surface px-4 font-medium font-mono text-lg tabular-nums transition-colors duration-500",
        low ? "border-no text-no" : "border-line text-ink",
        recharging && "border-sky/50",
      )}
    >
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
            low ? "bg-no" : recharging ? "bg-sky" : "bg-ink",
          )}
          style={{ transform: `scaleX(${fraction})` }}
        />
      </span>
    </div>
  );
}
