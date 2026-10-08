"use client";

import { Sparkles } from "lucide-react";
import {
  AnimatePresence,
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AnswerChip } from "@/components/ui/answer-chip";
import { Creature, HeldCard } from "@/components/ui/figure-art";
import { UNDER_TOPBAR } from "@/components/ui/screen";
import { BannerRow, SCENE_WIDTH } from "@/features/home/banner-row";
import type { AnswerValue } from "@/game/types";
import { cn } from "@/lib/cn";
import type { Figure } from "@/lib/figures";
import { useStepLoop } from "@/lib/hooks/use-step-loop";

type Seat = "a" | "b" | "c" | "d";

/**
 * One loop of the banner, a round in miniature: you (the "?" card in the
 * middle) ask, the others answer one by one over their cards, you guess, your
 * card flips and you got it. `ms` is how long each step stays on screen.
 */
const STEPS: {
  ms: number;
  ask?: "q1" | "q2" | "guess";
  answers?: Partial<Record<Seat, AnswerValue>>;
  hit?: boolean;
}[] = [
  { ms: 700 },
  { ms: 1000, ask: "q1" },
  { ms: 380, ask: "q1", answers: { b: "yes" } },
  { ms: 380, ask: "q1", answers: { b: "yes", c: "yes" } },
  { ms: 380, ask: "q1", answers: { a: "yes", b: "yes", c: "yes" } },
  {
    ms: 1500,
    ask: "q1",
    answers: { a: "yes", b: "yes", c: "yes", d: "probably_yes" },
  },
  { ms: 1000, ask: "q2" },
  { ms: 380, ask: "q2", answers: { c: "probably_yes" } },
  { ms: 380, ask: "q2", answers: { b: "unknown", c: "probably_yes" } },
  {
    ms: 380,
    ask: "q2",
    answers: { b: "unknown", c: "probably_yes", d: "yes" },
  },
  {
    ms: 1600,
    ask: "q2",
    answers: { a: "probably_no", b: "unknown", c: "probably_yes", d: "yes" },
  },
  { ms: 1400, ask: "guess" },
  { ms: 3000, ask: "guess", hit: true },
];
/** The frame shown when motion is reduced: a question and every answer. */
const STILL = 5;

/** The others around the table, left to right, their creature and card. Phones keep the two nearest you. */
export const SEATS: {
  seat: Seat;
  place: string;
  tilt: number;
  dna: string;
  color: string;
  figure: Figure;
}[] = [
  {
    seat: "a",
    place: "left-[12%] max-sm:hidden",
    tilt: -10,
    dna: "Penguin..Cozy..0",
    color: "#F3D3B8",
    figure: "lady",
  },
  {
    seat: "b",
    place: "left-[31%] max-sm:left-[19%]",
    tilt: -5,
    dna: "Fox..Curious..0",
    color: "#BFE3EA",
    figure: "king",
  },
  {
    seat: "c",
    place: "left-[69%] max-sm:left-[81%]",
    tilt: 5,
    dna: "Panda..Happy..0",
    color: "#F2E3A8",
    figure: "owl",
  },
  {
    seat: "d",
    place: "left-[88%] max-sm:hidden",
    tilt: 10,
    dna: "Bee..Busy..0",
    color: "#D7DDE8",
    figure: "astronaut",
  },
];
export const YOU = {
  dna: "Potato.Ninja...0",
  color: "#D9C7F4",
  figure: "cat",
} as const;

/** Question marks drifting in the background, across the whole width: [left %, top %, size px, colour, seconds]. */
const MARKS: [number, number, number, string, number][] = [
  [3, 58, 54, "text-sky", 7],
  [9, 18, 26, "text-apricot", 9],
  [21, 72, 22, "text-yes", 8],
  [24, 30, 36, "text-sky", 10],
  [40, 12, 20, "text-apricot", 7.5],
  [61, 18, 24, "text-yes", 9.5],
  [77, 30, 38, "text-apricot", 8.5],
  [80, 74, 22, "text-sky", 7],
  [93, 20, 30, "text-sky", 9],
  [97, 64, 48, "text-yes", 10.5],
];

