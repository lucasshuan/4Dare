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
  { x: 9, tilt: -8 },
  { x: 31, tilt: -3 },
  { x: 53, tilt: 3 },
  { x: 75, tilt: 8 },
] as const;
/** A card's width, in % of the box. */
const W = 22;
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
const centre = (i: number) => CARDS[i].x + W / 2;

/**
 * The Impostor's card art: four cards face down; the lights go down, a
 * spotlight searches the table and lands on one, the cards turn over (all the
 * same but that one) and it is stamped. The odd card moves every loop. Still (stamped) for reduced
 * motion, or with `still`.
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
  const { step, loop } = useStepLoop(STEPS, STILL, still);

  const s = STEPS[step];
  const odd = ODD_AT[loop % ODD_AT.length];
  const spot = `${centre(odd)}%`;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative isolate aspect-16/10 overflow-hidden rounded-lg art-impostor [container-type:size]",
        className,
      )}
    >
      {/* soft light spots and a couple of masks */}
      <span className="absolute -top-10 -left-8 size-40 rounded-pill bg-white/10 blur-2xl" />
      <span className="absolute -right-6 -bottom-12 size-44 rounded-pill bg-butter/20 blur-2xl" />
      <VenetianMask
        className="absolute top-[10%] right-[8%] size-[16cqh] rotate-12 text-no opacity-20"
        strokeWidth={2.25}
      />
      <VenetianMask
        className="absolute top-[38%] left-[3%] size-[10cqh] -rotate-12 text-apricot opacity-25"
        strokeWidth={2.25}
      />

      {CARDS.map((c, i) => {
        const theOdd = i === odd;
        const card = theOdd ? ODD : CREW;
        return (
          <m.div
            // biome-ignore lint/suspicious/noArrayIndexKey: four fixed seats
            key={i}
            className="absolute bottom-[7%]"
            style={{ left: `${c.x}%`, width: `${W}%`, rotate: c.tilt }}
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
            className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-[58%] size-[78cqh] rounded-pill shadow-[0_0_0_200vmax_var(--art-impostor-dim)]"
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
            className="-translate-x-1/2 -translate-y-1/2 absolute top-[58%] whitespace-nowrap rounded-md bg-no px-[3cqh] py-[1.2cqh] font-display font-extrabold text-[clamp(13px,8cqh,20px)] text-on-no uppercase tracking-[0.02em] shadow-pop"
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
            className="absolute top-[8%] left-[7%] max-w-[60%] origin-bottom-left rounded-lg rounded-bl-sm bg-surface px-3 py-2 font-bold font-display text-[clamp(13px,1.6vw,16px)] text-ink leading-tight shadow-card"
          >
            {t("demoLine")}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
