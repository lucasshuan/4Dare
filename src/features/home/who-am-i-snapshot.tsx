"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { AnswerChip } from "@/components/ui/answer-chip";
import { critterUri } from "@/components/ui/critter";
import { cn } from "@/lib/cn";

/** One loop of the little scene, in seconds. */
const LOOP = 6;

/** Pops in at `from` (share of the loop) and out at the end, every loop. */
const popIn = (from: number) => ({
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: [0, 0, 1, 1, 0], scale: [0.8, 0.8, 1, 1, 0.9] },
  transition: {
    duration: LOOP,
    times: [0, from, from + 0.08, 0.9, 1],
    repeat: Number.POSITIVE_INFINITY,
    ease: "easeOut" as const,
  },
});

function MiniCard({
  seed,
  color,
  className,
}: {
  seed: string;
  color: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg bg-surface p-1.5 shadow-card",
        className,
      )}
    >
      <div
        className="aspect-4/5 overflow-hidden rounded-md"
        style={{ backgroundColor: color }}
      >
        {/* biome-ignore lint/performance/noImgElement: generated svg data uri */}
        <img src={critterUri(seed, color)} alt="" className="size-full" />
      </div>
      <span className="mx-1 mb-0.5 h-1.5 w-2/3 rounded-pill bg-line" />
    </div>
  );
}

/**
 * The "Who am I?" card art: everyone else's cards on the table, yours a "?"
 * that flips over, a question and its answer popping up. Still for reduced motion.
 */
export function WhoAmISnapshot({ className }: { className?: string }) {
  const t = useTranslations("home.games.whoAmI");
  const still = useReducedMotion() ?? false;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative aspect-16/10 overflow-hidden rounded-lg bg-sky-soft",
        className,
      )}
    >
      {/* soft light spots */}
      <span className="absolute -top-10 -left-8 size-40 rounded-pill bg-surface/40 blur-2xl" />
      <span className="absolute -right-6 -bottom-12 size-44 rounded-pill bg-butter/50 blur-2xl" />

      <motion.div
        className="absolute bottom-[-6%] left-[8%] w-[26%]"
        style={{ rotate: -10 }}
        {...(still
          ? {}
          : {
              animate: { y: [0, -6, 0] },
              transition: {
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              },
            })}
      >
        <MiniCard seed="dare-left" color="#F3D3B8" />
      </motion.div>
      <motion.div
        className="absolute right-[8%] bottom-[-6%] w-[26%]"
        style={{ rotate: 10 }}
        {...(still
          ? {}
          : {
              animate: { y: [0, -6, 0] },
              transition: {
                duration: 4,
                delay: 1.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              },
            })}
      >
        <MiniCard seed="dare-right" color="#BFE6C8" />
      </motion.div>

      {/* your card: "?" on the front, the critter on the back */}
      <div className="absolute bottom-[4%] left-1/2 w-[30%] -translate-x-1/2 perspective-[800px]">
        <motion.div
          className="relative transform-3d"
          {...(still
            ? {}
            : {
                animate: { rotateY: [0, 0, 180, 180, 360] },
                transition: {
                  duration: LOOP,
                  times: [0, 0.5, 0.62, 0.92, 1],
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                },
              })}
        >
          <div className="flex aspect-[4/5.6] items-center justify-center rounded-lg bg-surface font-display font-extrabold text-[clamp(40px,6vw,64px)] text-sky shadow-pop backface-hidden">
            ?
          </div>
          <div className="absolute inset-0 rotate-y-180 backface-hidden">
            <MiniCard
              seed="dare-you"
              color="#D9C7F4"
              className="h-full outline-[3px] outline-yes outline-solid"
            />
          </div>
        </motion.div>
      </div>

      {/* the question, then the answer */}
      <motion.div
        className="absolute top-[9%] left-[7%] max-w-[52%] origin-bottom-left rounded-lg rounded-bl-sm bg-surface px-3 py-2 font-bold font-display text-[clamp(13px,1.6vw,16px)] text-ink leading-tight shadow-card"
        {...(still ? {} : popIn(0.06))}
      >
        {t("demoQuestion")}
      </motion.div>
      <motion.div
        className="absolute top-[11%] right-[7%] origin-left"
        {...(still ? {} : popIn(0.22))}
      >
        <AnswerChip value="yes" small pressed />
      </motion.div>
    </div>
  );
}
