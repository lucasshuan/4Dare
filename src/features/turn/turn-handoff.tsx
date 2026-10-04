"use client";

import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useRoomContext } from "@/features/data/room-context";
import type { PlayerView } from "@/game/types";
import { useClock } from "@/lib/hooks/use-server-clock";
import { useDisplayName } from "@/lib/names";
import { onSeat, seatColor } from "@/lib/seats";

/** How long the band stays on screen (ms): in, a hold, out. */
const HANDOFF_MS = 2730;
/** The share of that time after which the band covers the whole screen, and when it starts to leave. */
const COVERED = 0.42;
const LEAVES = 0.58;
/** Each sweep, in and out, eases on its own (the times above stay exact). */
const SWEEP = "cubic-bezier(0.7, 0, 0.3, 1)";
/** When the band covers the whole screen (ms after it starts): what was under it can go. */
export const HANDOFF_COVERED_MS = Math.round(HANDOFF_MS * COVERED);

/**
 * The turn passing: when a player's question step starts, a band in their
 * colour sweeps across the whole screen ("Leo's turn", or "Your turn"), holds
 * and leaves the other way. It runs on the server clock from the step's start,
 * so a reload during it lands on the same frame, and a later one skips it.
 */
export function TurnHandoff() {
  const { view, offset, playerById } = useRoomContext();
  const clock = useClock(offset);
  const now = useRef(clock.now);
  now.current = clock.now;
  const startsAt = view.phase === "asking" ? view.stepStartsAt : null;
  const playerId = view.turn?.playerId ?? null;
  const n = view.turn?.n ?? 1;
  const [shown, setShown] = useState<{
    at: number;
    playerId: string;
    n: number;
    elapsed: number;
  } | null>(null);
  useEffect(() => {
    if (startsAt === null || playerId === null) return;
    const wait = startsAt - now.current();
    if (wait < -HANDOFF_MS) return;
    const id = window.setTimeout(
      () =>
        setShown({
          at: startsAt,
          playerId,
          n,
          elapsed: Math.max(0, now.current() - startsAt),
        }),
      Math.max(0, wait),
    );
    return () => window.clearTimeout(id);
  }, [startsAt, playerId, n]);
  const player = shown ? playerById(shown.playerId) : null;
  if (!shown || !player) return null;
  return (
    <Band
      key={shown.at}
      player={player}
      n={shown.n}
      elapsed={shown.elapsed}
      onDone={() => setShown(null)}
    />
  );
}

function Band({
  player: p,
  n,
  elapsed,
  onDone,
}: {
  player: PlayerView;
  n: number;
  elapsed: number;
  onDone: () => void;
}) {
  const t = useTranslations("turn.handoff");
  const name = useDisplayName();
  const reduced = useReducedMotion() ?? false;
  const band = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!band.current || !face.current || !text.current) return;
    const timing = {
      duration: HANDOFF_MS,
      delay: -elapsed,
      fill: "both" as const,
    };
    const anims = reduced
      ? [
          band.current.animate(
            [
              { opacity: 0 },
              { opacity: 1, offset: 0.2 },
              { opacity: 1, offset: 0.8 },
              { opacity: 0 },
            ],
            timing,
          ),
        ]
      : [
          band.current.animate(
            [
              {
                clipPath: "polygon(0 0, 0 0, -20% 100%, -20% 100%)",
                easing: SWEEP,
              },
              {
                clipPath: "polygon(0 0, 120% 0, 100% 100%, -20% 100%)",
                offset: COVERED,
              },
              {
                clipPath: "polygon(0 0, 120% 0, 100% 100%, -20% 100%)",
                offset: LEAVES,
                easing: SWEEP,
              },
              { clipPath: "polygon(120% 0, 120% 0, 100% 100%, 100% 100%)" },
            ],
            timing,
          ),
          face.current.animate(
            [
              { transform: "scale(0.3) rotate(-20deg)", opacity: 0 },
              {
                transform: "scale(0.3) rotate(-20deg)",
                opacity: 0,
                offset: 0.18,
              },
              {
                transform: "scale(1.12) rotate(4deg)",
                opacity: 1,
                offset: 0.38,
              },
              { transform: "none", opacity: 1, offset: 0.5 },
              { transform: "none", opacity: 1 },
            ],
            timing,
          ),
          text.current.animate(
            [
              { transform: "translateX(-30px)", opacity: 0 },
              { transform: "translateX(-30px)", opacity: 0, offset: 0.22 },
              { transform: "none", opacity: 1, offset: 0.42 },
              { transform: "none", opacity: 1, offset: 0.74 },
              { transform: "translateX(40px)", opacity: 0 },
            ],
            timing,
          ),
        ];
    anims[0].onfinish = () => done.current();
    return () => {
      for (const a of anims) a.cancel();
    };
  }, [elapsed, reduced]);
  const slot = p.colorSlot;
  return (
    <div
      ref={band}
      role="status"
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center gap-4 px-6 sm:gap-6"
      style={{ backgroundColor: seatColor(slot), color: onSeat(slot) }}
    >
      <span
        ref={face}
        className="rounded-pill"
        style={{
          boxShadow: `0 0 0 4px color-mix(in oklab, ${onSeat(slot)} 70%, transparent)`,
        }}
      >
        <Avatar
          avatar={p.avatar}
          isGuest={p.isGuest}
          name={p.name}
          size={64}
          className="sm:size-24 sm:text-[38px]"
        />
      </span>
      <span ref={text} className="flex min-w-0 flex-col">
        <span className="font-semibold text-xs uppercase tracking-[0.1em] opacity-85 sm:text-sm">
          {t(p.isYou ? "kickerYou" : "kicker")}
        </span>
        <span className="font-display font-extrabold text-[40px] leading-none tracking-[-0.02em] [text-wrap:balance] sm:text-6xl">
          {p.isYou ? t("titleYou") : t("title", { name: name(p, false) })}
        </span>
        <span className="mt-1 font-mono text-xs opacity-80 sm:text-sm">
          {t("round", { n })}
        </span>
      </span>
    </div>
  );
}
