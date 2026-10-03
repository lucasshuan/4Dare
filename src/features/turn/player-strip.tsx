"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Portrait } from "@/components/ui/portrait";
import type { PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";
import { seatColor } from "@/lib/seats";

/**
 * Everyone at the table in turn order, left to right: the first to play on the
 * left, the last on the right. Each ring has its player's seat colour.
 */
export function PlayerStrip({ players }: { players: PlayerView[] }) {
  const t = useTranslations("turn.status");
  const name = useDisplayName();
  const ordered = [...players].sort(
    (a, b) => (a.turnOrder ?? a.seat + 99) - (b.turnOrder ?? b.seat + 99),
  );
  return (
    <ul className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
      {ordered.map((p) => (
        <motion.li
          key={p.id}
          layout
          className={cn(
            "flex min-w-0 items-center gap-2.5 rounded-md bg-surface p-2 transition-shadow duration-300 sm:flex-[1_1_150px]",
            p.away && "opacity-60",
          )}
          style={{
            boxShadow: p.isTurn
              ? `0 0 0 2px ${seatColor(p.seat)}`
              : "0 0 0 0 transparent",
          }}
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
