"use client";

import { Check } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { HintLabel } from "@/components/ui/hint-label";
import type { GameKey } from "@/game/games";
import { GOSTO_KEYS, GOSTOS, type Gosto } from "@/game/gostos";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/lib/motion";
import { useLineupCount } from "./lineup-catalog";
import { useThemeCount } from "./theme-catalog";

const spring = { type: "spring", stiffness: 420, damping: 32 } as const;
/** Pastel tile behind each gosto's emoji. */
const TONES = [
  "bg-sky-soft",
  "bg-butter-soft",
  "bg-apricot-soft",
  "bg-yes-soft",
  "bg-no-soft",
];

/** Turns one gosto on or off; the last one on stays on. */
export function toggleGosto(off: readonly Gosto[], key: Gosto): Gosto[] {
  if (off.includes(key)) return off.filter((k) => k !== key);
  const next = GOSTO_KEYS.filter((k) => k === key || off.includes(k));
  return next.length === GOSTO_KEYS.length ? [...off] : next;
}

/** One gosto as a card: emoji, name and, when roomy, a few characters it covers. */
function GostoCard({
  index,
  gosto,
  on,
  last,
  compact,
  onToggle,
}: {
  index: number;
  gosto: (typeof GOSTOS)[number];
  on: boolean;
  /** The only one still on: it can't go off. */
  last: boolean;
  compact: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("common.gostos");
  const still = useReducedMotion() ?? false;
  return (
    <m.button
      type="button"
      aria-pressed={on}
      aria-disabled={last || undefined}
      onClick={last ? undefined : onToggle}
      initial={false}
      whileHover={still || last ? undefined : { y: -2 }}
      whileTap={last ? undefined : { scale: 0.96 }}
      transition={spring}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md border-[1.5px] text-left transition-[background-color,border-color,color,box-shadow] duration-200 ease-soft",
        compact ? "h-11 py-1 pr-2 pl-1" : "min-h-16 py-2 pr-3 pl-2",
        on
          ? "border-transparent bg-surface text-ink shadow-card"
          : // canvas, not transparent: the shadow would show through
            "border-line border-dashed bg-canvas text-ink-muted hover:border-line-strong",
        last && "cursor-default",
      )}
    >
      <m.span
        aria-hidden
        initial={false}
        animate={
          on
            ? {
                scale: still ? 1 : [1, 1.28, 1],
                rotate: still ? 0 : [0, -14, 0],
                opacity: 1,
                filter: "grayscale(0)",
              }
            : { scale: 0.88, rotate: 0, opacity: 0.5, filter: "grayscale(1)" }
        }
        transition={{ duration: 0.42, ease: ease.soft }}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-sm leading-none transition-colors duration-200",
          compact ? "size-9 text-lg" : "size-11 text-2xl",
          on ? TONES[index % TONES.length] : "bg-sunken",
        )}
      >
        {gosto.emoji}
      </m.span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="line-clamp-2 font-semibold text-[13px] leading-4 [word-break:auto-phrase]">
          {t(`${gosto.key}.name`)}
        </span>
        {compact ? null : (
          <span className="truncate text-[12px] text-ink-muted leading-4">
            {t(`${gosto.key}.examples`)}
          </span>
        )}
      </span>
      <span className="relative flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line">
        <AnimatePresence initial={false}>
          {on ? (
            <m.span
              key="on"
              initial={{ scale: 0, rotate: -60 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={spring}
              className="-inset-[1.5px] absolute flex items-center justify-center rounded-full bg-ink text-on-ink"
            >
              <Check className="size-3" strokeWidth={3.25} />
            </m.span>
          ) : null}
        </AnimatePresence>
      </span>
    </m.button>
  );
}

/** Every gosto as a card that turns on and off. */
export function GostoGrid({
  off,
  onChange,
  compact = false,
}: {
  off: readonly Gosto[];
  onChange: (off: Gosto[]) => void;
  compact?: boolean;
}) {
  const lastOn = off.length === GOSTO_KEYS.length - 1;
  return (
    <ul
      className={cn(
        "grid gap-1.5",
        compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
      )}
    >
      {GOSTOS.map((g, i) => {
        const on = !off.includes(g.key);
        return (
          <li key={g.key}>
            <GostoCard
              index={i}
              gosto={g}
              on={on}
              last={on && lastOn}
              compact={compact}
              onToggle={() => onChange(toggleGosto(off, g.key))}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** How many themes the room keeps (What for?: characters), and a word when that is too few. */
export function ThemeCountLine({
  room,
}: {
  room: {
    game: GameKey;
    offGostos: readonly Gosto[];
    offThemes: readonly string[];
  };
}) {
  if (room.game === "lineup")
    return <CardCountLine offGostos={room.offGostos} />;
  return <ThemeCount room={room} />;
}

function ThemeCount({
  room,
}: {
  room: {
    game: GameKey;
    offGostos: readonly Gosto[];
    offThemes: readonly string[];
  };
}) {
  const t = useTranslations("home.createRoom");
  const count = useThemeCount(room);
  if (!count) return <p className="h-5" />;
  return (
    <p
      aria-live="polite"
      className="flex flex-wrap items-baseline gap-x-2 font-medium text-[13px]"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={count.on}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: dur.fast }}
          className="text-ink tabular-nums"
        >
          {t("themesOn", { on: count.on, total: count.total })}
        </m.span>
      </AnimatePresence>
      {count.tooFew ? (
        <span className="text-no">{t("needThemes")}</span>
      ) : count.few ? (
        <span className="text-apricot">{t("fewThemes")}</span>
      ) : null}
    </p>
  );
}

/** What for?: how many characters the room's gostos send to auction, and a word when too few. */
function CardCountLine({ offGostos }: { offGostos: readonly Gosto[] }) {
  const t = useTranslations("home.createRoom.lineup");
  const count = useLineupCount({ game: "lineup", offGostos });
  if (!count) return <p className="h-5" />;
  return (
    <p
      aria-live="polite"
      className="flex flex-wrap items-baseline gap-x-2 font-medium text-[13px]"
    >
      <span className="text-ink tabular-nums">
        {t("cardsOn", { count: count.cards })}
      </span>
      {count.tooFew ? <span className="text-no">{t("needCards")}</span> : null}
    </p>
  );
}

/** The "Style" tab: the gostos the room keeps. */
export function GostoFields({
  value,
  onChange,
}: {
  value: { game: GameKey; offGostos: Gosto[]; offThemes: string[] };
  onChange: (offGostos: Gosto[]) => void;
}) {
  const t = useTranslations("home.createRoom");
  const hintId = useId();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <HintLabel
          hint={t(value.game === "lineup" ? "lineup.gostosHint" : "gostosHint")}
          hintId={hintId}
        >
          {t("gostos")}
        </HintLabel>
        <ThemeCountLine room={value} />
      </div>
      <GostoGrid off={value.offGostos} onChange={onChange} />
    </div>
  );
}
