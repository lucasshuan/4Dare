"use client";

import { Moon, MousePointerClick, Sprout } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GameThumb, useGameName } from "@/features/create/game-info";
import type { GameKey } from "@/game/games";
import { cn } from "@/lib/cn";
import {
  GARDEN_WEEKS,
  type GardenDay,
  gardenDays,
  type Play,
  stage,
} from "./garden-days";

const LABEL_COL = 28;
const GAP = 3;

/** The plant a day grew: a sprout, a leaf, a bud, a flower (in the profile's accent). */
export function Plant({ stage: s }: { stage: number }) {
  if (s === 0) return null;
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="absolute inset-0 size-full"
    >
      {s === 1 ? (
        <path
          className="fill-yes"
          d="M8 13c0-2 0-3.2.2-4.4C6.9 8.8 5.2 8 5 6c2 .1 3.1 1 3.4 2.1C8.9 6.7 10 6 11.4 6c-.1 1.7-1.5 2.7-3 2.8-.1 1.2-.1 2.4-.1 4.2z"
        />
      ) : s === 2 ? (
        <path
          className="fill-yes"
          d="M7.4 13.6c-.1-2.3 0-4.4.3-6.4C6 7.4 3.9 6.2 3.7 3.8c2.3.2 3.7 1.6 4.2 3 .6-1.9 2-3.4 4.4-3.5-.1 2.4-1.9 3.9-4 4.2-.2 1.9-.3 3.9-.2 6.1zM8 13.5c.6-1.7 2-2.6 3.8-2.6-.4 1.6-1.9 2.6-3.8 2.6z"
        />
      ) : s === 3 ? (
        <>
          <path
            className="fill-yes"
            d="M7.5 14c-.1-1.9 0-3.6.2-5.2-1.5-.1-3.2-1.2-3.4-3.2 1.9.1 3.1 1.3 3.5 2.4l.1-.6h.6c0 .3 0 .6-.1.8.6-1 1.8-2 3.5-2-.2 1.9-1.8 3-3.4 3.1-.2 1.5-.3 3.1-.2 4.7z"
          />
          <circle cx="8" cy="4.2" r="2.6" fill="var(--accent)" />
        </>
      ) : (
        <>
          <path
            className="fill-yes"
            d="M7.5 15c-.1-1.6 0-3 .1-4.3-1.3-.2-2.6-1-2.8-2.6 1.5 0 2.5.9 2.9 1.8l.1-.6h.6v.7c.5-.9 1.4-1.7 2.8-1.7-.2 1.5-1.4 2.4-2.8 2.5-.1 1.3-.2 2.7-.1 4.2z"
          />
          <g fill="var(--accent)">
            <circle cx="8" cy="2.6" r="2" />
            <circle cx="10.7" cy="4.9" r="2" />
            <circle cx="5.3" cy="4.9" r="2" />
            <circle cx="8" cy="7.1" r="1.8" />
          </g>
          <circle cx="8" cy="4.9" r="1.3" className="fill-butter" />
        </>
      )}
    </svg>
  );
}

/** A day's square: sunken when empty, green under leaves, the accent's tint under buds and flowers. */
const cellClass = (day: Pick<GardenDay, "matches" | "future">) => {
  const s = stage(day.matches);
  return cn(
    "relative block size-(--c) rounded-[4px]",
    day.future
      ? "bg-transparent shadow-[inset_0_0_0_1px_var(--line)]"
      : s === 0
        ? "bg-sunken"
        : s <= 2
          ? "bg-yes-soft"
          : "bg-(--accent-soft)",
  );
};

/** A day's line: its date, matches, wins and the games played. */
function useDayWords() {
  const t = useTranslations("player.activity");
  const format = useFormatter();
  return {
    date: (d: Date) =>
      format.dateTime(d, { weekday: "short", day: "numeric", month: "short" }),
    tally: (d: GardenDay) =>
      [
        t("dayMatches", { n: d.matches }),
        d.wins ? t("dayWins", { n: d.wins }) : null,
      ]
        .filter(Boolean)
        .join(" · "),
  };
}

