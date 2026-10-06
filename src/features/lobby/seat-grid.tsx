"use client";

import { Check, Crown, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import type { PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { seatWash } from "@/lib/seats";
import { type SeatAction, SeatMenu } from "./host-controls";

/**
 * What fills a seat swaps in place: the new fades in over the old one fading
 * out, in the same cell, so no seat ever moves.
 */
const fill = {
  initial: { opacity: 0, scale: 0.97 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: dur.base, ease: ease.soft },
  },
  exit: { opacity: 0, transition: { duration: dur.fast, ease: ease.soft } },
} as const;

const cardClass =
  "flex items-center gap-3 rounded-md border-[1.5px] p-3 [grid-area:1/1]";

/**
 * The room's seats in order: players, then open seats, then (for the host
 * only) closed ones. The host gets the same quiet dropdown on each seat they
 * can act on: remove a player, close an open seat, open a closed one.
 */
export function SeatGrid({
  players,
  seats,
  slots,
  host,
  canClose,
  onSeats,
  onKick,
}: {
  players: PlayerView[];
  /** Open seats, the taken ones included. */
  seats: number;
  /** Seats shown: every one the game allows for the host, the open ones for everyone else. */
  slots: number;
  /** The viewer is the host. */
  host: boolean;
  canClose: boolean;
  onSeats: (seats: number) => void;
  onKick: (id: string) => void;
}) {
  const t = useTranslations("lobby");
  const name = useDisplayName();

  const fillOf = (i: number): ReactNode => {
    const p = players[i];
    if (p) {
      const kick: SeatAction = {
        label: t("kick"),
        danger: true,
        confirm: {
          title: t("kickTitle", { name: p.name }),
          body: t("kickBody"),
          yes: t("kickYes"),
        },
        run: () => onKick(p.id),
      };
      return (
        <m.div
          key={p.id}
          {...fill}
          // the seat shows the colour that is theirs while they stay
          style={seatWash(p.colorSlot)}
          className={cn(cardClass, "border-transparent")}
        >
          <Avatar avatar={p.avatar} seat={p.colorSlot} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold text-sm">
              {name(p, p.isYou)}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-[13px] text-ink-muted">
              {p.isHost ? (
                <Crown className="size-3.5" strokeWidth={1.75} />
              ) : null}
              {p.isHost ? t("host") : p.ready ? t("ready") : t("notReady")}
            </span>
          </div>
          {p.isHost ? null : (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <span
                role="img"
                aria-label={p.ready ? t("ready") : t("notReady")}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-pill transition-colors duration-300",
                  p.ready ? "bg-yes-soft text-yes" : "bg-no-soft text-no",
                )}
              >
                {p.ready ? (
                  <Check className="size-4" strokeWidth={2.25} />
                ) : (
                  <X className="size-4" strokeWidth={2.25} />
                )}
              </span>
              {host ? (
                <SeatMenu
                  label={t("playerActions", { name: p.name })}
                  actions={[kick]}
                />
              ) : null}
            </div>
          )}
        </m.div>
      );
    }
    const open = i < seats;
    const action: SeatAction | null = !host
      ? null
      : open
        ? canClose
          ? { label: t("closeSeat"), run: () => onSeats(seats - 1) }
          : null
        : { label: t("openSeat"), run: () => onSeats(seats + 1) };
    return (
      <m.div
        key={open ? "open" : "closed"}
        {...fill}
        className={cn(
          cardClass,
          "text-ink-muted",
          open
            ? "border-line border-dashed"
            : "border-line bg-[repeating-linear-gradient(-45deg,transparent_0_9px,var(--line)_9px_10.5px)]",
        )}
      >
        {open ? (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-pill border-[1.5px] border-line-strong border-dashed font-bold font-display">
            ?
          </span>
        ) : (
          // a struck-through ring: nobody sits here
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-pill border-[1.5px] border-line-strong/70 bg-canvas">
            <span className="h-[1.5px] w-6 -rotate-45 rounded-pill bg-line-strong/70" />
          </span>
        )}
        <span className="font-medium">
          {t(open ? "emptySeat" : "closedSeat")}
        </span>
        {action ? (
          <SeatMenu label={t("seatActions")} actions={[action]} />
        ) : null}
      </m.div>
    );
  };

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: slots }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a seat is its place in the room
        <li key={i} className="grid">
          <AnimatePresence initial={false}>{fillOf(i)}</AnimatePresence>
        </li>
      ))}
    </ul>
  );
}
