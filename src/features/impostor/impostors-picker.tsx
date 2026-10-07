"use client";

import { Sparkles, VenetianMask } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { GAME_SEATS } from "@/game/games";
import { impostorsFor } from "@/game/impostor/engine";
import { cn } from "@/lib/cn";

const spring = { type: "spring", stiffness: 420, damping: 28 } as const;

/** What the host can pick: automatic, or a fixed number. */
const CHOICES = [null, 1, 2, 3] as const;

/** How wild a table gets with `k` impostors among `n`: calm, balanced or chaos. */
export function moodOf(k: number, n: number) {
  const share = k / n;
  return share <= 0.15 ? "calm" : share <= 0.25 ? "even" : "wild";
}
const MOOD_EMOJI = { calm: "😌", even: "😬", wild: "🔥" } as const;

/** Which of `n` cards wear the mask: spread across the row. */
const maskedAt = (k: number, n: number) =>
  new Set(
    Array.from({ length: k }, (_, i) => Math.round(((i + 0.5) * n) / k - 0.5)),
  );

/** `k` little masks, side by side; a sparkle stands for "automatic". */
function Masks({ k, on }: { k: number | null; on: boolean }) {
  return (
    <span className="flex h-5 items-center justify-center gap-0.5">
      {k === null ? (
        <Sparkles
          className={cn("size-4", on ? "text-on-no" : "text-no")}
          strokeWidth={2.25}
        />
      ) : (
        Array.from({ length: k }, (_, i) => (
          <VenetianMask
            // biome-ignore lint/suspicious/noArrayIndexKey: identical masks
            key={i}
            className={cn("size-4", on ? "text-on-no" : "text-no")}
            strokeWidth={2.25}
          />
        ))
      )}
    </span>
  );
}

/**
 * How many get the other card: automatic (one, two from seven players) or a
 * fixed number, each a key to tap. A number needs three players per
 * impostor, so the ones the room's seats can't reach stay off and say how
 * many it takes. Under them, the full table as a row of cards with the masks
 * and the mood they make, and what it comes to with the people seated now.
 */
export function ImpostorsPicker({
  value,
  seats,
  players = 0,
  onChange,
  disabled = false,
}: {
  value: number | null;
  /** The room's seats: the table the picker plans for. */
  seats: number;
  /** People in the room now; 0 when nobody sits yet (a room being made). */
  players?: number;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("impostor.picker");
  const still = useReducedMotion() ?? false;
  const n = Math.max(GAME_SEATS.impostor.min, seats);
  const k = impostorsFor(n, value);
  const masked = maskedAt(k, n);
  const mood = moodOf(k, n);
  const reachable = (c: number | null) => c === null || c * 3 <= n;
  const onlyOne = !reachable(2);
  const now =
    players >= GAME_SEATS.impostor.min && players < n
      ? impostorsFor(players, value)
      : null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-sm">{t("title")}</span>
        <span className="rounded-pill bg-sunken px-2.5 py-1 font-bold text-xs tabular-nums">
          {t("badge", { k, n })}
        </span>
      </div>

      <fieldset className="m-0 grid min-w-0 grid-cols-4 gap-1.5 border-0 p-0">
        <legend className="sr-only">{t("title")}</legend>
        {CHOICES.map((c) => {
          const on = c === value;
          const off = disabled || !reachable(c);
          return (
            <button
              key={String(c)}
              type="button"
              aria-pressed={on}
              disabled={off}
              onClick={() => onChange(c)}
              className={cn(
                "flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-md border-[1.5px] px-1 py-2 transition-[background-color,border-color,color,opacity] duration-200 ease-soft",
                on
                  ? "border-no bg-no text-on-no"
                  : "border-line bg-surface text-ink hover:border-line-strong",
                off && "opacity-40",
              )}
            >
              <Masks k={c} on={on} />
              <span className="font-semibold text-[13px] leading-tight">
                {c === null ? t("autoKey") : c}
              </span>
              {!reachable(c) && c !== null ? (
                <span className="text-[11px] text-ink-muted leading-tight">
                  {t("needs", { n: c * 3 })}
                </span>
              ) : null}
            </button>
          );
        })}
      </fieldset>

      {/* the full table: k of n cards turn into masks */}
      <div className="flex flex-col items-center gap-2 rounded-md bg-sunken px-3 py-3">
        <div className="flex flex-wrap justify-center gap-1">
          {Array.from({ length: n }, (_, i) => {
            const on = masked.has(i);
            return (
              <m.span
                // biome-ignore lint/suspicious/noArrayIndexKey: one card per seat
                key={i}
                animate={
                  still
                    ? { backgroundColor: on ? "var(--no)" : "var(--surface)" }
                    : {
                        rotateY: on ? 180 : 0,
                        y: on ? -3 : 0,
                        backgroundColor: on ? "var(--no)" : "var(--surface)",
                      }
                }
                transition={spring}
                className="flex aspect-[4/5.2] w-[clamp(18px,6vw,26px)] items-center justify-center rounded-[5px] text-on-no shadow-card"
              >
                {on ? (
                  <VenetianMask
                    className="size-[62%] [transform:rotateY(180deg)]"
                    strokeWidth={2}
                  />
                ) : null}
              </m.span>
            );
          })}
        </div>
        <span className="text-center text-[13px] text-ink-muted leading-snug">
          {onlyOne ? (
            t("moreFor2")
          ) : (
            <>
              <span aria-hidden className="mr-1">
                {MOOD_EMOJI[mood]}
              </span>
              <span className="font-semibold text-ink">
                {t(`mood.${mood}`)}
              </span>
              {value === null ? ` · ${t("autoHint")}` : null}
            </>
          )}
        </span>
      </div>

      {now !== null && now !== k ? (
        <p className="text-[13px] text-ink-muted">
          {t("now", { players, count: now })}
        </p>
      ) : null}
    </div>
  );
}
