"use client";

import { m, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import s from "./loader.module.css";

/** Where a card sits in the hand: left, middle (on top), right. Still for reduced motion. */
const SLOTS = [
  "translate(-60px, 10px) scale(0.94) rotate(-14deg)",
  "translate(0, -4px) scale(1.06)",
  "translate(60px, 10px) scale(0.94) rotate(14deg)",
] as const;
/** Each card's place in the shuffle's cycle (loader.module.css): the left one moves to the middle, the middle one to the right, the right one round the back. */
const DELAYS = ["-720ms", "-1440ms", "0ms"] as const;
/** Which card is on top while still: the middle one, then the right one. */
const DEPTHS = [1, 3, 2] as const;

/** The three cards: a pastel face and its "?", in the theme's colours. */
const CARDS = [
  { face: "bg-sky-soft", mark: "text-sky" },
  { face: "bg-apricot-soft", mark: "text-apricot" },
  { face: "bg-yes-soft", mark: "text-yes" },
] as const;

/**
 * Three "?" cards shuffled in a hand: every step the right one travels behind
 * the others to the left, and the next one takes the middle. Pure CSS, so it
 * keeps going while the page works under it. Still for reduced motion.
 */
function Shuffle() {
  return (
    <div aria-hidden="true" className="relative h-44 w-60">
      {/* the table's shadow, breathing with the hand */}
      <span
        className={cn(
          "absolute bottom-2 left-1/2 h-4 w-40 -translate-x-1/2 rounded-[50%] bg-ink/10 blur-[6px]",
          s.shadow,
        )}
      />
      {CARDS.map((card, i) => (
        <div
          key={card.face}
          className={cn(
            "absolute top-9 left-1/2 -ml-9 flex h-25 w-18 flex-col rounded-[15px] bg-surface p-1.5 shadow-card ring-1 ring-line",
            s.card,
          )}
          style={{
            transform: SLOTS[i],
            zIndex: DEPTHS[i],
            animationDelay: DELAYS[i],
          }}
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
        </div>
      ))}
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
  pill = false,
}: {
  label: string;
  className?: string;
  /** Its words on a pill, readable over a coloured backdrop (the room's code brings one too). */
  pill?: boolean;
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
          backgroundColor: room || pill ? "var(--surface)" : "#ffffff00",
          boxShadow:
            room || pill ? "0 6px 24px #00000012" : "0 0px 0px #00000000",
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
