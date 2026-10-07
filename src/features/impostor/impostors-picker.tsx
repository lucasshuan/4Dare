"use client";

import { Slider as BaseSlider } from "@base-ui/react/slider";
import { VenetianMask } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { GAME_SEATS } from "@/game/games";
import { impostorsFor } from "@/game/impostor/engine";
import { cn } from "@/lib/cn";

const spring = { type: "spring", stiffness: 420, damping: 28 } as const;

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

/**
 * How many get the other card: the table as a row of cards, `k` of them
 * turning into masks as the slider moves, the mood it makes in a word, and
 * "Automatic" (one, two from seven players). At most a third of the table.
 */
export function ImpostorsPicker({
  value,
  players,
  onChange,
  disabled = false,
}: {
  value: number | null;
  /** People at the table (at least the game's minimum counts). */
  players: number;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("impostor.picker");
  const still = useReducedMotion() ?? false;
  const n = Math.max(GAME_SEATS.impostor.min, players);
  const most = Math.max(1, Math.floor(n / 3));
  const k = impostorsFor(n, value);
  const masked = maskedAt(k, n);
  const mood = moodOf(k, n);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-sm">{t("title")}</span>
        <span className="rounded-pill bg-sunken px-2.5 py-1 font-bold text-xs tabular-nums">
          {t("badge", { k, n })}
        </span>
      </div>
      <div className="flex justify-center gap-1">
        {Array.from({ length: n }, (_, i) => {
          const on = masked.has(i);
          return (
            <m.span
              // biome-ignore lint/suspicious/noArrayIndexKey: one card per seat
              key={i}
              animate={
                still
                  ? { backgroundColor: on ? "var(--no)" : "var(--sunken)" }
                  : {
                      rotateY: on ? 180 : 0,
                      y: on ? -4 : 0,
                      backgroundColor: on ? "var(--no)" : "var(--sunken)",
                    }
              }
              transition={spring}
              className="flex aspect-[4/5.2] w-[clamp(18px,6vw,30px)] items-center justify-center rounded-[6px] text-on-no shadow-card"
            >
              {on ? (
                <VenetianMask
                  className="size-[60%] [transform:rotateY(180deg)]"
                  strokeWidth={2}
                />
              ) : null}
            </m.span>
          );
        })}
      </div>
      <BaseSlider.Root
        value={k}
        min={1}
        max={Math.max(2, most)}
        step={1}
        disabled={disabled || most === 1}
        onValueChange={(v) =>
          onChange(Math.min(most, Array.isArray(v) ? v[0] : v))
        }
        className="data-disabled:opacity-50"
      >
        <BaseSlider.Control className="flex w-full touch-none select-none items-center py-3">
          <BaseSlider.Track className="h-2 w-full select-none rounded-pill bg-sunken">
            <BaseSlider.Indicator className="select-none rounded-pill bg-no" />
            <BaseSlider.Thumb
              aria-label={t("title")}
              className="flex size-7 select-none items-center justify-center rounded-pill border-[3px] border-no bg-surface shadow-card has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-sky has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-offset-2"
            />
          </BaseSlider.Track>
        </BaseSlider.Control>
      </BaseSlider.Root>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-sm">
          <span aria-hidden className="mr-1.5">
            {MOOD_EMOJI[mood]}
          </span>
          {t(`mood.${mood}`)}
        </span>
        <button
          type="button"
          aria-pressed={value === null}
          disabled={disabled}
          onClick={() => onChange(value === null ? k : null)}
          className={cn(
            "rounded-pill border-[1.5px] px-3 py-1 font-semibold text-xs transition-colors duration-200 ease-soft",
            value === null
              ? "border-ink bg-ink text-on-ink"
              : "border-line-strong text-ink-muted hover:text-ink",
          )}
        >
          {t("auto")}
        </button>
      </div>
      {most === 1 ? (
        <p className="text-[13px] text-ink-muted">{t("moreFor2")}</p>
      ) : null}
    </div>
  );
}