/** Pops in from below, springy. */
const pop = {
  initial: { opacity: 0, y: 10, scale: 0.85 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.9 },
  transition: { type: "spring", stiffness: 420, damping: 26 },
} as const;

/** The little burst around your card when you get it. */
const BURST = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
    color: ["bg-yes", "bg-apricot", "bg-sky", "bg-butter"][i % 4],
  };
});

/**
 * The "Who am I?" banner, full width under the top bar: five players around a
 * table, cards up, a round playing on a loop. Answers wrap rather than spill,
 * so longer languages fit. Layers drift with the pointer; still for reduced motion.
 */
export function WhoAmIBanner({ aside }: { aside: ReactNode }) {
  const t = useTranslations("home.games.whoAmI.banner");
  const reduced = useReducedMotion() ?? false;
  const { step } = useStepLoop(STEPS, STILL, reduced);

  // Pointer parallax: -0.5..0.5 across the banner, eased by a spring.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 110, damping: 20 });
  const sy = useSpring(py, { stiffness: 110, damping: 20 });
  const backX = useTransform(sx, (v) => v * -36);
  const backY = useTransform(sy, (v) => v * -18);
  const frontX = useTransform(sx, (v) => v * 14);
  const frontY = useTransform(sy, (v) => v * 6);

  const s = STEPS[step];
  const floating = (delay: number) =>
    reduced
      ? {}
      : {
          animate: { y: [0, -5, 0] },
          transition: {
            duration: 3.6,
            delay,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut" as const,
          },
        };

  return (
    <div
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
      className={cn(
        "relative isolate overflow-hidden art-whoami",
        UNDER_TOPBAR,
      )}
    >
      {/* light and question marks, drifting the other way */}
      <m.div
        style={{ x: backX, y: backY }}
        aria-hidden="true"
        className="-inset-10 -z-10 absolute select-none"
      >
        <span className="absolute top-[-30%] left-[-5%] h-[90%] w-[45%] rounded-pill bg-surface/50 blur-3xl" />
        <span className="absolute right-[-8%] bottom-[-40%] h-[90%] w-[50%] rounded-pill bg-(--art-whoami-glow) blur-3xl" />
        <span className="absolute top-[5%] right-[22%] h-[45%] w-[25%] rounded-pill bg-apricot-soft/70 blur-3xl" />
        {MARKS.map(([left, top, size, color, seconds]) => (
          <m.span
            key={`${left}-${top}`}
            className={cn(
              "absolute font-display font-extrabold leading-none opacity-[0.16]",
              color,
            )}
            style={{ left: `${left}%`, top: `${top}%`, fontSize: size }}
            {...(reduced
              ? {}
              : {
                  animate: { y: [0, -14, 0], rotate: [-8, 8, -8] },
                  transition: {
                    duration: seconds,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  },
                })}
          >
            ?
          </m.span>
        ))}
      </m.div>

      {/* melts into the page below, behind the table so the faces stay sharp */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-b from-transparent to-canvas/70" />

      <BannerRow aside={aside}>
        <m.div
          style={{ x: frontX, y: frontY }}
          aria-hidden="true"
          className={cn(
            "relative h-[clamp(180px,min(22vw,27vh),230px)] select-none [container-type:size] max-sm:h-[210px]",
            SCENE_WIDTH,
          )}
        >
          {/* the table everyone sits around; it fades with the ground over the banner's last 1.5rem (its top sits 24cqh above the bottom) */}
          <span
            className="-translate-x-1/2 absolute bottom-[-46%] left-1/2 h-[70%] w-[92%] rounded-[50%] bg-surface/45"
            style={{
              maskImage:
                "linear-gradient(to bottom, #000 calc(24cqh - 1.5rem), transparent 24cqh)",
            }}
          />

          {/* the question, then the guess, then "Got it!" in its place */}
          <div className="absolute inset-x-0 top-[1%] flex justify-center px-4">
            <AnimatePresence mode="wait">
              {s.hit ? (
                <m.div
                  key="hit"
                  {...pop}
                  className="inline-flex items-center gap-1.5 rounded-pill bg-yes px-4 py-2 font-bold font-display text-[clamp(15px,2vw,20px)] text-on-yes leading-tight shadow-card"
                >
                  <Sparkles className="size-[1.1em]" strokeWidth={2} />
                  {t("hit")}
                </m.div>
              ) : s.ask ? (
                <m.div
                  key={s.ask}
                  {...pop}
                  className={cn(
                    "max-w-[min(26rem,80%)] text-balance rounded-lg rounded-b-sm px-4 py-2 text-center font-bold font-display text-[clamp(15px,2vw,20px)] leading-tight shadow-card",
                    s.ask === "guess"
                      ? "bg-ink text-on-ink"
                      : "bg-surface text-ink",
                  )}
                >
                  {t(s.ask)}
                </m.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* the others, cards up, answers over their cards */}
          {SEATS.map((p, i) => {
            const answer = s.answers?.[p.seat];
            return (
              <div
                key={p.seat}
                className={cn(
                  "-translate-x-1/2 absolute bottom-[3%] flex flex-col items-center",
                  p.place,
                )}
              >
                {/* grows upwards and wraps when long: it never pushes the card */}
                <div className="-translate-x-1/2 absolute bottom-full left-1/2 mb-[2.6cqh] flex w-max max-w-[min(9.5rem,15cqw)] justify-center max-sm:max-w-[26cqw]">
                  <AnimatePresence>
                    {answer ? (
                      <m.span key={`${s.ask}-${answer}`} {...pop}>
                        <AnswerChip value={answer} small pressed wrap />
                      </m.span>
                    ) : null}
                  </AnimatePresence>
                </div>
                <m.div
                  className="w-[33cqh]"
                  style={{ rotate: p.tilt }}
                  {...floating(i * 0.7)}
                >
                  <HeldCard figure={p.figure} />
                </m.div>
                <m.span
                  animate={s.hit && !reduced ? { y: [0, -8, 0] } : { y: 0 }}
                  transition={{ duration: 0.45, delay: 0.15 + i * 0.08 }}
                  className="-mt-[4cqh] block"
                >
                  <Creature
                    dna={p.dna}
                    color={p.color}
                    className="size-[17cqh] rounded-pill shadow-[0_0_0_3px_var(--art-whoami)]"
                  />
                </m.span>
              </div>
            );
          })}

          {/* you: the "?" card, which flips when you get it */}
          <div className="-translate-x-1/2 absolute bottom-[3%] left-1/2 flex flex-col items-center">
            <m.div
              className="relative w-[38.5cqh] sm:w-[39.5cqh]"
              {...floating(0.4)}
            >
              <div className="perspective-[800px]">
                <m.div
                  className="relative transform-3d"
                  animate={{ rotateY: s.hit ? 180 : 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex aspect-[4/5.6] items-center justify-center rounded-[14%/11%] bg-surface font-display font-extrabold text-[23.5cqh] text-sky shadow-pop backface-hidden">
                    <m.span
                      animate={
                        reduced || s.ask !== "guess" || s.hit
                          ? { rotate: 0 }
                          : { rotate: [0, -10, 10, -6, 0] }
                      }
                      transition={{ duration: 0.6 }}
                    >
                      ?
                    </m.span>
                  </div>
                  <div className="absolute inset-0 rotate-y-180 rounded-[14%/11%] outline-[3px] outline-yes outline-solid backface-hidden">
                    <HeldCard figure={YOU.figure} fill />
                  </div>
                </m.div>
              </div>
              <AnimatePresence>
                {s.hit && !reduced
                  ? BURST.map((b, i) => (
                      <m.span
                        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed burst
                        key={i}
                        className={cn(
                          "absolute top-1/2 left-1/2 size-[3.2cqh] rounded-pill",
                          b.color,
                        )}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
                        animate={{
                          x: `${b.x * 1100}%`,
                          y: `${b.y * 900}%`,
                          opacity: 0,
                          scale: 1,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.9,
                          delay: 0.45,
                          ease: "easeOut",
                        }}
                      />
                    ))
                  : null}
              </AnimatePresence>
            </m.div>
            <Creature
              dna={YOU.dna}
              color={YOU.color}
              className="-mt-[4cqh] size-[17cqh] rounded-pill shadow-[0_0_0_3px_var(--art-whoami),0_0_0_6px_var(--sky)]"
            />
          </div>
        </m.div>
      </BannerRow>
    </div>
  );
}
