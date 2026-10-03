"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { seatColor } from "@/lib/seats";

/** Soft blobs of the player's colour that wander slowly: [left %, top %, size vmax, mix %, seconds, path]. */
const BLOBS: [number, number, number, number, number, [number[], number[]]][] =
  [
    [
      -12,
      -18,
      62,
      30,
      26,
      [
        [0, 8, -4, 0],
        [0, 6, 10, 0],
      ],
    ],
    [
      62,
      48,
      58,
      24,
      32,
      [
        [0, -10, -4, 0],
        [0, -6, 4, 0],
      ],
    ],
    [
      28,
      70,
      40,
      18,
      22,
      [
        [0, 6, 12, 0],
        [0, -10, -4, 0],
      ],
    ],
  ];

/** Question marks drifting like the game page's banner: [left %, top %, size px, seconds]. */
const MARKS: [number, number, number, number][] = [
  [4, 22, 44, 9],
  [12, 78, 30, 8],
  [31, 10, 22, 10],
  [48, 88, 36, 9.5],
  [68, 14, 28, 8.5],
  [84, 60, 52, 10.5],
  [94, 30, 24, 7.5],
];

/**
 * The colour of whoever's turn it is, behind the whole screen: big soft blobs
 * that wander, with question marks bobbing in it. It stays theirs while others
 * answer or check their guess, and fades into the next player's colour when
 * the turn moves on.
 */
export function TurnBackdrop({ seat }: { seat: number | null }) {
  // On <body>, so no moving parent drags the fixed layer along.
  const [body, setBody] = useState<HTMLElement | null>(null);
  useEffect(() => setBody(document.body), []);
  if (!body) return null;
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <AnimatePresence initial={false}>
        {seat === null ? null : (
          <motion.div
            key={seat}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Wash color={seatColor(seat)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    body,
  );
}

function Wash({ color }: { color: string }) {
  const still = useReducedMotion() ?? false;
  const loop = (seconds: number) => ({
    duration: seconds,
    repeat: Number.POSITIVE_INFINITY,
    ease: "easeInOut" as const,
  });
  return (
    <>
      {/* an even tint, so the whole page takes the colour */}
      <span
        className="absolute inset-0"
        style={{ background: `color-mix(in oklab, ${color} 7%, transparent)` }}
      />
      {BLOBS.map(([left, top, size, mix, seconds, [xs, ys]]) => (
        <motion.span
          key={`${left}-${top}`}
          className="absolute rounded-full blur-3xl"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${size}vmax`,
            height: `${size}vmax`,
            background: `radial-gradient(closest-side, color-mix(in oklab, ${color} ${mix}%, transparent), transparent)`,
          }}
          animate={
            still
              ? undefined
              : {
                  x: xs.map((v) => `${v}vw`),
                  y: ys.map((v) => `${v}vh`),
                  scale: [1, 1.08, 0.96, 1],
                }
          }
          transition={loop(seconds)}
        />
      ))}
      {MARKS.map(([left, top, size, seconds]) => (
        <motion.span
          key={`${left}-${top}`}
          className="absolute font-display font-extrabold leading-none opacity-[0.14]"
          style={{ left: `${left}%`, top: `${top}%`, fontSize: size, color }}
          animate={still ? undefined : { y: [0, -16, 0], rotate: [-8, 8, -8] }}
          transition={loop(seconds)}
        >
          ?
        </motion.span>
      ))}
    </>
  );
}
