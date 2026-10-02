"use client";

import { Sparkles } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AnswerChip } from "@/components/ui/answer-chip";
import { critterUri } from "@/components/ui/critter";
import { UNDER_TOPBAR } from "@/components/ui/screen";
import type { AnswerValue } from "@/game/types";
import { cn } from "@/lib/cn";

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

/** The others around the table, left to right. Phones keep the two nearest you. */
const SEATS: {
  seat: Seat;
  place: string;
  tilt: number;
  seed: string;
  color: string;
  card: string;
}[] = [
  {
    seat: "a",
    place: "left-[12%] max-sm:hidden",
    tilt: -10,
    seed: "banner-a",
    color: "#F3D3B8",
    card: "#BFE6C8",
  },
  {
    seat: "b",
    place: "left-[31%] max-sm:left-[19%]",
    tilt: -5,
    seed: "banner-left",
    color: "#BFE3EA",
    card: "#DCE8FA",
  },
  {
    seat: "c",
    place: "left-[69%] max-sm:left-[81%]",
    tilt: 5,
    seed: "banner-right",
    color: "#F2E3A8",
    card: "#F4C7D9",
  },
  {
    seat: "d",
    place: "left-[88%] max-sm:hidden",
    tilt: 10,
    seed: "banner-d",
    color: "#D7DDE8",
    card: "#F3D3B8",
  },
];
const YOU = { seed: "banner-you", color: "#D9C7F4", card: "#F2E3A8" };

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

/** A critter on its pastel, as a round avatar or a card portrait. */
function Critter({
  seed,
  color,
  className,
}: {
  seed: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn("block overflow-hidden", className)}
      style={{ backgroundColor: color }}
    >
      {/* biome-ignore lint/performance/noImgElement: generated svg data uri */}
      <img
        src={critterUri(seed, color)}
        alt=""
        className="size-full object-cover"
      />
    </span>
  );
}

