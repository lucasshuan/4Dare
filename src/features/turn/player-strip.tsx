"use client";

import { Popover } from "@base-ui/react/popover";
import { Check } from "lucide-react";
import { type AnimationSequence, m } from "motion/react";
import { type Messages, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/avatar";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { useWithNames } from "@/components/ui/player-name";
import { Portrait } from "@/components/ui/portrait";
import { useRoomContext } from "@/features/data/room-context";
import { PersonCard, PersonStrip } from "@/features/profile/person-card";
import { useStageTimeline } from "@/features/stage/use-stage-timeline";
import type { PlayerStatus, PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useClock } from "@/lib/hooks/use-server-clock";
import { gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { onSeat, seatColor, seatWash } from "@/lib/seats";

/** The strip's entrance after the cast: each item drops in, one after the other. */
const DROP = { y: -30, duration: 0.5, stagger: 0.06 } as const;

/** The statuses the step clock waits on: their ring turns into the clock. */
const AWAITED: PlayerStatus[] = [
  "asking",
  "answering",
  "guessing",
  "validating",
];

/**
 * Everyone at the table in turn order, left to right: the first to play on the
 * left, the last on the right. Each face wears its player's colour as a ring;
 * the turn's card takes the colour whole. A player whose card you can see opens
 * it bigger on hover (or tap): picture, name, origin.
 *
 * Two signals tell the turn apart: the "Turn" tag (with the fill) marks whose
 * round it is and slides to the next card when the turn passes; the ring of
 * whoever the step clock waits on (one player, or everyone answering) drains
 * with the clock. Phones get a row of faces and names only, to save height.
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
  const name = useDisplayName();
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
    <LayoutMotion>
      <ul ref={ref} className="flex gap-1.5 pt-2 sm:gap-3">
        {ordered.map((p) => (
          <m.li
            key={p.id}
            layout
            className={cn(
              "flex min-w-0 flex-1 sm:flex-[1_1_150px]",
              p.away && "opacity-60",
            )}
          >
            {/* the entrance moves this one, so it never fights the layout animation above */}
            <div
              data-strip-item
              className="relative flex min-w-0 flex-1 rounded-md bg-surface transition-[box-shadow,background-color] duration-300"
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
              {p.isTurn ? <TurnTag slot={p.colorSlot} /> : null}
              {p.card && !p.cardHidden ? (
                <CardPeek player={p} />
              ) : (
                <PersonCard
                  person={{ ...p, name: name(p, p.isYou) }}
                  align="end"
                  className="group flex min-w-0 flex-1 rounded-md transition-colors duration-200 ease-soft hover:bg-sunken/60 data-popup-open:bg-sunken/60"
                >
                  <PlayerRow player={p} />
                </PersonCard>
              )}
            </div>
          </m.li>
        ))}
      </ul>
    </LayoutMotion>
  );
}

/** Whose round it is: a tag on their card, gliding to the next card when the turn passes. */
function TurnTag({ slot }: { slot: number }) {
  const t = useTranslations("turn");
  return (
    <m.span
      layoutId="turn-tag"
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className="absolute -top-2 left-2 z-10 rounded-[6px] px-1.5 py-0.5 font-bold text-[10px] uppercase leading-none tracking-[0.08em] max-sm:inset-x-0 max-sm:mx-auto max-sm:w-fit"
      style={{ backgroundColor: seatColor(slot), color: onSeat(slot) }}
    >
      {t("turnTag")}
    </m.span>
  );
}

/** Ring length: r = 19 in a 40 × 40 box. */
const RING = 2 * Math.PI * 19;

/**
 * The player's ring as the step clock: a faint track and the colour draining
 * to the deadline, on the server clock. Full while a reveal holds the step back.
 */
function ClockRing({ slot }: { slot: number }) {
  const { view, offset } = useRoomContext();
  const clock = useClock(offset);
  const now = useRef(clock.now);
  now.current = clock.now;
  const ref = useRef<SVGCircleElement>(null);
  const { deadline, stepStartsAt } = view;
  const total =
    view.stepMs ??
    (deadline !== null && stepStartsAt !== null ? deadline - stepStartsAt : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el || deadline === null || stepStartsAt === null || total <= 0) return;
    // a cut deadline starts the drain from less than full
    const from = RING * (1 - Math.min(1, (deadline - stepStartsAt) / total));
    const anim = el.animate(
      [{ strokeDashoffset: from }, { strokeDashoffset: RING }],
      {
        duration: Math.max(1, deadline - stepStartsAt),
        delay: stepStartsAt - now.current(),
        fill: "both",
        easing: "linear",
      },
    );
    return () => anim.cancel();
  }, [deadline, stepStartsAt, total]);
  const color = seatColor(slot);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className="pointer-events-none absolute -inset-1 size-[calc(100%+8px)] -rotate-90"
    >
      <circle
        cx="20"
        cy="20"
        r="19"
        fill="none"
        strokeWidth="2"
        style={{ stroke: `color-mix(in oklab, ${color} 25%, transparent)` }}
      />
      <circle
        ref={ref}
        cx="20"
        cy="20"
        r="19"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={RING}
        style={{ stroke: color }}
      />
    </svg>
  );
}

/**
 * Avatar, name and status, then the card's thumbnail ("?" for your own). On
 * phones only the face and the name, stacked.
 */
function PlayerRow({ player: p }: { player: PlayerView }) {
  const t = useTranslations("turn.status");
  const name = useDisplayName();
  const awaited = AWAITED.includes(p.status);
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5 p-2 text-left max-sm:flex-col max-sm:gap-1.5 max-sm:px-1 max-sm:pt-2.5 max-sm:pb-1.5 max-sm:text-center">
      <span className="relative inline-flex shrink-0">
        <Avatar
          avatar={p.avatar}
          size={32}
          // the clock takes the ring's place while it waits on them
          seat={awaited ? null : p.colorSlot}
          className="max-sm:size-9 max-sm:text-[15px]"
        />
        {awaited ? <ClockRing slot={p.colorSlot} /> : null}
        {p.status === "answered" ? (
          <m.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-pill bg-yes text-on-yes shadow-[0_0_0_2px_var(--ring-gap,var(--surface))]"
          >
            <Check className="size-2.5" strokeWidth={3.5} />
          </m.span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col max-sm:w-full">
        <span className="truncate font-semibold text-sm max-sm:text-xs">
          {name(p, p.isYou)}
        </span>
        <m.span
          key={p.status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="truncate font-medium text-ink-muted text-xs max-sm:sr-only"
        >
          {/* a "Who am I?" match: every status it gives has words */}
          {t(p.status as keyof Messages["turn"]["status"])}
        </m.span>
      </span>
      <span className="w-10 shrink-0 max-sm:hidden">
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
  const name = useDisplayName();
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
            {/* the card first (it is what matters in the game), then who holds it */}
            <div className="mx-1.5 mt-3 border-line border-t pt-3">
              <PersonStrip person={{ ...p, name: name(p, p.isYou) }} />
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
