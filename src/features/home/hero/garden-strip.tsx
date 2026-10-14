"use client";

import { useLocale, useTranslations } from "next-intl";
import { type CSSProperties, useMemo } from "react";
import { type Play, stage } from "@/features/profile/garden-days";
import { cn } from "@/lib/cn";
import s from "./garden-strip.module.css";

const LEAF = "#93e0a6";
const PETALS = ["#ffd1e6", "#f6e3a1", "#ffc39e", "#d9c7f4"];

/** The plant a day grew: a sprout, a leaf, a bud, a flower. */
function Plant({ st, petal }: { st: number; petal: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      {st === 1 ? (
        <path
          fill={LEAF}
          d="M8 13c0-2 0-3.2.2-4.4C6.9 8.8 5.2 8 5 6c2 .1 3.1 1 3.4 2.1C8.9 6.7 10 6 11.4 6c-.1 1.7-1.5 2.7-3 2.8-.1 1.2-.1 2.4-.1 4.2z"
        />
      ) : st === 2 ? (
        <path
          fill={LEAF}
          d="M7.4 13.6c-.1-2.3 0-4.4.3-6.4C6 7.4 3.9 6.2 3.7 3.8c2.3.2 3.7 1.6 4.2 3 .6-1.9 2-3.4 4.4-3.5-.1 2.4-1.9 3.9-4 4.2-.2 1.9-.3 3.9-.2 6.1zM8 13.5c.6-1.7 2-2.6 3.8-2.6-.4 1.6-1.9 2.6-3.8 2.6z"
        />
      ) : st === 3 ? (
        <>
          <path
            fill={LEAF}
            d="M7.5 14c-.1-1.9 0-3.6.2-5.2-1.5-.1-3.2-1.2-3.4-3.2 1.9.1 3.1 1.3 3.5 2.4l.1-.6h.6c0 .3 0 .6-.1.8.6-1 1.8-2 3.5-2-.2 1.9-1.8 3-3.4 3.1-.2 1.5-.3 3.1-.2 4.7z"
          />
          <circle cx="8" cy="4.2" r="2.6" fill={petal} />
        </>
      ) : (
        <>
          <path
            fill={LEAF}
            d="M7.5 15c-.1-1.6 0-3 .1-4.3-1.3-.2-2.6-1-2.8-2.6 1.5 0 2.5.9 2.9 1.8l.1-.6h.6v.7c.5-.9 1.4-1.7 2.8-1.7-.2 1.5-1.4 2.4-2.8 2.5-.1 1.3-.2 2.7-.1 4.2z"
          />
          <g fill={petal}>
            <circle cx="8" cy="2.6" r="2" />
            <circle cx="10.7" cy="4.9" r="2" />
            <circle cx="5.3" cy="4.9" r="2" />
            <circle cx="8" cy="7.1" r="1.8" />
          </g>
          <circle cx="8" cy="4.9" r="1.3" fill="#f6e3a1" />
        </>
      )}
    </svg>
  );
}

const Moon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path
      fill="currentColor"
      d="M10.6 2.4a5.6 5.6 0 1 0 3 9.6A4.6 4.6 0 0 1 10.6 2.4z"
    />
  </svg>
);

const Seed = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <ellipse cx="8" cy="12.6" rx="2.1" ry="1.5" fill="#d8b07a" />
    <path
      d="M8 11.2c.1-.9.5-1.5 1.1-1.8"
      stroke={LEAF}
      strokeWidth=".9"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

/** A little terracotta pot, one a day. */
const Pot = () => (
  <svg viewBox="0 0 24 17" aria-hidden="true">
    <path
      d="M5 6h14l-1.7 9.2a1.6 1.6 0 0 1-1.6 1.3H8.3a1.6 1.6 0 0 1-1.6-1.3z"
      fill="#c4643b"
    />
    <path d="M6.6 8.6h10.8" stroke="#a9512e" strokeWidth=".9" opacity=".6" />
    <rect x="2.5" y="1.6" width="19" height="4.6" rx="1.3" fill="#dc7b4c" />
    <path
      d="M4 2.6h16"
      stroke="#f2a374"
      strokeWidth=".9"
      strokeLinecap="round"
      opacity=".8"
    />
    <ellipse cx="12" cy="1.9" rx="8.4" ry="1.3" fill="#5b3a23" />
  </svg>
);

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * The last seven days as a little bed, in the reader's own days: a day with
 * matches grew a plant, a day without one rested under the moon, today is a
 * seed until it grows. No streak, no count, nothing to keep up. It opens the
 * full garden on the profile.
 */
export function GardenStrip({
  plays,
  onOpen,
  className,
}: {
  plays: readonly Play[];
  onOpen: () => void;
  className?: string;
}) {
  const t = useTranslations("home.hero.garden");
  const locale = useLocale();
  const grew = t.raw("grew") as string[];
  const days = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of plays) {
      const k = dayKey(new Date(p.at));
      count.set(k, (count.get(k) ?? 0) + 1);
    }
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - i));
      return { date, n: count.get(dayKey(date)) ?? 0, today: i === 6 };
    });
  }, [plays]);
  const narrow = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  const long = new Intl.DateTimeFormat(locale, { weekday: "long" });

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t("label")}
      className={cn(s.strip, className)}
    >
      <span className={s.bed} aria-hidden="true">
        {days.map(({ date, n, today }, i) => {
          const st = stage(n);
          const day = today ? t("today") : long.format(date);
          const tip = st
            ? `${day} · ${grew[st]}`
            : `${day} · ${today ? t("ready") : t("rested")}`;
          return (
            <span
              key={dayKey(date)}
              data-tip={tip}
              style={{ "--i": i } as CSSProperties}
              className={cn(
                s.day,
                st ? s.grew : today ? s.seed : s.rest,
                today && s.today,
              )}
            >
              <span className={s.pl}>
                <span className={s.sw}>
                  <span className={s.gu}>
                    {st ? (
                      <Plant st={st} petal={PETALS[i % PETALS.length]} />
                    ) : today ? (
                      <Seed />
                    ) : (
                      <Moon />
                    )}
                  </span>
                </span>
              </span>
              <span className={s.pot}>
                <Pot />
              </span>
              <span className={s.dl}>
                {today ? t("today") : narrow.format(date)}
              </span>
            </span>
          );
        })}
      </span>
      <span className={s.fly} aria-hidden="true">
        <svg viewBox="0 0 16 12" aria-hidden="true">
          <path
            fill="#ffd1e6"
            d="M8 6C6 1 1 0 1 3.5S5 8 8 6zM8 6c2-5 7-6 7-2.5S11 8 8 6z"
          />
          <path
            fill="#ffc39e"
            d="M8 6C6 8 2.5 11 3.5 11.5S7.5 9 8 6zM8 6c2 2 5.5 5 4.5 5.5S8.5 9 8 6z"
          />
        </svg>
      </span>
    </button>
  );
}
