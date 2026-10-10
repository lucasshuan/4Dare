"use client";

import { VenetianMask } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { HeldCard } from "@/components/ui/figure-art";
import { MaskCardBack } from "@/features/impostor/impostor-banner";
import { cn } from "@/lib/cn";
import { useStepLoop } from "@/lib/hooks/use-step-loop";

/** The cards on the table, left to right: left edge (% of the box) and tilt. */
const CARDS = [
  { x: 6, tilt: -8 },
  { x: 26.5, tilt: -3 },
  { x: 46.5, tilt: 3 },
  { x: 67, tilt: 8 },
] as const;
/** A card's width, in % of the box. */
const W = 27;
/** The same in a 2:1 strip: the cards to the right, smaller, the line to their left. */
const WIDE_CARDS = [
  { x: 34, tilt: -8 },
  { x: 48, tilt: -3 },
  { x: 62, tilt: 3 },
  { x: 76, tilt: 8 },
] as const;
const WIDE_W = 19;
/** The crew's card and the odd one, its neighbour. */
const CREW = "lion";
const ODD = "giraffe";
/** Where the other card turns up, loop after loop. */
const ODD_AT = [2, 0, 3, 1];

/**
 * One loop: cards shuffled face down, the lights go down and a spotlight
 * sweeps the table, stops on the odd one, and only then the cards turn over
 * (one isn't like the others), the stamp. `ms` is how long each step stays.
 */
const STEPS: {
  ms: number;
  up?: boolean;
  line?: boolean;
  dark?: boolean;
  caught?: boolean;
}[] = [
  { ms: 800 },
  { ms: 1500, line: true },
  { ms: 1700, dark: true },
  { ms: 900, up: true, dark: true },
  { ms: 2000, up: true, dark: true, caught: true },
  { ms: 600, up: true },
];
/** The frame shown when still: the spotlight on the odd card, stamped. */
const STILL = 4;

/** The middle of card `i`, in % of the box. */
const centre = (i: number, wide: boolean) =>
  wide ? WIDE_CARDS[i].x + WIDE_W / 2 : CARDS[i].x + W / 2;

/**
 * The Impostor's card art: four cards face down; the lights go down, a
 * spotlight searches the table and lands on one, the cards turn over (all the
 * same but that one) and it is stamped. The odd card moves every loop. Still (stamped) for reduced
 * motion, or with `still`.
 */
