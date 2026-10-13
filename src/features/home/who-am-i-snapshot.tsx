"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AnswerChip } from "@/components/ui/answer-chip";
import type { AnswerValue } from "@/game/types";
import { cn } from "@/lib/cn";
import { type Figure, figureUri } from "@/lib/figures";
import { useStepLoop } from "@/lib/hooks/use-step-loop";

/**
 * The rounds the scene plays: the others' cards (left, right), yours, and the
 * answer the table gives your question (home.games.whoAmI.demoQuestions, in
 * this order). The first is the server-rendered one.
 */
const ROUNDS: {
  left: Figure;
  right: Figure;
  you: Figure;
  answer: AnswerValue;
}[] = [
  { left: "lady", right: "king", you: "cat", answer: "yes" },
  { left: "owl", right: "pirate", you: "robot", answer: "no" },
  { left: "astronaut", right: "fox", you: "witch", answer: "yes" },
  { left: "lion", right: "witch", you: "astronaut", answer: "no" },
  { left: "robot", right: "giraffe", you: "owl", answer: "no" },
  { left: "cat", right: "king", you: "pirate", answer: "probably_yes" },
  { left: "fox", right: "lady", you: "king", answer: "yes" },
];

/**
 * One loop, a quick shuffle first: every card turns face down and gathers in
 * a pile, the pile is cut (the side cards cross over yours), the cards are
 * dealt back out and the others' turn up (the next round's). Then the
 * question, its answer, your card turns over, and back down. `ms` is how
 * long each step stays.
 */
type Shuffle = "gather" | "cut" | "deal";
const STEPS: {
  ms: number;
  shuffle?: Shuffle;
  ask?: boolean;
  answer?: boolean;
  up?: boolean;
}[] = [
  { ms: 360, shuffle: "gather" },
  { ms: 340, shuffle: "cut" },
  { ms: 320, shuffle: "gather" },
  { ms: 420, shuffle: "deal" },
  { ms: 900, ask: true },
  { ms: 1300, ask: true, answer: true },
  { ms: 1700, ask: true, answer: true, up: true },
  { ms: 450 },
];
/** The frame shown when still: the answer in, your card up. */
const STILL = 6;

/** A card face down, as yours is: the "?" on white, sized by the card's width. */
function CardBack({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex aspect-[4/5.6] items-center justify-center rounded-lg bg-surface font-display font-extrabold text-sky shadow-pop backface-hidden [container-type:inline-size]",
        className,
      )}
    >
      <span className="text-[52cqw] leading-none">?</span>
    </div>
  );
}

/** A number in 0..1 from a seed and a loop, the same both times it is asked. */
const noise = (seed: number, n: number) => {
  const x = Math.sin(seed * 9301 + n * 49297) * 233280;
  return x - Math.floor(x);
};

/** The round loop `n` plays: never the same twice in a row; the first is the first. */
function roundAt(seed: number, n: number) {
  let r = 0;
  for (let i = 1; i <= n; i++)
    r =
      (r + 1 + Math.floor(noise(seed, i) * (ROUNDS.length - 1))) %
      ROUNDS.length;
  return r;
}

function MiniCard({
  figure,
  className,
}: {
  figure: Figure;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg bg-surface p-1.5 shadow-card",
        className,
      )}
    >
      <div className="aspect-4/5 overflow-hidden rounded-md">
        {/* biome-ignore lint/performance/noImgElement: generated svg data uri */}
        <img src={figureUri(figure)} alt="" className="size-full" />
      </div>
      <span className="mx-1 mb-0.5 h-1.5 w-2/3 rounded-pill bg-line" />
    </div>
  );
}

/**
 * The "Who am I?" card art: everyone else's cards on the table, yours a "?";
 * a quick shuffle of all three deals a new round, a question and its answer pop up and your
 * card turns over. The rounds come in a random order. Still (one round, your
 * card up) for reduced motion, or with `still`.
 */
