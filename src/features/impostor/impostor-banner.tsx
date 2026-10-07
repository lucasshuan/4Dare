"use client";

import { VenetianMask } from "lucide-react";
import {
  AnimatePresence,
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { UNDER_TOPBAR } from "@/components/ui/screen";
import { Critter, HeldCard } from "@/features/who-am-i/who-am-i-banner";
import { cn } from "@/lib/cn";

type Seat = "a" | "b" | "c" | "d" | "e";

/**
 * One loop of the banner, a round in miniature: the cards come face down and
 * turn over (all the same but one), a question, everyone holds up their
 * answer like a judge's score (one far from the rest), the vote piles up on
 * that one, the lights go down and the stamp comes. `ms` is how long each step stays.
 */
const STEPS: {
  ms: number;
  up?: boolean;
  ask?: "q" | "vote";
  /** Everyone holds up their answer. */
  answers?: boolean;
  votes?: boolean;
  caught?: boolean;
}[] = [
  { ms: 900 },
  { ms: 1200, up: true },
  { ms: 1000, up: true, ask: "q" },
  { ms: 3200, up: true, ask: "q", answers: true },
  { ms: 900, up: true, ask: "vote" },
  { ms: 2000, up: true, ask: "vote", votes: true },
  { ms: 3200, up: true, caught: true, votes: true },
  { ms: 700, up: true },
];
/** The frame shown when motion is reduced: everyone's answer up. */
const STILL = 3;

/** Around the table, left to right; phones keep the middle three. `vote` is who they vote for. */
const SEATS: {
  seat: Seat;
  place: string;
  tilt: number;
  seed: string;
  color: string;
  answer: number;
  vote: Seat;
}[] = [
  {
    seat: "a",
    place: "left-[10%] max-sm:hidden",
    tilt: -10,
    seed: "imp-9",
    color: "#F2E3A8",
    answer: 8,
    vote: "d",
  },
  {
    seat: "b",
    place: "left-[29%] max-sm:left-[19%]",
    tilt: -5,
    seed: "imp-29",
    color: "#BFE6C8",
    answer: 9,
    vote: "d",
  },
  {
    seat: "c",
    place: "left-1/2",
    tilt: 0,
    seed: "imp-4",
    color: "#D9C7F4",
    answer: 8,
    vote: "d",
  },
  {
    seat: "d",
    place: "left-[71%] max-sm:left-[81%]",
    tilt: 5,
    seed: "imp-31",
    color: "#F3D3B8",
    answer: 3,
    vote: "b",
  },
  {
    seat: "e",
    place: "left-[90%] max-sm:hidden",
    tilt: 10,
    seed: "imp-44",
    color: "#F4C7D9",
    answer: 9,
    vote: "d",
  },
];
/** Who holds the other card. Nobody at the table knows, not even them. */
const ODD: Seat = "d";
const CREW_CARD = { seed: "imp-12", color: "#BFE3EA" };
const ODD_CARD = { seed: "imp-13", color: "#BFE3EA" };

/** Masks and question marks drifting behind: [left %, top %, size px, colour, seconds, mask]. */
const MARKS: [number, number, number, string, number, boolean][] = [
  [3, 56, 50, "text-no", 8, true],
  [10, 16, 24, "text-apricot", 9, false],
  [20, 70, 22, "text-sky", 7.5, false],
  [24, 26, 34, "text-no", 10, true],
  [40, 8, 20, "text-apricot", 8, false],
  [60, 14, 26, "text-sky", 9.5, true],
  [78, 28, 36, "text-apricot", 8.5, false],
  [81, 72, 24, "text-no", 7, true],
  [93, 18, 30, "text-sky", 9, false],
  [97, 62, 46, "text-no", 10.5, true],
];

/** Pops in from below, springy. */
const pop = {
  initial: { opacity: 0, y: 10, scale: 0.85 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.9 },
  transition: { type: "spring", stiffness: 420, damping: 26 },
} as const;

/** The ring's length, for a gauge drawn on a circle of radius 40. */
const RING = 2 * Math.PI * 40;

/**
 * A judge's round score paddle: the number in the middle and a gauge round
 * the rim that fills to it out of 10, so a low score shows before it's read.
 * `flagAt` (seconds) turns the odd one red.
 */
function ScorePaddle({
  n,
  delay,
  flagAt,
}: {
  n: number;
  delay: number;
  flagAt: number | null;
}) {
  const fill = (n / 10) * RING;
  return (
    <div className="flex flex-col items-center">
      <div className="relative size-[21cqh] rounded-pill bg-surface shadow-pop">
        <svg
          viewBox="0 0 100 100"
          className="-rotate-90 absolute inset-0 size-full"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="10"
            className="stroke-sunken"
          />
          <m.circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className="stroke-sky"
            strokeDasharray={`${fill} ${RING}`}
            initial={{ strokeDashoffset: fill }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
          />
          {flagAt !== null ? (
            <m.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              className="stroke-no"
              strokeDasharray={`${fill} ${RING}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: flagAt }}
            />
          ) : null}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-[10.5cqh] text-ink leading-none">
          {n}
        </span>
        {flagAt !== null ? (
          <m.span
            className="absolute inset-[16%] flex items-center justify-center rounded-pill bg-surface font-display font-extrabold text-[10.5cqh] text-no leading-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: flagAt }}
          >
            {n}
          </m.span>
        ) : null}
      </div>
      <span className="-mt-[0.8cqh] h-[9cqh] w-[2.4cqh] rounded-b-pill bg-[#C8925F] shadow-card" />
    </div>
  );
}

/**
 * The Impostor banner, full width under the top bar: five players around a
 * table, a round on a loop. The audience sees every card, so it sees the odd
 * one; the table doesn't. Layers drift with the pointer; still on the
 * answers for reduced motion.
 */
export function ImpostorBanner() {
  const t = useTranslations("home.games.impostor.banner");
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
        "relative isolate select-none overflow-hidden bg-no-soft",
        UNDER_TOPBAR,
      )}
    >
      {/* light, masks and question marks, drifting the other way */}
      <m.div
        style={{ x: backX, y: backY }}
        className="-inset-10 -z-10 absolute"
      >
        <span className="absolute top-[-30%] left-[-5%] h-[90%] w-[45%] rounded-pill bg-surface/50 blur-3xl" />
        <span className="absolute right-[-8%] bottom-[-40%] h-[90%] w-[50%] rounded-pill bg-butter/60 blur-3xl" />
        <span className="absolute top-[5%] right-[22%] h-[45%] w-[25%] rounded-pill bg-sky-soft/70 blur-3xl" />
        {MARKS.map(([left, top, size, color, seconds, mask]) => (
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
            {mask ? (
              <VenetianMask
                style={{ width: size, height: size }}
                strokeWidth={2.25}
              />
            ) : (
              "?"
            )}
          </m.span>
        ))}
      </m.div>

      <m.div
        style={{ x: frontX, y: frontY }}
        className="relative mx-auto h-[clamp(180px,min(22vw,27vh),230px)] w-full max-w-[1040px] [container-type:size] max-sm:h-[210px]"
      >
        {/* the table everyone sits around */}
        <span className="-translate-x-1/2 absolute bottom-[-46%] left-1/2 h-[70%] w-[92%] rounded-[50%] bg-surface/45" />

        {/* the question, then the vote */}
        <div className="absolute inset-x-0 top-[1%] flex justify-center px-4">
          <AnimatePresence mode="wait">
            {s.ask ? (
              <m.div
                key={s.ask}
                {...pop}
                className={cn(
                  "max-w-[min(26rem,80%)] text-balance rounded-lg rounded-b-sm px-4 py-2 text-center font-bold font-display text-[clamp(15px,2vw,20px)] leading-tight shadow-card",
                  s.ask === "vote"
                    ? "bg-ink text-on-ink"
                    : "bg-surface text-ink",
                )}
              >
                {t(s.ask)}
                {s.ask === "q" ? (
                  <span className="ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded-pill bg-sunken px-2 py-0.5 align-middle font-semibold text-[0.68em] text-ink-muted">
                    🐔 1–10 🦁
                  </span>
                ) : null}
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>

        {SEATS.map((p, i) => {
          const odd = p.seat === ODD;
          const card = odd ? ODD_CARD : CREW_CARD;
          const voters = SEATS.filter((v) => v.vote === p.seat);
          return (
            <div
              key={p.seat}
              className={cn(
                "-translate-x-1/2 absolute bottom-[3%] flex flex-col items-center",
                p.place,
                odd && "z-20",
              )}
            >
              {/* lights down: everything dark but a circle on whoever goes */}
              {odd ? (
                <AnimatePresence>
                  {s.caught ? (
                    <m.span
                      key="spot"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-[45%] left-1/2 size-[92cqh] rounded-pill shadow-[0_0_0_200vmax_rgba(11,15,23,0.72)]"
                      style={{
                        background:
                          "radial-gradient(circle, transparent 50%, rgba(11,15,23,0.72) 72%)",
                      }}
                    />
                  ) : null}
                </AnimatePresence>
              ) : null}

              {/* the answer held up like a judge's score, its stick behind the card */}
              <AnimatePresence>
                {s.answers ? (
                  <m.div
                    key="score"
                    className="-translate-x-1/2 absolute bottom-full left-1/2 -mb-[5cqh]"
                    initial={
                      reduced
                        ? { opacity: 0 }
                        : { opacity: 0, y: "45%", rotate: -16 }
                    }
                    animate={{
                      opacity: 1,
                      y: "0%",
                      rotate:
                        odd && !reduced ? [0, 0, -14, 12, -8, 0] : p.tilt * 0.5,
                    }}
                    exit={{
                      opacity: 0,
                      y: "35%",
                      transition: { duration: 0.2 },
                    }}
                    transition={{
                      opacity: { delay: reduced ? 0 : 0.15 + i * 0.25 },
                      y: {
                        type: "spring",
                        stiffness: 420,
                        damping: 17,
                        delay: reduced ? 0 : 0.15 + i * 0.25,
                      },
                      rotate: odd
                        ? { duration: 0.7, delay: 1.9 }
                        : {
                            type: "spring",
                            stiffness: 300,
                            damping: 12,
                            delay: 0.15 + i * 0.25,
                          },
                    }}
                  >
                    <ScorePaddle
                      n={p.answer}
                      delay={reduced ? 0 : 0.35 + i * 0.25}
                      flagAt={odd ? (reduced ? 0 : 1.9) : null}
                    />
                  </m.div>
                ) : null}
              </AnimatePresence>

              {/* the votes piling up over a card */}
              <div className="-translate-x-1/2 absolute bottom-full left-1/2 mb-[2.6cqh] flex">
                <AnimatePresence>
                  {s.votes
                    ? voters.map((v, k) => (
                        <m.span
                          key={v.seat}
                          {...pop}
                          transition={{
                            ...pop.transition,
                            delay: reduced ? 0 : 0.2 + k * 0.28,
                          }}
                          className={cn(
                            "-ml-[2.2cqh] block first:ml-0",
                            v.place.includes("hidden") && "max-sm:hidden",
                          )}
                        >
                          <Critter
                            seed={v.seed}
                            color={v.color}
                            className="size-[10cqh] rounded-pill shadow-[0_0_0_2px_var(--surface)]"
                          />
                        </m.span>
                      ))
                    : null}
                </AnimatePresence>
              </div>

              {/* the card: shuffled and dealt face down, then turned over for the audience */}
              <m.div
                animate={
                  step === 0 && !reduced
                    ? { y: ["0%", "-16%", "0%"], rotate: [0, -8, 6, 0] }
                    : { y: "0%", rotate: 0 }
                }
                transition={{ duration: 0.7, delay: i * 0.07 }}
              >
                <m.div
                  className="relative w-[33cqh]"
                  style={{ rotate: p.tilt }}
                  {...floating(i * 0.7)}
                >
                  <div className="perspective-[800px]">
                    <m.div
                      className="relative transform-3d"
                      animate={{ rotateY: s.up ? 180 : 0 }}
                      transition={{
                        duration: 0.6,
                        delay: s.up ? i * 0.09 : 0,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <div className="flex aspect-[4/5.6] items-center justify-center rounded-[14%/11%] bg-ink shadow-pop backface-hidden">
                        <VenetianMask
                          className="size-[45%] text-butter"
                          strokeWidth={2}
                        />
                      </div>
                      <div
                        className={cn(
                          "absolute inset-0 rotate-y-180 rounded-[14%/11%] backface-hidden",
                          odd &&
                            s.caught &&
                            "outline-[3px] outline-no outline-solid",
                        )}
                      >
                        <HeldCard seed={card.seed} color={card.color} fill />
                      </div>
                    </m.div>
                  </div>
                  <AnimatePresence>
                    {odd && s.caught ? (
                      <m.span
                        key="stamp"
                        initial={
                          reduced
                            ? { opacity: 0 }
                            : { opacity: 0, scale: 2.4, rotate: -16 }
                        }
                        animate={{ opacity: 1, scale: 1, rotate: -9 }}
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                        transition={{
                          delay: reduced ? 0 : 0.7,
                          duration: 0.4,
                          ease: [0.34, 1.56, 0.64, 1],
                        }}
                        className="-translate-x-1/2 -translate-y-1/2 absolute top-[52%] left-1/2 whitespace-nowrap rounded-md bg-no px-[2.6cqh] py-[1cqh] font-display font-extrabold text-[7.5cqh] text-on-no uppercase tracking-[0.02em] shadow-pop"
                      >
                        {t("caught")}
                      </m.span>
                    ) : null}
                  </AnimatePresence>
                </m.div>
              </m.div>

              <m.span
                animate={
                  s.caught && !odd && !reduced ? { y: [0, -8, 0] } : { y: 0 }
                }
                transition={{ duration: 0.45, delay: 1.1 + i * 0.08 }}
                className="-mt-[4cqh] block"
              >
                <Critter
                  seed={p.seed}
                  color={p.color}
                  className="size-[17cqh] rounded-pill shadow-[0_0_0_3px_var(--no-soft)]"
                />
              </m.span>
            </div>
          );
        })}
      </m.div>

      {/* melts into the page below */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-b from-transparent to-canvas/70" />
    </div>
  );
}