export function ImpostorSnapshot({
  className,
  still: forceStill = false,
  wide = false,
}: {
  className?: string;
  still?: boolean;
  /** Laid out for a 2:1 strip (the lobby's game panel): the cards right, the line left. */
  wide?: boolean;
}) {
  const t = useTranslations("home.games.impostor");
  const reduced = useReducedMotion() ?? false;
  const still = forceStill || reduced;
  const { step, loop } = useStepLoop(STEPS, STILL, still);

  const s = STEPS[step];
  const odd = ODD_AT[loop % ODD_AT.length];
  const spot = `${centre(odd, wide)}%`;
  const cards = wide ? WIDE_CARDS : CARDS;
  const width = wide ? WIDE_W : W;

  return (
    <div
      aria-hidden="true"
      data-art-theme="dark"
      className={cn(
        "relative isolate overflow-hidden art-impostor [container-type:size]",
        !wide && "aspect-square",
        className,
      )}
    >
      {/* soft light spots and a couple of masks */}
      <span className="absolute -top-10 -left-8 size-40 rounded-pill bg-white/10 blur-2xl" />
      <span className="absolute -right-6 -bottom-12 size-44 rounded-pill bg-butter/6 blur-2xl" />
      <VenetianMask
        className={cn(
          "absolute top-[6%] right-[8%] rotate-12 text-no opacity-20",
          wide ? "right-[4%] size-[16cqh]" : "size-[10cqh]",
        )}
        strokeWidth={2.25}
      />
      <VenetianMask
        className={cn(
          "-rotate-12 absolute text-apricot opacity-25",
          wide
            ? "top-[70%] left-[8%] size-[12cqh]"
            : "top-[76%] left-[9%] size-[6cqh]",
        )}
        strokeWidth={2.25}
      />

      {cards.map((c, i) => {
        const theOdd = i === odd;
        const card = theOdd ? ODD : CREW;
        return (
          <m.div
            // biome-ignore lint/suspicious/noArrayIndexKey: four fixed seats
            key={i}
            className={cn("absolute", wide ? "bottom-[8%]" : "bottom-[31%]")}
            style={{ left: `${c.x}%`, width: `${width}%`, rotate: c.tilt }}
            animate={
              step === 0 && !still
                ? {
                    y: ["0%", "-14%", "0%"],
                    rotate: [c.tilt, c.tilt - 8, c.tilt],
                  }
                : { y: "0%", rotate: c.tilt }
            }
            transition={{ duration: 0.6, delay: i * 0.06 }}
          >
            <div className="perspective-[800px]">
              <m.div
                className="relative transform-3d"
                initial={false}
                animate={{ rotateY: s.up ? 180 : 0 }}
                transition={{
                  duration: still ? 0 : 0.55,
                  delay: s.up && !still ? i * 0.08 : 0,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <MaskCardBack />
                <div
                  className={cn(
                    "absolute inset-0 rotate-y-180 rounded-[14%/11%] backface-hidden",
                    theOdd &&
                      s.caught &&
                      "outline-[3px] outline-no outline-solid",
                  )}
                >
                  <HeldCard figure={card} fill />
                </div>
              </m.div>
            </div>
          </m.div>
        );
      })}

      {/* lights down: a spotlight sweeps the table, then settles on the odd card */}
      <AnimatePresence>
        {s.dark ? (
          <m.span
            key={`spot-${loop}`}
            className={cn(
              "-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute rounded-pill shadow-[0_0_0_200vmax_var(--art-impostor-dim)]",
              wide ? "top-[65%] size-[90cqh]" : "top-[50%] size-[64cqh]",
            )}
            style={{
              background:
                "radial-gradient(circle, rgba(246,227,161,0.16), transparent 48%, var(--art-impostor-dim) 72%)",
            }}
            initial={{ opacity: 0, left: still ? spot : "4%" }}
            animate={{
              opacity: 1,
              left: still ? spot : ["4%", "96%", spot],
            }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.35 },
              left: { duration: still ? 0 : 1.5, ease: "easeInOut" },
            }}
          />
        ) : null}
      </AnimatePresence>

      {/* the stamp on the odd card */}
      <AnimatePresence>
        {s.caught ? (
          <m.span
            key={`stamp-${loop}`}
            className={cn(
              "-translate-x-1/2 -translate-y-1/2 absolute whitespace-nowrap rounded-md bg-no font-display font-extrabold text-[clamp(13px,5cqh,20px)] text-on-no uppercase tracking-[0.02em] shadow-pop",
              wide
                ? "top-[64%] px-[3cqh] py-[1.2cqh]"
                : "top-[49%] px-[2cqh] py-[0.8cqh]",
            )}
            style={{ left: spot }}
            initial={
              still ? { opacity: 0 } : { opacity: 0, scale: 2.4, rotate: -16 }
            }
            animate={{ opacity: 1, scale: 1, rotate: -9 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {t("banner.caught")}
          </m.span>
        ) : null}
      </AnimatePresence>

      {/* "One of you has another." while the cards are still down */}
      <AnimatePresence>
        {s.line ? (
          <m.div
            key="line"
            initial={{ opacity: 0, scale: 0.8, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className={cn(
              "absolute origin-bottom-left rounded-lg rounded-bl-sm bg-surface px-3 py-2 font-bold font-display text-[clamp(13px,1.6vw,16px)] text-ink leading-tight shadow-card",
              wide
                ? "top-[8%] left-[4%] max-w-[33%]"
                : "top-[8%] left-[7%] max-w-[60%]",
            )}
          >
            {t("demoLine")}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
