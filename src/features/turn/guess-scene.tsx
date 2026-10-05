"use client";

import { SkipForward } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { CardBack, frameStyle } from "@/components/ui/card-frame";
import { fireConfetti } from "@/components/ui/confetti";
import { Portrait } from "@/components/ui/portrait";
import { useRoomContext } from "@/features/data/room-context";
import type { CardView, PlayerView, RevealView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useServerClock } from "@/lib/hooks/use-server-clock";
import { dur, ease, gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { onSeat, seatColor } from "@/lib/seats";
import { HANDOFF_COVERED_MS } from "./turn-handoff";

type SceneReveal = Extract<RevealView, { kind: "guess" | "pass" }>;

/** The wait before a guess's result comes in: at most this, never past a fifth of the scene. */
const SUSPENSE_MS = 800;

const sticker =
  "rounded-md px-5 py-2 font-display font-extrabold text-[26px] uppercase tracking-[0.02em] shadow-pop sm:text-[34px]";

/**
 * A guess's result, or a pass, on the whole screen in the guesser's colour:
 * the guess, their card turning over, and "Got it" or "Not yet"; or the
 * player letting their guess go. It runs on the server clock, so it can't be
 * closed and a reload lands on the same moment, and the next turn waits for
 * it: the turn's handoff band sweeps in over its last frame and takes the
 * room back to the turn screen (a winning hit goes on to the podium).
 */
export function GuessScene() {
  const { view, offset, playerById } = useRoomContext();
  const now = useServerClock(offset, 100);
  const r =
    view.reveal?.kind === "guess" || view.reveal?.kind === "pass"
      ? view.reveal
      : null;
  // Held past the view that carried it: the server drops it at `until`, while
  // the screen keeps it until the handoff band covers it.
  const [held, setHeld] = useState<SceneReveal | null>(null);
  const key = r ? `${r.kind}-${r.n}-${r.until}` : null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: the key stands for the reveal
  useEffect(() => {
    if (r) setHeld(r);
  }, [key]);
  const handoff =
    !!held && view.phase === "asking" && view.stepStartsAt === held.until;
  const end = held ? held.until + (handoff ? HANDOFF_COVERED_MS : 0) : 0;
  const player = held ? playerById(held.byId) : undefined;
  const on = !!held && !!player && now >= held.startsAt && now < end;
  return (
    <AnimatePresence>
      {on && held && player ? (
        <m.div
          key={`${held.kind}-${held.n}-${held.until}`}
          role="status"
          aria-live="polite"
          initial={{ clipPath: "circle(0% at 50% 50%)" }}
          animate={{
            clipPath: "circle(150% at 50% 50%)",
            transition: { duration: 0.6, ease: gs.p1Out },
          }}
          // covered by the handoff band: it just goes; before the podium it fades
          exit={{
            opacity: handoff ? 1 : 0,
            transition: { duration: handoff ? 0 : dur.slow, ease: ease.soft },
          }}
          // over the chat (z-35), under the handoff band (z-37) and the match header (z-38)
          className="fixed inset-0 z-[36] flex flex-col items-center justify-center overflow-hidden px-6 py-10"
          style={{
            backgroundColor: seatColor(player.colorSlot),
            color: onSeat(player.colorSlot),
          }}
        >
          <Marks />
          {held.kind === "guess" ? (
            <GuessResult reveal={held} player={player} now={now} />
          ) : (
            <Pass reveal={held} player={player} />
          )}
          <Progress startsAt={held.startsAt} until={held.until} now={now} />
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Big faint "?" marks drifting behind, as on the turn's backdrop. */
function Marks() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[
        [8, 18, 120, -12],
        [84, 14, 90, 10],
        [14, 78, 80, 8],
        [78, 74, 140, -8],
      ].map(([x, y, size, turn]) => (
        <m.span
          key={`${x}-${y}`}
          initial={{ opacity: 0, scale: 0.6, rotate: turn * 2 }}
          animate={{
            opacity: 0.14,
            scale: 1,
            rotate: turn,
            transition: { duration: 0.9, ease: gs.backOut(1.6), delay: 0.15 },
          }}
          className="absolute font-display font-extrabold leading-none"
          style={{ left: `${x}%`, top: `${y}%`, fontSize: size }}
        >
          ?
        </m.span>
      ))}
    </div>
  );
}

/** Who, the round and what happened, over the scene. */
function Kicker({ player: p, text }: { player: PlayerView; text: string }) {
  return (
    <m.div
      initial={{ opacity: 0, y: -16 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, ease: ease.soft, delay: 0.1 },
      }}
      className="relative flex items-center gap-2.5"
    >
      <span
        className="rounded-pill"
        style={{
          boxShadow: `0 0 0 3px color-mix(in oklab, ${onSeat(p.colorSlot)} 70%, transparent)`,
        }}
      >
        <Avatar avatar={p.avatar} size={36} />
      </span>
      <span className="font-semibold text-sm uppercase tracking-[0.1em] opacity-90">
        {text}
      </span>
    </m.div>
  );
}

function GuessResult({
  reveal,
  player,
  now,
}: {
  reveal: Extract<SceneReveal, { kind: "guess" }>;
  player: PlayerView;
  now: number;
}) {
  const t = useTranslations("turn.reveal");
  const name = useDisplayName();
  const hit = reveal.result === "hit";
  const suspense = Math.min(
    SUSPENSE_MS,
    (reveal.until - reveal.startsAt) * 0.2,
  );
  const shown = now >= reveal.startsAt + suspense;
  // confetti once, when the result lands (not for a reload past it)
  const [late] = useState(shown);
  useEffect(() => {
    if (shown && hit && !late) fireConfetti("big");
  }, [shown, hit, late]);

  return (
    <div className="relative flex flex-col items-center gap-6 text-center sm:gap-8">
      <Kicker
        player={player}
        text={t("guessed", { n: reveal.n, name: name(player, player.isYou) })}
      />
      <m.p
        initial={{ opacity: 0, scale: 1.6, rotate: -4 }}
        animate={{
          opacity: 1,
          scale: 1,
          rotate: 0,
          transition: { duration: 0.5, ease: gs.backOut(2), delay: 0.15 },
        }}
        className="max-w-[16ch] break-words font-display font-extrabold text-[clamp(40px,8vw,80px)] leading-[0.95] tracking-[-0.02em] [text-wrap:balance]"
      >
        “{reveal.guess}”
      </m.p>
      <div className="relative">
        <FlipCard
          flipped={shown && reveal.card !== null}
          card={reveal.card}
          hit={hit}
          seat={player.colorSlot}
        />
        <AnimatePresence>
          {shown ? (
            <m.span
              key="stamp"
              initial={{ x: "-50%", scale: 2.4, rotate: -18, opacity: 0 }}
              animate={{
                x: "-50%",
                scale: 1,
                rotate: hit ? -8 : 6,
                opacity: 1,
                transition: { duration: 0.45, ease: gs.backOut(2.6) },
              }}
              className={cn(
                sticker,
                "absolute bottom-[-18px] left-1/2 whitespace-nowrap",
                hit ? "bg-yes text-on-yes" : "bg-ink text-on-ink",
              )}
            >
              {hit
                ? reveal.place
                  ? t(reveal.tied ? "hitTie" : "hitPlace", {
                      place: reveal.place,
                    })
                  : t("hit")
                : t("miss")}
            </m.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** A white ring and a lift: the card stands off a scene in its own colour. */
const LIFT =
  "shadow-[inset_0_0_0_2px_rgba(255,255,255,0.5),0_0_0_3px_rgba(255,255,255,0.75),0_24px_56px_rgba(30,36,51,0.3)]";

/** The guesser's card: its back first, then the character turning up. */
function FlipCard({
  flipped,
  card,
  hit,
  seat,
}: {
  flipped: boolean;
  card: CardView | null;
  hit: boolean;
  seat: number;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 40, rotate: -6 }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: 0,
        transition: { duration: 0.55, ease: gs.backOut(1.6), delay: 0.25 },
      }}
      className="w-40 perspective-[1000px] sm:w-52"
    >
      <m.div
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: dur.reveal, ease: ease.swap }}
        className="relative transform-3d"
      >
        {/* face down: the back, ringed in white so it stands off the scene in the same colour */}
        <CardBack
          seat={seat}
          logo
          className={cn("rounded-xl backface-hidden", LIFT)}
        />
        {/* face up: the collectible, in the guesser's frame */}
        <div
          style={frameStyle(seat)}
          className={cn(
            "q-marks absolute inset-0 flex flex-col rounded-xl p-2 backface-hidden rotate-y-180",
            LIFT,
            hit && "outline-[3px] outline-yes outline-solid",
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 rounded-[14px] bg-surface p-1.5 text-ink">
            <Portrait
              src={card?.imageUrl ?? null}
              className="aspect-auto min-h-0 flex-1 rounded-[10px]"
            />
            <span className="truncate px-1 font-bold font-display text-lg leading-tight">
              {card?.name}
            </span>
          </div>
        </div>
      </m.div>
    </m.div>
  );
}

function Pass({
  reveal,
  player,
}: {
  reveal: Extract<SceneReveal, { kind: "pass" }>;
  player: PlayerView;
}) {
  const t = useTranslations("turn.reveal");
  const name = useDisplayName();
  return (
    <div className="relative flex flex-col items-center gap-5 text-center sm:gap-6">
      <Kicker player={player} text={t("passRound", { n: reveal.n })} />
      <m.span
        aria-hidden
        initial={{ x: -80, opacity: 0 }}
        animate={{
          x: 0,
          opacity: 1,
          transition: { duration: 0.5, ease: gs.backOut(1.8), delay: 0.15 },
        }}
        className="flex size-20 items-center justify-center rounded-pill sm:size-24"
        style={{
          backgroundColor: `color-mix(in oklab, ${onSeat(player.colorSlot)} 16%, transparent)`,
        }}
      >
        <SkipForward className="size-10 sm:size-12" strokeWidth={2.2} />
      </m.span>
      <m.p
        initial={{ opacity: 0, scale: 1.4 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: { duration: 0.45, ease: gs.backOut(2), delay: 0.25 },
        }}
        className="max-w-[18ch] font-display font-extrabold text-[clamp(36px,7vw,68px)] leading-[0.95] tracking-[-0.02em] [text-wrap:balance]"
      >
        {player.isYou
          ? t("passedYou")
          : t("passed", { name: name(player, false) })}
      </m.p>
      <m.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85, transition: { delay: 0.5, duration: 0.3 } }}
        className="font-medium text-base"
      >
        {t("passedNote")}
      </m.span>
    </div>
  );
}

/** How much of the scene is left, as a thin line along the bottom. */
function Progress({
  startsAt,
  until,
  now,
}: {
  startsAt: number;
  until: number;
  now: number;
}) {
  const left = Math.max(0, Math.min(1, (until - now) / (until - startsAt)));
  return (
    <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 opacity-60">
      <span
        className="block h-full origin-left bg-current transition-transform duration-100 ease-linear"
        style={{ transform: `scaleX(${left})` }}
      />
    </span>
  );
}
