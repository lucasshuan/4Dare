"use client";

import { useId } from "react";
import { critterUri } from "@/components/ui/critter";

/** A card is drawn around its centre; the pastel window holds the critter. */
const CARD = { w: 40, h: 56 };
const WINDOW = { x: -16, y: -24, w: 32, h: 40, r: 5 };

function Card({
  cx,
  cy,
  tilt,
  seed,
  color,
  ids,
  odd = false,
}: {
  cx: number;
  cy: number;
  tilt: number;
  seed: string;
  color: string;
  ids: { shadow: string; window: string };
  odd?: boolean;
}) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${tilt})`}>
      <rect
        x={-CARD.w / 2}
        y={-CARD.h / 2}
        width={CARD.w}
        height={CARD.h}
        rx={7}
        filter={`url(#${ids.shadow})`}
        className={odd ? "fill-surface stroke-no" : "fill-surface"}
        strokeWidth={odd ? 3 : 0}
        paintOrder="stroke"
      />
      <rect
        x={WINDOW.x}
        y={WINDOW.y}
        width={WINDOW.w}
        height={WINDOW.h}
        rx={WINDOW.r}
        fill={color}
      />
      <image
        href={critterUri(seed, color)}
        x={WINDOW.x + 2}
        y={WINDOW.y + 6}
        width={WINDOW.w - 4}
        height={WINDOW.w - 4}
        clipPath={`url(#${ids.window})`}
      />
      <rect
        x={-CARD.w / 2 + 5}
        y={CARD.h / 2 - 7.5}
        width={20}
        height={3}
        rx={1.5}
        className="fill-line"
      />
    </g>
  );
}

/**
 * The Impostor thumbnail as an emblem: a row of cards with the same
 * character, and one with another, raised and ringed. Built in a 160×100
 * box, so it stays crisp from 38×24 up (small, only the middle three).
 * Still; it fills its box.
 */
export function ImpostorThumb() {
  const id = `impostor-thumb-${useId().replace(/[^\w-]/g, "")}`;
  const ids = { shadow: `${id}-shadow`, window: `${id}-window` };
  const crew = { seed: "dare-crew", color: "#BFE3EA", ids };
  return (
    <div
      aria-hidden="true"
      className="@container relative size-full overflow-hidden bg-no-soft"
      style={{
        backgroundImage:
          "radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--surface) 55%, transparent), transparent 55%), radial-gradient(circle at 92% 105%, color-mix(in srgb, var(--butter) 45%, transparent), transparent 60%)",
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 160 100"
        className="absolute inset-0 size-full @max-[50px]:scale-[1.15]"
      >
        <defs>
          <filter id={ids.shadow} x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow
              dx="0"
              dy="2.5"
              stdDeviation="2.5"
              floodColor="#000"
              floodOpacity="0.22"
            />
          </filter>
          <clipPath id={ids.window}>
            <rect
              x={WINDOW.x}
              y={WINDOW.y}
              width={WINDOW.w}
              height={WINDOW.h}
              rx={WINDOW.r}
            />
          </clipPath>
        </defs>
        <g className="hidden @min-[60px]:inline">
          <Card cx={24} cy={60} tilt={-10} {...crew} />
          <Card cx={136} cy={60} tilt={10} {...crew} />
        </g>
        <Card cx={56} cy={58} tilt={-4} {...crew} />
        <Card cx={104} cy={58} tilt={4} {...crew} />
        <Card
          cx={80}
          cy={48}
          tilt={0}
          seed="dare-odd"
          color="#F4C7D9"
          ids={ids}
          odd
        />
      </svg>
    </div>
  );
}
