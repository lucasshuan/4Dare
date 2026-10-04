"use client";

import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type ThemeSet, TYPED_GLYPHS, themeGlyphs } from "@/game/theme-sets";
import { gs } from "@/lib/motion";

/** The colour washing the page: none (the canvas), a step's colour, or a seat's. */
export type Tone =
  | "none"
  | "brand"
  | "butter"
  | "theme"
  | "seat-1"
  | "seat-2"
  | "seat-3"
  | "seat-4";
/** The symbols bobbing on it: "?" marks, the theme set's emoji, or a typed theme's pen and "?". */
export type Glyphs = "none" | "q" | "set" | "typed";

/** What the backdrop shows. A new look fades in over `fade` seconds. */
export interface Look {
  tone: Tone;
  glyphs: Glyphs;
  /** Colour of the text glyphs ("?"); emoji keep their own. */
  glyphColor: string;
  fade: number;
}

/** The plain canvas (lobby, podium). */
export const NO_LOOK: Look = {
  tone: "none",
  glyphs: "none",
  glyphColor: "var(--ink)",
  fade: 0.8,
};

/** A seat's colour with its "?" marks: whoever's turn it is. */
export function seatLook(seat: number | null, fade = 1): Look {
  if (seat === null) return { ...NO_LOOK, fade };
  const n = (seat % 4) + 1;
  return {
    tone: `seat-${n}` as Tone,
    glyphs: "q",
    glyphColor: `var(--seat-${n})`,
    fade,
  };
}

/** Each tone's colour; the brand stage is solid blue, the others wash the canvas. */
const TONES: Record<Exclude<Tone, "none">, { color: string; solid?: true }> = {
  brand: { color: "var(--brand-stage)", solid: true },
  butter: { color: "var(--butter)" },
  theme: { color: "var(--no)" },
  "seat-1": { color: "var(--seat-1)" },
  "seat-2": { color: "var(--seat-2)" },
  "seat-3": { color: "var(--seat-3)" },
  "seat-4": { color: "var(--seat-4)" },
};

/** Where the seven glyphs sit: [left %, top %, size px (×0.8 on phones), bob seconds]. */
const SPOTS: [number, number, number, number][] = [
  [5, 20, 44, 9],
  [12, 76, 30, 8],
  [30, 9, 24, 10],
  [47, 86, 36, 9.5],
  [66, 13, 28, 8.5],
  [82, 58, 50, 10.5],
  [93, 30, 24, 7.5],
];

const MARKS = SPOTS.map(() => "?");

/** Both layers crossfade the same way; the leaving one takes the new look's length. */
const fade = {
  hidden: (seconds: number) => ({
    opacity: 0,
    transition: { duration: seconds, ease: gs.sineInOut },
  }),
  shown: (seconds: number) => ({
    opacity: 1,
    transition: { duration: seconds, ease: gs.sineInOut },
  }),
};

/**
 * The match's backdrop, behind the whole page: a step's colour (or a seat's)
 * washing the canvas, two soft glows drifting in it, and seven symbols
 * bobbing. A new look crossfades from the old one, colour and symbols each on
 * their own layer, so moving between screens never cuts. Still under reduced
 * motion (no drift, no bob; the crossfade stays).
 */
export function StageBackdrop({
  look,
  set,
}: {
  look: Look;
  /** The theme's set, for `glyphs: "set"`; null for a typed theme. */
  set: ThemeSet | null;
}) {
  // On <body>, so no moving parent drags the fixed layer along.
  const [body, setBody] = useState<HTMLElement | null>(null);
  useEffect(() => setBody(document.body), []);
  if (!body) return null;
  const glyphs =
    look.glyphs === "none"
      ? null
      : look.glyphs === "q"
        ? { key: "q", list: MARKS }
        : look.glyphs === "set" && set
          ? { key: `set-${set}`, list: themeGlyphs(set) }
          : { key: "typed", list: TYPED_GLYPHS };
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden max-sm:[--glyph-k:0.8]"
    >
      <AnimatePresence initial={false} custom={look.fade}>
        {look.tone === "none" ? null : (
          <motion.div
            key={look.tone}
            custom={look.fade}
            variants={fade}
            initial="hidden"
            animate="shown"
            exit="hidden"
            className="absolute inset-0"
          >
            <Wash {...TONES[look.tone]} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false} custom={look.fade}>
        {glyphs ? (
          <motion.div
            key={glyphs.key}
            custom={look.fade}
            variants={fade}
            initial="hidden"
            animate="shown"
            exit="hidden"
            className="absolute inset-0"
          >
            <GlyphLayer
              list={glyphs.list}
              color={look.glyphColor}
              fade={look.fade}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    body,
  );
}

function Wash({ color, solid }: { color: string; solid?: boolean }) {
  return (
    <>
      <span
        className="absolute inset-0"
        style={{
          background: solid
            ? color
            : `color-mix(in oklab, ${color} var(--wash-mix), var(--canvas))`,
        }}
      />
      {/* the glows, larger than the page so their drift never shows an edge */}
      <span
        className="absolute -inset-[20%] animate-drift motion-reduce:animate-none"
        style={{
          background: solid
            ? "radial-gradient(closest-side at 70% 30%, rgba(255, 255, 255, 0.14), transparent), radial-gradient(closest-side at 20% 85%, rgba(0, 0, 0, 0.16), transparent)"
            : `radial-gradient(closest-side at 18% 22%, color-mix(in oklab, ${color} 34%, transparent), transparent), radial-gradient(closest-side at 82% 70%, color-mix(in oklab, ${color} 26%, transparent), transparent)`,
        }}
      />
    </>
  );
}

const isEmoji = (glyph: string) => /\p{Extended_Pictographic}/u.test(glyph);

function GlyphLayer({
  list,
  color,
  fade,
}: {
  list: readonly string[];
  color: string;
  fade: number;
}) {
  return SPOTS.map(([left, top, size, seconds], i) => {
    const glyph = list[i % list.length];
    const emoji = isEmoji(glyph);
    const style: CSSProperties = {
      left: `${left}%`,
      top: `${top}%`,
      fontSize: `calc(${size}px * var(--glyph-k, 1))`,
      animationDuration: `${seconds}s`,
      animationDelay: `${-1.3 * i}s`,
    };
    return (
      <span
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed spots, the same glyph may repeat
        key={i}
        className={
          emoji
            ? "absolute animate-bob font-display font-extrabold leading-none opacity-[0.22] saturate-[0.9] motion-reduce:animate-none"
            : "absolute animate-bob font-display font-extrabold leading-none opacity-[0.16] motion-reduce:animate-none"
        }
        style={
          emoji
            ? style
            : { ...style, color, transition: `color ${fade}s ease-in-out` }
        }
      >
        {glyph}
      </span>
    );
  });
}
