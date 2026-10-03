"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";

/** One step of the shuffle, in ms: a card moves, the hand rests a moment. */
const STEP = 720;
const MOVE = 0.52;

/** Where a card sits in the hand: left, middle (on top), right. */
const SLOTS = [
  { x: -60, y: 10, rotate: -14, scale: 0.94, z: 1 },
  { x: 0, y: -4, rotate: 0, scale: 1.06, z: 3 },
  { x: 60, y: 10, rotate: 14, scale: 0.94, z: 2 },
] as const;

/** The three cards: a pastel face and its "?", in the theme's colours. */
const CARDS = [
  { face: "bg-sky-soft", mark: "text-sky" },
  { face: "bg-apricot-soft", mark: "text-apricot" },
  { face: "bg-yes-soft", mark: "text-yes" },
] as const;

/**
 * Three "?" cards shuffled in a hand: every step the right one travels behind
 * the others to the left, and the next one takes the middle. Still for reduced motion.
 */
function Shuffle() {
  const reduced = useReducedMotion() ?? false;
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setStep((n) => n + 1), STEP);
    return () => window.clearInterval(id);
  }, [reduced]);
  return (
    <div aria-hidden="true" className="relative h-44 w-60">
      {/* the table's shadow, breathing with the hand */}
      <motion.span
        className="absolute bottom-2 left-1/2 h-4 w-40 -translate-x-1/2 rounded-[50%] bg-ink/10 blur-[6px]"
        animate={reduced ? undefined : { scaleX: [1, 0.86, 1] }}
        transition={{
          duration: STEP / 1000,
          repeat: Number.POSITIVE_INFINITY,
          ease: ease.swap,
        }}
      />
      {CARDS.map((card, i) => {
        const slot = (i + step) % 3;
        const at = SLOTS[slot];
        // the card that just left the right goes round the back, lifted
        const wrapping = step > 0 && slot === 0;
        return (
          <motion.div
            key={card.face}
            className="absolute top-9 left-1/2 -ml-9 flex h-25 w-18 flex-col rounded-[15px] bg-surface p-1.5 shadow-card ring-1 ring-line"
            style={{ zIndex: wrapping ? 0 : at.z }}
            initial={false}
            animate={{
              x: wrapping ? [SLOTS[2].x, 0, at.x] : at.x,
              y: wrapping ? [SLOTS[2].y, -26, at.y] : at.y,
              rotate: wrapping ? [SLOTS[2].rotate, 0, at.rotate] : at.rotate,
              scale: wrapping ? [SLOTS[2].scale, 0.84, at.scale] : at.scale,
            }}
            transition={{ duration: MOVE, ease: ease.swap }}
          >
            <span
              className={cn(
                "flex flex-1 items-center justify-center rounded-[10px] font-display font-extrabold text-[40px] leading-none",
                card.face,
                card.mark,
              )}
            >
              ?
            </span>
            <span className="mx-1 mt-1.5 mb-0.5 h-1.5 w-2/3 rounded-pill bg-line" />
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * The site's loading state: a hand of "?" cards shuffling, with what is going
 * on under it. It fades in after a beat, so quick loads never flash it.
 */
export function Loader({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay: 0.15, duration: 0.4, ease: ease.soft },
      }}
      className={cn("flex flex-col items-center gap-5", className)}
    >
      <Shuffle />
      <span className="font-semibold text-ink-muted text-lg">{label}</span>
    </motion.div>
  );
}

/**
 * The loader in the middle of the window, whatever bar the page has: one
 * loading step handing over to the next (creating a room, then opening it)
 * keeps it in place.
 */
export function PageLoader({ label }: { label: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 flex items-center justify-center pb-6">
      <Loader label={label} />
    </div>
  );
}
