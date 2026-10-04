"use client";

import { Popover } from "@base-ui/react/popover";
import { type AnimationSequence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { useWithNames } from "@/components/ui/player-name";
import { Portrait } from "@/components/ui/portrait";
import { useRoomContext } from "@/features/data/room-context";
import { useStageTimeline } from "@/features/stage/use-stage-timeline";
import type { PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { seatColor, seatWash } from "@/lib/seats";

/** The strip's entrance after the cast: each item drops in, one after the other. */
const DROP = { y: -30, duration: 0.5, stagger: 0.06 } as const;

/**
 * Everyone at the table in turn order, left to right: the first to play on the
 * left, the last on the right. Each face wears its player's colour as a ring;
 * the turn's card takes the colour whole. A player whose card you can see opens
 * it bigger on hover (or tap): picture, name, origin.
 *
 * `enter.at` (server ms): the items drop in from there (the cast's entrance
 * beat), on the server clock, so a reload lands on the same frame.
 */
export function PlayerStrip({
  players,
  enter,
}: {
  players: PlayerView[];
  enter?: { at: number };
}) {
  const ordered = [...players].sort(
    (a, b) => (a.turnOrder ?? a.seat + 99) - (b.turnOrder ?? b.seat + 99),
  );
  const at = enter?.at ?? null;
  const ref = useStageTimeline<HTMLUListElement>({
    startsAt: at,
    deps: [at, ordered.map((p) => p.id).join()],
    build: (scope, { reduced }) => {
      if (at === null) return [];
      const items = [
        ...scope.querySelectorAll<HTMLElement>("[data-strip-item]"),
      ];
      return items.map((item, i): AnimationSequence[number] =>
        reduced
          ? [item, { opacity: [0, 1] }, { at: i * DROP.stagger, duration: 0.2 }]
          : [
              item,
              { opacity: [0, 1], y: [DROP.y, 0] },
              {
                at: i * DROP.stagger,
                duration: DROP.duration,
                ease: gs.backOut(1.6),
              },
            ],
      );
    },
  });
  return (
    <ul ref={ref} className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
      {ordered.map((p) => (
        <m.li
          key={p.id}
          layout
          className={cn(
            "flex min-w-0 sm:flex-[1_1_150px]",
            p.away && "opacity-60",
          )}
        >
          {/* the entrance moves this one, so it never fights the layout animation above */}
          <div
            data-strip-item
            className="flex min-w-0 flex-1 rounded-md bg-surface transition-[box-shadow,background-color] duration-300"
            style={{
              // the turn widens the player's colour from their ring to the whole card
              ...(p.isTurn ? seatWash(p.colorSlot) : null),
              boxShadow: p.isTurn
                ? `0 0 0 2px ${seatColor(p.colorSlot)}`
                : "0 0 0 0 transparent",
              ...(at !== null
                ? { opacity: 0, transform: `translateY(${DROP.y}px)` }
                : null),
            }}
          >
            {p.card && !p.cardHidden ? (
              <CardPeek player={p} />
            ) : (
              <PlayerRow player={p} />
            )}
          </div>
        </m.li>
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
        seat={p.colorSlot}
        className="max-sm:size-6"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-sm">
          {name(p, p.isYou)}
        </span>
        <m.span
          key={p.status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="truncate font-medium text-ink-muted text-xs"
        >
          {t(p.status)}
        </m.span>
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
  const seat = seatColor(p.colorSlot);
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
              <span className="block overflow-hidden rounded-[calc(var(--radius-lg)-3px)]">
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
