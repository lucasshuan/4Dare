"use client";

import { m } from "motion/react";
import { useTranslations } from "next-intl";

/**
 * What for?'s purse in the match header: your coins this round. Its own small
 * coin, so the header never waits for the game's screens.
 */
export function Purse({ coins }: { coins: number }) {
  const t = useTranslations("room");
  return (
    <span
      role="status"
      aria-label={t("coins", { n: coins })}
      className="inline-flex h-10 items-center gap-2 rounded-pill bg-surface pr-3.5 pl-1.5 shadow-card"
    >
      <svg aria-hidden="true" viewBox="0 0 48 30" className="h-6.5 w-[30px]">
        <path d="M1 11v8a23 6 0 0 0 46 0v-8Z" fill="#c88f1d" />
        <ellipse cx="24" cy="11" rx="23" ry="7" fill="#f2c94c" />
        <ellipse
          cx="24"
          cy="11"
          rx="17"
          ry="4.4"
          fill="none"
          stroke="#c48a17"
          strokeWidth="1.4"
        />
      </svg>
      <m.b
        key={coins}
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="font-medium font-mono text-[19px] tabular-nums"
      >
        {coins}
      </m.b>
    </span>
  );
}
