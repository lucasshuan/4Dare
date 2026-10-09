"use client";

import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { AnswerChip } from "@/components/ui/answer-chip";
import { cn } from "@/lib/cn";
import { type Figure, figureUri } from "@/lib/figures";

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
 * The "Who am I?" card art: everyone else's cards on the table, yours a "?"
 * that flips over, a question and its answer popping up. Still for reduced motion,
 * or with `still` (a small thumbnail).
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

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden art-whoami",
        !wide && "aspect-square",
        className,
      )}
    >
      {/* soft light spots */}
      <span className="absolute -top-10 -left-8 size-40 rounded-pill bg-surface/40 blur-2xl dark:bg-white/5" />
      <span className="absolute -right-6 -bottom-12 size-44 rounded-pill bg-butter/50 blur-2xl dark:bg-butter/10" />

      <m.div
        className={
          wide
            ? "absolute bottom-[12%] left-[33%] w-[22%]"
            : "absolute bottom-[23%] left-[9%] w-[29%]"
        }
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
        <MiniCard figure="lady" />
      </m.div>
      <m.div
        className={
          wide
            ? "absolute right-[5%] bottom-[12%] w-[22%]"
            : "absolute right-[9%] bottom-[23%] w-[29%]"
        }
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
        <MiniCard figure="king" />
      </m.div>

      {/* your card: "?" on the front, a character on the back */}
      <div
        className={cn(
          "-translate-x-1/2 absolute perspective-[800px]",
          wide
            ? "bottom-[10%] left-[64%] w-[25%]"
            : "bottom-[25%] left-1/2 w-[33%]",
        )}
      >
        <m.div
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
              figure="cat"
              className="h-full outline-[3px] outline-yes outline-solid"
            />
          </div>
        </m.div>
      </div>

      {/* the question, then the answer */}
      <m.div
        className={cn(
          "absolute origin-bottom-left rounded-lg rounded-bl-sm bg-surface px-3 py-2 font-bold font-display text-[clamp(13px,1.6vw,16px)] text-ink leading-tight shadow-card",
          wide
            ? "top-[10%] left-[4%] max-w-[30%]"
            : "top-[6%] left-[7%] max-w-[52%]",
        )}
        {...(still ? {} : popIn(0.06))}
      >
        {t("demoQuestion")}
      </m.div>
      <m.div
        className={cn(
          "absolute origin-left",
          wide ? "top-[10%] right-[4%]" : "top-[8%] right-[7%]",
        )}
        {...(still ? {} : popIn(0.22))}
      >
        <AnswerChip value="yes" small pressed />
      </m.div>
    </div>
  );
}
