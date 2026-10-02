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
import type { AnswerValue } from "@/game/types";
import { cn } from "@/lib/cn";

/**
 * One loop of the banner, a round in miniature: you (the "?" card) ask, the
 * others answer over their heads, you guess, your card flips and you got it.
 * `ms` is how long each step stays on screen.
 */
const STEPS: {
  ms: number;
  ask?: "q1" | "q2" | "guess";
  left?: AnswerValue;
  right?: AnswerValue;
  hit?: boolean;
}[] = [
  { ms: 700 },
  { ms: 1100, ask: "q1" },
  { ms: 600, ask: "q1", left: "yes" },
  { ms: 1500, ask: "q1", left: "yes", right: "yes" },
  { ms: 1100, ask: "q2" },
  { ms: 600, ask: "q2", left: "unknown" },
  { ms: 1500, ask: "q2", left: "unknown", right: "yes" },
  { ms: 1300, ask: "guess" },
  { ms: 2800, ask: "guess", hit: true },
];
/** The frame shown when motion is reduced: a question and both answers. */
const STILL = 3;

const PLAYERS = {
  left: { seed: "banner-left", color: "#F3D3B8", card: "#BFE6C8" },
  you: { seed: "banner-you", color: "#D9C7F4", card: "#F2E3A8" },
  right: { seed: "banner-right", color: "#BFE3EA", card: "#F4C7D9" },
} as const;

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
      <img src={critterUri(seed, color)} alt="" className="size-full" />
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
        "flex flex-col gap-1.5 rounded-[14%/11%] bg-surface p-[7%] shadow-card",
        fill && "h-full",
      )}
    >
      <Critter
        seed={seed}
        color={color}
        className={cn(
          "rounded-[12%] [&_img]:object-cover",
          fill ? "min-h-0 flex-1" : "aspect-4/5",
        )}
      />
      <span className="mx-[6%] h-1.5 w-2/3 shrink-0 rounded-pill bg-line" />
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

/**
 * The "Who am I?" banner: three players around the table, cards up, a round
 * playing on a loop. Layers drift with the pointer. Still for reduced motion.
 */
export function WhoAmIBanner({ className }: { className?: string }) {
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
  const sx = useSpring(px, { stiffness: 120, damping: 20 });
  const sy = useSpring(py, { stiffness: 120, damping: 20 });
  const backX = useTransform(sx, (v) => v * -24);
  const backY = useTransform(sy, (v) => v * -16);
  const frontX = useTransform(sx, (v) => v * 12);
  const frontY = useTransform(sy, (v) => v * 8);

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
        if (reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
      className={cn(
        "relative aspect-16/10 select-none overflow-hidden rounded-xl bg-sky-soft sm:aspect-[2/1]",
        className,
      )}
    >
      {/* soft light that drifts the other way */}
      <motion.div style={{ x: backX, y: backY }} className="absolute -inset-8">
        <span className="absolute top-[-20%] left-[-8%] size-[55%] rounded-pill bg-surface/45 blur-3xl" />
        <span className="absolute right-[-10%] bottom-[-30%] size-[60%] rounded-pill bg-butter/55 blur-3xl" />
        <span className="absolute top-[10%] right-[18%] size-[28%] rounded-pill bg-apricot-soft/70 blur-2xl" />
      </motion.div>

      <motion.div style={{ x: frontX, y: frontY }} className="absolute inset-0">
        {/* the question, then the guess, then "Got it!" in its place */}
        <div className="absolute inset-x-0 top-[7%] flex justify-center">
          <AnimatePresence mode="wait">
            {s.hit ? (
              <motion.div
                key="hit"
                {...pop}
                className="inline-flex items-center gap-1.5 rounded-pill bg-yes px-4 py-2 font-bold font-display text-[clamp(14px,2.2vw,20px)] text-on-yes leading-tight shadow-card"
              >
                <Sparkles className="size-[1.1em]" strokeWidth={2} />
                {t("hit")}
              </motion.div>
            ) : s.ask ? (
              <motion.div
                key={s.ask}
                {...pop}
                className={cn(
                  "max-w-[60%] rounded-lg rounded-b-sm px-3.5 py-2 text-center font-bold font-display text-[clamp(14px,2.2vw,20px)] leading-tight shadow-card",
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

        {/* the others, cards up, answers over their heads */}
        {(["left", "right"] as const).map((side, i) => (
          <div
            key={side}
            className={cn(
              "absolute bottom-[6%] flex w-[20%] flex-col items-center",
              side === "left" ? "left-[10%]" : "right-[10%]",
            )}
          >
            <div className="mb-2 flex h-7 items-end justify-center">
              <AnimatePresence>
                {s[side] ? (
                  <motion.span
                    key={`${s.ask}-${s[side]}`}
                    {...pop}
                    className="shrink-0 whitespace-nowrap"
                  >
                    <AnswerChip value={s[side]} small pressed />
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
            <motion.div
              className="w-[72%]"
              style={{ rotate: side === "left" ? -8 : 8 }}
              {...floating(i * 1.1)}
            >
              <HeldCard
                seed={`${PLAYERS[side].seed}-card`}
                color={PLAYERS[side].card}
              />
            </motion.div>
            <Critter
              seed={PLAYERS[side].seed}
              color={PLAYERS[side].color}
              className="-mt-[8%] size-[42%] rounded-pill shadow-[0_0_0_3px_var(--sky-soft)]"
            />
          </div>
        ))}

        {/* you: the "?" card, which flips when you get it */}
        <div className="absolute bottom-[6%] left-1/2 flex w-[22%] -translate-x-1/2 flex-col items-center">
          <motion.div className="w-[76%]" {...floating(0.5)}>
            <div className="perspective-[800px]">
              <motion.div
                className="relative transform-3d"
                animate={{ rotateY: s.hit ? 180 : 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex aspect-[4/5.6] items-center justify-center rounded-[14%/11%] bg-surface font-display font-extrabold text-[clamp(40px,7vw,72px)] text-sky shadow-pop backface-hidden">
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
                  <HeldCard
                    seed={`${PLAYERS.you.seed}-card`}
                    color={PLAYERS.you.card}
                    fill
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
          <Critter
            seed={PLAYERS.you.seed}
            color={PLAYERS.you.color}
            className="-mt-[8%] size-[40%] rounded-pill shadow-[0_0_0_3px_var(--sky-soft),0_0_0_6px_var(--sky)]"
          />
        </div>
      </motion.div>
    </div>
  );
}