/**
 * The activity garden: a year of days, each growing a plant by how many
 * matches it had. As many weeks as fit the box (newest on the right, never a
 * sideways scroll); hovering names a day, clicking it tells its matches below.
 */
export function Garden({
  plays,
  game,
  now,
}: {
  plays: readonly Play[];
  /** Only this game's matches; null for every game. */
  game: GameKey | null;
  now: number;
}) {
  const t = useTranslations("player.activity");
  const locale = useLocale();
  const words = useDayWords();
  const gameName = useGameName();
  const days = useMemo(
    () => gardenDays(game ? plays.filter((p) => p.game === game) : plays, now),
    [plays, game, now],
  );
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ weeks: GARDEN_WEEKS, cell: 13 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      if (!width) return;
      // a year when the squares can be 12 px or more (up to 18), else fewer weeks
      const room = width - LABEL_COL - GAP;
      const full = Math.floor(room / GARDEN_WEEKS - GAP);
      const cell = Math.min(18, Math.max(12, full));
      const weeks = Math.max(
        13,
        Math.min(GARDEN_WEEKS, Math.floor(room / (cell + GAP))),
      );
      setFit((f) =>
        f.weeks === weeks && f.cell === cell ? f : { weeks, cell },
      );
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  const first = days.length - fit.weeks * 7;
  const shown = days.slice(first);
  const [picked, setPicked] = useState<GardenDay | null>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(
    null,
  );
  useEffect(() => {
    if (!tip) return;
    const hide = () => setTip(null);
    document.addEventListener("scroll", hide, { capture: true, passive: true });
    return () =>
      document.removeEventListener("scroll", hide, { capture: true });
  }, [tip]);

  const monthFormat = new Intl.DateTimeFormat(locale, { month: "short" });
  const dayFormat = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const months: { col: number; label: string }[] = [];
  for (let w = 0, last = -1; w < fit.weeks - 2; w++) {
    const d = shown[w * 7].date;
    if (d.getMonth() !== last && d.getDate() <= 7) {
      last = d.getMonth();
      months.push({
        col: w + 2,
        label: monthFormat.format(d).replace(".", ""),
      });
    }
  }
  // Monday, Wednesday and Friday of the first shown week, named
  const weekdays = [0, 2, 4].map((i) => ({
    row: i + 2,
    label: dayFormat.format(shown[i].date).replace(".", ""),
  }));

  const describe = (d: GardenDay) =>
    d.future
      ? words.date(d.date)
      : `${words.date(d.date)} · ${d.matches ? words.tally(d) : t("rest")}`;

  return (
    <div className="flex flex-col gap-3">
      <div ref={box} className="relative min-w-0">
        <fieldset
          className="m-0 grid w-max min-w-0 gap-(--g) border-0 p-0 [--g:3px]"
          style={
            {
              "--c": `${fit.cell}px`,
              gridTemplateColumns: `${LABEL_COL}px repeat(${fit.weeks}, var(--c))`,
              gridTemplateRows: "16px repeat(7, var(--c))",
            } as React.CSSProperties
          }
          onPointerLeave={() => setTip(null)}
        >
          <legend className="sr-only">{t("gardenLabel")}</legend>
          {months.map((m) => (
            <span
              key={m.col}
              aria-hidden="true"
              className="row-start-1 whitespace-nowrap font-semibold text-[11px] text-ink-muted"
              style={{ gridColumn: `${m.col} / span 3` }}
            >
              {m.label}
            </span>
          ))}
          {weekdays.map((w) => (
            <span
              key={w.row}
              aria-hidden="true"
              className="col-start-1 font-semibold text-[10.5px] text-ink-muted leading-(--c)"
              style={{ gridRow: w.row }}
            >
              {w.label}
            </span>
          ))}
          {shown.map((d, i) => {
            const isPicked = picked?.date.getTime() === d.date.getTime();
            const isToday =
              !d.future && (shown[i + 1]?.future ?? i === shown.length - 1);
            return (
              <button
                key={d.date.getTime()}
                type="button"
                disabled={d.future}
                aria-label={describe(d)}
                aria-pressed={isPicked}
                onClick={() => setPicked(d)}
                onPointerEnter={(e) => {
                  if (e.pointerType === "touch") return;
                  const r = e.currentTarget.getBoundingClientRect();
                  setTip({
                    text: describe(d),
                    x: r.left + r.width / 2,
                    y: r.top,
                  });
                }}
                className={cn(
                  cellClass(d),
                  "outline-offset-1 enabled:cursor-pointer focus-visible:outline-2 focus-visible:outline-sky",
                  isToday && "outline-2 outline-ink",
                  isPicked && "outline-2 outline-sky",
                )}
                style={{
                  gridColumn: Math.floor(i / 7) + 2,
                  gridRow: (i % 7) + 2,
                }}
              >
                <Plant stage={stage(d.matches)} />
              </button>
            );
          })}
        </fieldset>
      </div>
      <div
        aria-hidden="true"
        className="flex flex-wrap items-center gap-x-[18px] gap-y-2 font-semibold text-[12.5px] text-ink-muted [--c:13px]"
      >
        <span>{t("less")}</span>
        <span className="inline-flex items-center gap-1">
          {[0, 1, 2, 4, 7].map((n) => (
            <span key={n} className={cellClass({ matches: n, future: false })}>
              <Plant stage={stage(n)} />
            </span>
          ))}
        </span>
        <span>{t("more")}</span>
        <span>{t("legend")}</span>
      </div>
      <div
        aria-live="polite"
        className="flex min-h-11 flex-wrap items-center gap-3 rounded-lg bg-sunken px-3.5 py-2.5 text-sm"
      >
        {!picked ? (
          <>
            <MousePointerClick
              className="size-[18px] text-ink-muted"
              strokeWidth={1.75}
            />
            <span className="text-ink-muted">{t("pickDay")}</span>
          </>
        ) : picked.matches === 0 ? (
          <>
            <Moon className="size-[18px] text-ink-muted" strokeWidth={1.75} />
            <span>
              <b className="font-semibold">{words.date(picked.date)}</b>
              <span className="text-ink-muted"> · {t("rest")}</span>
            </span>
          </>
        ) : (
          <>
            <Sprout className="size-[18px] text-yes" strokeWidth={1.75} />
            <span>
              <b className="font-semibold">{words.date(picked.date)}</b> ·{" "}
              {words.tally(picked)}
            </span>
            {(Object.entries(picked.games) as [GameKey, number][]).map(
              ([g, n]) => (
                <span
                  key={g}
                  className="inline-flex items-center gap-1.5 rounded-pill bg-surface py-0.5 pr-2.5 pl-0.5 font-semibold text-[13px]"
                >
                  <GameThumb game={g} size="tiny" />
                  {gameName(g)} · {n}
                </span>
              ),
            )}
          </>
        )}
      </div>
      {tip ? <Tip {...tip} /> : null}
    </div>
  );
}

/** The day's name over its square, on the page (a box around the garden would clip it). */
function Tip({ text, x, y }: { text: string; x: number; y: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.min(Math.max(8, x - w / 2), window.innerWidth - w - 8);
    const top = y - h - 8 < 8 ? y + 22 : y - h - 8;
    setPos({ left, top });
  }, [x, y]);
  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed top-0 left-0 z-[60] whitespace-nowrap rounded-[10px] bg-ink px-2.5 py-1.5 font-semibold text-[12.5px] text-on-ink shadow-pop"
      style={{
        transform: pos ? `translate(${pos.left}px, ${pos.top}px)` : undefined,
        opacity: pos ? 1 : 0,
      }}
    >
      {text}
    </div>,
    document.body,
  );
}