export function WhoAmISnapshot({
  className,
  still: forceStill = false,
  wide = false,
}: {
  className?: string;
  still?: boolean;
  /** Laid out for a 2:1 strip (the lobby's game panel): the cards right, the question left. */
  wide?: boolean;
}) {
  const t = useTranslations("home.games.whoAmI");
  const reduced = useReducedMotion() ?? false;
  const still = forceStill || reduced;
  const { step, loop } = useStepLoop(STEPS, STILL, still);
  // the order is picked in the browser: the server renders the first round
  const [seed, setSeed] = useState(0);
  useEffect(() => setSeed(1 + Math.floor(Math.random() * 1000)), []);

  const s = STEPS[step];
  const shuffle = still ? undefined : s.shuffle;
  // the first gather still holds the round just played; the faces are down from the cut on
  const round = ROUNDS[roundAt(seed, step === 0 ? loop - 1 : loop)];
  const questions = t.raw("demoQuestions") as string[];
  const n = ROUNDS.indexOf(round);
  const quick = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const };

  /**
   * A side card: face down through the shuffle, gathered on yours (`pile` of
   * its own widths away), crossing over it in the cut, then dealt back.
   */
  const side = (dir: -1 | 1, pile: number, delay: number) => ({
    animate:
      shuffle === "gather"
        ? { x: `${-dir * pile}%`, y: "6%", rotate: dir * 4, scale: 0.92 }
        : shuffle === "cut"
          ? {
              x: `${-dir * (pile + 34)}%`,
              y: "-6%",
              rotate: -dir * 9,
              scale: 0.92,
            }
          : {
              x: "0%",
              y: still || shuffle ? "0%" : ["0%", "-4%", "0%"],
              rotate: dir * 10,
              scale: 1,
            },
    transition: shuffle
      ? { ...quick, delay: shuffle === "deal" ? delay : 0 }
      : {
          y: still
            ? { duration: 0 }
            : {
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut" as const,
              },
        },
  });
  /** A side card's face, turned down from the gather until the deal lands. */
  const face = (figure: Figure, delay: number) => (
    <m.div
      className="relative transform-3d"
      initial={false}
      animate={{ rotateY: shuffle && shuffle !== "deal" ? 180 : 0 }}
      transition={{
        duration: still ? 0 : 0.3,
        delay: shuffle === "deal" ? 0.3 + delay : 0,
      }}
    >
      <div className="backface-hidden">
        <MiniCard figure={figure} />
      </div>
      <div className="absolute inset-0 rotate-y-180 backface-hidden">
        <CardBack className="h-full" />
      </div>
    </m.div>
  );

  return (
    <div
      aria-hidden="true"
      data-art-theme="light"
      className={cn(
        "relative overflow-hidden art-whoami",
        !wide && "aspect-square",
        className,
      )}
    >
      {/* soft light spots */}
      <span className="absolute -top-10 -left-8 size-40 rounded-pill bg-surface/40 blur-2xl" />
      <span className="absolute -right-6 -bottom-12 size-44 rounded-pill bg-butter/50 blur-2xl" />

      {/* the left card goes over yours in the cut, the right one under */}
      <m.div
        className={cn(
          "absolute perspective-[800px]",
          shuffle === "cut" && "z-[2]",
          wide
            ? "bottom-[12%] left-[33%] w-[22%]"
            : "bottom-[23%] left-[9%] w-[29%]",
        )}
        {...side(-1, 91, 0)}
      >
        {face(round.left, 0)}
      </m.div>
      <m.div
        className={cn(
          "absolute perspective-[800px]",
          wide
            ? "right-[5%] bottom-[12%] w-[22%]"
            : "right-[9%] bottom-[23%] w-[29%]",
        )}
        {...side(1, wide ? 84 : 91, 0.06)}
      >
        {face(round.right, 0.06)}
      </m.div>

      {/* your card: "?" on the front, a character on the back; part of the pile in the shuffle */}
      <m.div
        className={cn(
          "-translate-x-1/2 absolute z-[1] perspective-[800px]",
          wide
            ? "bottom-[10%] left-[64%] w-[25%]"
            : "bottom-[25%] left-1/2 w-[33%]",
        )}
        animate={
          shuffle === "gather"
            ? { y: "6%", rotate: 0, scale: 0.92 }
            : shuffle === "cut"
              ? { y: "10%", rotate: 3, scale: 0.92 }
              : { y: "0%", rotate: 0, scale: 1 }
        }
        transition={quick}
      >
        <m.div
          className="relative transform-3d"
          initial={false}
          animate={{ rotateY: s.up ? 180 : 0 }}
          transition={{
            duration: still ? 0 : 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <CardBack />
          <div className="absolute inset-0 rotate-y-180 backface-hidden">
            <MiniCard
              figure={round.you}
              className={cn(
                "h-full outline-[3px] outline-solid",
                round.answer === "no" ? "outline-no" : "outline-yes",
              )}
            />
          </div>
        </m.div>
      </m.div>

      {/* the question, then the answer under it */}
      <div
        className={cn(
          "absolute flex flex-col items-start gap-1.5",
          wide
            ? "top-[10%] left-[4%] max-w-[30%]"
            : "top-[6%] left-[7%] max-w-[80%]",
        )}
      >
        <AnimatePresence>
          {s.ask ? (
            <m.div
              key={`q-${loop}`}
              initial={still ? false : { opacity: 0, scale: 0.8, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="origin-bottom-left rounded-lg rounded-bl-sm bg-surface px-3 py-2 font-bold font-display text-[clamp(13px,1.6vw,16px)] text-ink leading-tight shadow-card"
            >
              {questions[n]}
            </m.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {s.answer ? (
            <m.div
              key={`a-${loop}`}
              initial={still ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="ml-2 origin-top-left"
            >
              <AnswerChip value={round.answer} small pressed />
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