/** A card held up for the others to see: the character's picture. `fill` stretches it to its box (the flipped "?" card). */
function HeldCard({
  seed,
  color,
  fill = false,
}: {
  seed: string;
  color: string;
  fill?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[1.6cqh] rounded-[14%/11%] bg-surface p-[7%] shadow-card",
        fill && "h-full",
      )}
    >
      <Critter
        seed={seed}
        color={color}
        className={cn("rounded-[12%]", fill ? "min-h-0 flex-1" : "aspect-4/5")}
      />
      <span className="mx-[6%] h-[1.6cqh] w-2/3 shrink-0 rounded-pill bg-line" />
    </div>
  );
}

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
export function WhoAmIBanner() {
  const t = useTranslations("home.games.whoAmI.banner");
  const reduced = useReducedMotion() ?? false;
  const [step, setStep] = useState(STILL);

  useEffect(() => {
    if (reduced) return setStep(STILL);
    let i = 0;
    let id: number;
    const next = () => {
      setStep(i);
      id = window.setTimeout(next, STEPS[i].ms);
      i = (i + 1) % STEPS.length;
    };
    next();
    return () => window.clearTimeout(id);
  }, [reduced]);

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
      aria-hidden="true"
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
        "relative isolate select-none overflow-hidden bg-sky-soft",
        UNDER_TOPBAR,
      )}
    >
      {/* light and question marks, drifting the other way */}
      <motion.div
        style={{ x: backX, y: backY }}
        className="-inset-10 -z-10 absolute"
      >
        <span className="absolute top-[-30%] left-[-5%] h-[90%] w-[45%] rounded-pill bg-surface/50 blur-3xl" />
        <span className="absolute right-[-8%] bottom-[-40%] h-[90%] w-[50%] rounded-pill bg-butter/60 blur-3xl" />
        <span className="absolute top-[5%] right-[22%] h-[45%] w-[25%] rounded-pill bg-apricot-soft/70 blur-3xl" />
        {MARKS.map(([left, top, size, color, seconds]) => (
          <motion.span
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
          </motion.span>
        ))}
      </motion.div>

      <motion.div
        style={{ x: frontX, y: frontY }}
        className="relative mx-auto h-[clamp(230px,min(30vw,38vh),320px)] w-full max-w-[1040px] [container-type:size]"
      >
        {/* the table everyone sits around */}
        <span className="-translate-x-1/2 absolute bottom-[-46%] left-1/2 h-[70%] w-[92%] rounded-[50%] bg-surface/45" />

        {/* the question, then the guess, then "Got it!" in its place */}
        <div className="absolute inset-x-0 top-[6%] flex justify-center px-4">
          <AnimatePresence mode="wait">
            {s.hit ? (
              <motion.div
                key="hit"
                {...pop}
                className="inline-flex items-center gap-1.5 rounded-pill bg-yes px-4 py-2 font-bold font-display text-[clamp(15px,2vw,20px)] text-on-yes leading-tight shadow-card"
              >
                <Sparkles className="size-[1.1em]" strokeWidth={2} />
                {t("hit")}
              </motion.div>
            ) : s.ask ? (
              <motion.div
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
              </motion.div>
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
                "-translate-x-1/2 absolute bottom-[4%] flex flex-col items-center",
                p.place,
              )}
            >
              {/* grows upwards and wraps when long: it never pushes the card */}
              <div className="-translate-x-1/2 absolute bottom-full left-1/2 mb-[2cqh] flex w-max max-w-[min(9.5rem,15cqw)] justify-center max-sm:max-w-[26cqw]">
                <AnimatePresence>
                  {answer ? (
                    <motion.span key={`${s.ask}-${answer}`} {...pop}>
                      <AnswerChip value={answer} small pressed wrap />
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
              <motion.div
                className="w-[25cqh]"
                style={{ rotate: p.tilt }}
                {...floating(i * 0.7)}
              >
                <HeldCard seed={`${p.seed}-card`} color={p.card} />
              </motion.div>
              <motion.span
                animate={s.hit && !reduced ? { y: [0, -8, 0] } : { y: 0 }}
                transition={{ duration: 0.45, delay: 0.15 + i * 0.08 }}
                className="-mt-[3cqh] block"
              >
                <Critter
                  seed={p.seed}
                  color={p.color}
                  className="size-[13cqh] rounded-pill shadow-[0_0_0_3px_var(--sky-soft)]"
                />
              </motion.span>
            </div>
          );
        })}

        {/* you: the "?" card, which flips when you get it */}
        <div className="-translate-x-1/2 absolute bottom-[4%] left-1/2 flex flex-col items-center">
          <motion.div
            className="relative w-[29cqh] sm:w-[30cqh]"
            {...floating(0.4)}
          >
            <div className="perspective-[800px]">
              <motion.div
                className="relative transform-3d"
                animate={{ rotateY: s.hit ? 180 : 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex aspect-[4/5.6] items-center justify-center rounded-[14%/11%] bg-surface font-display font-extrabold text-[18cqh] text-sky shadow-pop backface-hidden">
                  <motion.span
                    animate={
                      reduced || s.ask !== "guess" || s.hit
                        ? { rotate: 0 }
                        : { rotate: [0, -10, 10, -6, 0] }
                    }
                    transition={{ duration: 0.6 }}
                  >
                    ?
                  </motion.span>
                </div>
                <div className="absolute inset-0 rotate-y-180 rounded-[14%/11%] outline-[3px] outline-yes outline-solid backface-hidden">
                  <HeldCard seed={`${YOU.seed}-card`} color={YOU.card} fill />
                </div>
              </motion.div>
            </div>
            <AnimatePresence>
              {s.hit && !reduced
                ? BURST.map((b, i) => (
                    <motion.span
                      // biome-ignore lint/suspicious/noArrayIndexKey: a fixed burst
                      key={i}
                      className={cn(
                        "absolute top-1/2 left-1/2 size-[2.4cqh] rounded-pill",
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
          </motion.div>
          <Critter
            seed={YOU.seed}
            color={YOU.color}
            className="-mt-[3cqh] size-[13cqh] rounded-pill shadow-[0_0_0_3px_var(--sky-soft),0_0_0_6px_var(--sky)]"
          />
        </div>
      </motion.div>

      {/* melts into the page below */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-b from-transparent to-canvas/70" />
    </div>
  );
}
