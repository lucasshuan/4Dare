"use client";

import { m, useReducedMotion } from "motion/react";
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
      <m.span
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
          <m.div
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
          </m.div>
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
  roomCode,
}: {
  label: string;
  className?: string;
  /** The hand stays mounted as creation becomes the room's entrance. */
  roomCode?: string;
}) {
  const reduced = useReducedMotion();
  const room = !!roomCode;
  return (
    <m.div
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
      <m.div
        className="relative"
        initial={{ scale: 1 }}
        animate={{ scale: room && !reduced ? 1.08 : 1 }}
        transition={{ duration: 0.9, ease: ease.soft }}
      >
        <m.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[-28px] inset-y-[-45px] rounded-[50%] border border-white/25"
          initial={{ opacity: 0, scale: 1, rotate: 0 }}
          animate={{
            opacity: room ? 1 : 0,
            scale: room ? 1 : 0.8,
            rotate: room && !reduced ? -18 : 0,
          }}
          transition={{ duration: 1.1, ease: ease.soft }}
        />
        <m.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[-48px] inset-y-[-25px] rounded-[50%] border border-dashed border-white/15"
          initial={{ opacity: 0, scale: 1, rotate: 0 }}
          animate={{
            opacity: room ? 1 : 0,
            scale: room ? 1 : 0.85,
            rotate: room && !reduced ? 18 : 0,
          }}
          transition={{ duration: 1.25, ease: ease.soft }}
        />
        <m.div
          aria-hidden="true"
          initial={false}
          animate={{ opacity: room ? 1 : 0 }}
          transition={{ duration: 0.7 }}
        >
          {[-1, 1].map((side) => (
            <m.span
              key={side}
              initial={{ y: 0, opacity: 0.4 }}
              className="absolute top-14 size-2 rounded-pill bg-white/60 shadow-[0_0_16px_4px_#ffffff30]"
              style={{ left: side < 0 ? -24 : 256 }}
              animate={
                room && !reduced
                  ? { y: [0, side * 12, 0], opacity: [0.4, 1, 0.4] }
                  : undefined
              }
              transition={{
                duration: 2.8,
                delay: side < 0 ? 0 : 0.5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          ))}
        </m.div>
        <Shuffle />
      </m.div>
      <m.span
        className="relative rounded-pill px-5 py-2 font-semibold text-ink-muted text-lg"
        initial={false}
        animate={{
          backgroundColor: room ? "var(--surface)" : "#ffffff00",
          boxShadow: room ? "0 6px 24px #00000012" : "0 0px 0px #00000000",
        }}
        transition={{ duration: 0.65, ease: ease.soft }}
      >
        {label}
      </m.span>
      {roomCode ? (
        <div aria-hidden="true" className="absolute top-full mt-4 flex gap-1.5">
          {[...roomCode].map((letter, index) => (
            <m.span
              // biome-ignore lint/suspicious/noArrayIndexKey: five fixed room-code slots, including repeated letters
              key={`${index}-${letter}`}
              className="flex size-7 items-center justify-center rounded-sm border border-white/25 bg-white/10 font-bold font-mono text-sm text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                delay: reduced ? 0 : 0.2 + index * 0.07,
                duration: 0.45,
                ease: ease.soft,
              }}
            >
              {letter}
            </m.span>
          ))}
        </div>
      ) : null}
    </m.div>
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
