"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Portrait } from "@/components/ui/portrait";
import type { PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";

/** Everyone at the table: who they are, what they are doing, and their card. You come first. */
export function PlayerStrip({ players }: { players: PlayerView[] }) {
  const t = useTranslations("turn.status");
  const name = useDisplayName();
  const ordered = [...players].sort(
    (a, b) => Number(b.isYou) - Number(a.isYou),
  );
  return (
    <ul className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
      {ordered.map((p) => (
        <motion.li
          key={p.id}
          layout
          className={cn(
            "flex min-w-0 items-center gap-2.5 rounded-md bg-surface p-2 transition-shadow duration-300 sm:flex-[1_1_150px]",
            p.isTurn &&
              (p.isYou
                ? "shadow-[0_0_0_2px_var(--sky)]"
                : "shadow-[0_0_0_2px_var(--apricot)]"),
            p.away && "opacity-60",
          )}
        >
          <Avatar
            avatar={p.avatar}
            isGuest={p.isGuest}
            name={p.name}
            size={32}
            className="max-sm:size-6"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold text-sm">
              {name(p, p.isYou)}
            </span>
            <motion.span
              key={p.status}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="truncate font-medium text-ink-muted text-xs"
            >
              {t(p.status)}
            </motion.span>
          </div>
          <span className="w-10 shrink-0">
            {p.cardHidden ? (
              <span className="flex aspect-[4/5] w-10 items-center justify-center rounded-sm bg-sky-soft font-display font-extrabold text-2xl text-sky">
                ?
              </span>
            ) : (
              <Portrait
                src={p.card?.imageUrl ?? null}
                tone={p.isTurn && !p.isYou ? "other" : "neutral"}
                className="rounded-sm"
              />
            )}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
