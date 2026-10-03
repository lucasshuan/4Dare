"use client";

import { Popover } from "@base-ui/react/popover";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { useWithNames } from "@/components/ui/player-name";
import { Portrait } from "@/components/ui/portrait";
import { useRoomContext } from "@/features/data/room-context";
import type { PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";
import { seatColor } from "@/lib/seats";

/**
 * Everyone at the table in turn order, left to right: the first to play on the
 * left, the last on the right. Each ring has its player's seat colour. A player
 * whose card you can see opens it bigger on hover (or tap): picture, name, origin.
 */
export function PlayerStrip({ players }: { players: PlayerView[] }) {
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
            "flex min-w-0 rounded-md bg-surface transition-shadow duration-300 sm:flex-[1_1_150px]",
            p.away && "opacity-60",
          )}
          style={{
            boxShadow: p.isTurn
              ? `0 0 0 2px ${seatColor(p.seat)}`
              : "0 0 0 0 transparent",
          }}
        >
          {p.card && !p.cardHidden ? (
            <CardPeek player={p} />
          ) : (
            <PlayerRow player={p} />
          )}
        </motion.li>
      ))}
    </ul>
  );
}

/** Avatar, name and status, then the card's thumbnail ("?" for your own). */
function PlayerRow({ player: p }: { player: PlayerView }) {
  const t = useTranslations("turn.status");
  const name = useDisplayName();
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5 p-2 text-left">
      <Avatar
        avatar={p.avatar}
        isGuest={p.isGuest}
        name={p.name}
        size={32}
        className="max-sm:size-6"
      />
      <span className="flex min-w-0 flex-1 flex-col">
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
      </span>
      <span className="w-10 shrink-0">
        {p.cardHidden ? (
          <span className="flex aspect-[4/5] w-10 items-center justify-center rounded-sm bg-sky-soft font-display font-extrabold text-2xl text-sky">
            ?
          </span>
        ) : (
          // lifts and tilts while its card is open
          <span className="block transition-[scale,rotate,box-shadow] duration-300 ease-soft group-hover:-rotate-3 group-hover:scale-110 group-hover:shadow-card group-data-popup-open:-rotate-3 group-data-popup-open:scale-110 group-data-popup-open:shadow-card rounded-sm motion-reduce:transition-none">
            <Portrait
              src={p.card?.imageUrl ?? null}
              tone={p.isTurn && !p.isYou ? "other" : "neutral"}
              className="rounded-sm"
            />
          </span>
        )}
      </span>
    </span>
  );
}

/** The player's row as a trigger: hover, focus or tap shows their card, big. */
function CardPeek({ player: p }: { player: PlayerView }) {
  const t = useTranslations("turn.card");
  const withNames = useWithNames();
  const { playerById } = useRoomContext();
  const card = p.card;
  if (!card) return null;
  const picker = playerById(p.pickedById);
  const pickedBy = picker?.isYou
    ? t("youPickedFull")
    : picker
      ? withNames((n) => t("pickedBy", { name: n(picker) }))
      : null;
  const seat = seatColor(p.seat);
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={120}
        closeDelay={80}
        className="group flex min-w-0 flex-1 cursor-pointer rounded-md transition-colors duration-200 ease-soft hover:bg-sunken/60 data-popup-open:bg-sunken/60"
      >
        <PlayerRow player={p} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={10}
          collisionPadding={16}
          className="z-50"
        >
          <Popover.Popup className="group/peek w-60 origin-[var(--transform-origin)] rounded-xl bg-surface p-2.5 pb-4 shadow-pop outline-none transition-[scale,opacity,translate] duration-200 ease-soft data-ending-style:scale-90 data-starting-style:scale-90 data-ending-style:opacity-0 data-starting-style:opacity-0 data-starting-style:-translate-y-1 motion-reduce:transition-opacity">
            <Popover.Arrow className="data-[side=bottom]:-top-2 data-[side=top]:-bottom-2 data-[side=top]:rotate-180">
              <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden="true">
                <path d="M0 8 L8 0 L16 8 Z" className="fill-surface" />
              </svg>
            </Popover.Arrow>
            {/* the seat colour frames the picture, like the player's ring */}
            <span
              className="block overflow-hidden rounded-lg p-[3px]"
              style={{ background: seat }}
            >
              <span className="block overflow-hidden rounded-[9px]">
                <span className="block transition-[scale] duration-500 ease-soft group-data-starting-style/peek:scale-110 motion-reduce:transition-none">
                  <Portrait
                    src={card.imageUrl}
                    tone="other"
                    className="rounded-none"
                  />
                </span>
              </span>
            </span>
            <Popover.Title className="mx-1.5 mt-3 font-bold font-display text-[22px] leading-tight tracking-[-0.01em] [text-wrap:balance]">
              {card.name}
            </Popover.Title>
            {card.origin ? (
              <p className="mx-1.5 mt-1 font-medium text-[13px] text-ink-muted leading-[18px]">
                {card.origin}
              </p>
            ) : null}
            {pickedBy ? (
              <p className="mx-1.5 mt-3 flex items-center gap-1.5 border-line border-t pt-2.5 font-medium text-[13px] text-ink-muted">
                {pickedBy}
              </p>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
