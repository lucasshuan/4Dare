"use client";

import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { critterUri } from "@/components/ui/critter";
import { cn } from "@/lib/cn";

/** One loop of the little scene, in seconds. */
const LOOP = 7;

/** The cards on the table: everyone holds the same character but one. */
const CARDS = [
  { x: 6, rot: -9, crew: true },
  { x: 25, rot: -3, crew: true },
  { x: 44, rot: 3, crew: false },
  { x: 63, rot: 8, crew: true },
] as const;
const CREW = { seed: "dare-crew", color: "#BFE3EA" };
const ODD = { seed: "dare-odd", color: "#F4C7D9" };

/** The odd card rises out of line while the cards are face up (stays up when still). */
const rise = (still: boolean) =>
  still
    ? { initial: false as const, animate: { y: "-10%" } }
    : {
        animate: { y: ["0%", "0%", "-12%", "-12%", "0%"] },
        transition: {
          duration: LOOP,
          times: [0, 0.3, 0.38, 0.8, 0.88],
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut" as const,
        },
      };

function Face({ seed, color }: { seed: string; color: string }) {
  return (
    <div className="flex h-full flex-col gap-1.5 rounded-lg bg-surface p-1.5 shadow-card">
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
 * The Impostor's card art: four cards face down flip over, three show the
 * same character and one another, which rises out of line; then they all
 * turn back and shuffle. Still (the odd one up) for reduced motion, or with
 * `still` (a small thumbnail).
 */
export function ImpostorSnapshot({
  className,
  still: forceStill = false,
}: {
  className?: string;
  still?: boolean;
}) {
  const t = useTranslations("home.games.impostor");
  const reduced = useReducedMotion() ?? false;
  const still = forceStill || reduced;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative aspect-16/10 overflow-hidden rounded-lg bg-no-soft",
        className,
      )}
    >
      <span className="absolute -top-10 -left-8 size-40 rounded-pill bg-surface/40 blur-2xl" />
      <span className="absolute -right-6 -bottom-12 size-44 rounded-pill bg-butter/50 blur-2xl" />
      {CARDS.map((c, i) => (
        <m.div
          // biome-ignore lint/suspicious/noArrayIndexKey: four fixed cards
          key={i}
          className="absolute bottom-[8%] w-[28%] perspective-[800px]"
          style={{ left: `${c.x}%`, rotate: c.rot }}
          {...(c.crew ? {} : rise(still))}
        >
          <m.div
            className="relative transform-3d"
            {...(still
              ? { style: { rotateY: 180 } }
              : {
                  animate: { rotateY: [0, 0, 180, 180, 0] },
                  transition: {
                    duration: LOOP,
                    times: [0, 0.08 + i * 0.03, 0.2 + i * 0.03, 0.82, 0.92],
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  },
                })}
          >
            {/* the back, as everyone sees it at first */}
            <div className="flex aspect-[4/5.6] items-center justify-center rounded-lg bg-ink shadow-pop backface-hidden">
              <span className="font-display font-extrabold text-[clamp(28px,4vw,44px)] text-butter">
                ?
              </span>
            </div>
            <div
              className={cn(
                "absolute inset-0 rotate-y-180 backface-hidden",
                !c.crew && "rounded-lg outline-[3px] outline-no outline-solid",
              )}
            >
              <Face {...(c.crew ? CREW : ODD)} />
            </div>
          </m.div>
        </m.div>
      ))}
      <m.div
        className="absolute top-[8%] left-[7%] max-w-[60%] origin-bottom-left rounded-lg rounded-bl-sm bg-surface px-3 py-2 font-bold font-display text-[clamp(13px,1.6vw,16px)] text-ink leading-tight shadow-card"
        {...(still
          ? {}
          : {
              initial: { opacity: 0, scale: 0.8 },
              animate: {
                opacity: [0, 0, 1, 1, 0],
                scale: [0.8, 0.8, 1, 1, 0.9],
              },
              transition: {
                duration: LOOP,
                times: [0, 0.34, 0.42, 0.8, 0.88],
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeOut",
              },
            })}
      >
        {t("demoLine")}
      </m.div>
    </div>
  );
}
