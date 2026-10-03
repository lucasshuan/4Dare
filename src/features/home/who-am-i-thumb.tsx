"use client";

import { useId } from "react";
import { critterUri } from "@/components/ui/critter";

/** The "?" from the 4Dare logo (Bricolage ExtraBold); its box is centred on 491,399 and 406 units tall. */
const QUESTION =
  "M533 454L460 467Q453 443 456 426Q458 409 466 397Q474 384 485 375Q495 365 504 356Q514 346 519 335Q524 324 522 309L522 309Q518 289 505 282Q492 275 471 279L471 279Q459 281 445 287Q431 292 417 300Q403 308 391 318L391 318L373 241Q388 230 404 222Q420 214 437 208Q454 203 469 200L469 200Q495 196 517 198Q540 200 559 210Q579 220 592 238Q605 255 610 282L610 282Q614 306 609 323Q604 340 594 354Q584 367 572 379Q561 390 550 401Q540 412 535 425Q530 437 533 454L533 454M525 596L525 596Q495 602 478 592Q461 582 456 555L456 555Q452 528 464 513Q476 498 506 493L506 493Q537 487 554 497Q571 507 576 534L576 534Q585 586 525 596";

/** The "?" glyph, `h` units tall, centred on cx,cy and leaning by `tilt` degrees. */
function Mark({
  cx,
  cy,
  h,
  tilt = 0,
  className,
}: {
  cx: number;
  cy: number;
  h: number;
  tilt?: number;
  className?: string;
}) {
  const k = h / 406;
  return (
    <path
      d={QUESTION}
      className={className}
      transform={`rotate(${tilt} ${cx} ${cy}) translate(${cx - 491 * k} ${cy - 399 * k}) scale(${k})`}
    />
  );
}

/** The others' cards are drawn around their centre; the pastel window holds the critter. */
const SIDE = { w: 44, h: 62 };
const WINDOW = { x: -18, y: -27, w: 36, h: 45, r: 5 };
const YOU = { x: 52, y: 11, w: 56, h: 78 };

/** A rounded rect whose bottom-left corner is tighter: a speech bubble. */
const bubble = (
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  s: number,
) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + s}A${s} ${s} 0 0 1 ${x} ${y + h - s}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

/**
 * One of the others' cards: a critter on its pastel, a name bar under it.
 * `zoom` draws the critter bigger, nudged by `shift` away from your card so
 * its face stays clear of it.
 */
function SideCard({
  cx,
  cy,
  tilt,
  seed,
  color,
  ids,
  zoom = 1,
  shift = 0,
}: {
  cx: number;
  cy: number;
  tilt: number;
  seed: string;
  color: string;
  ids: { shadow: string; window: string };
  zoom?: number;
  shift?: number;
}) {
  // the critter is square; zoomed, it stands on the window's bottom edge (its body runs off the image)
  const size = WINDOW.w * zoom;
  const top = zoom > 1 ? WINDOW.y + WINDOW.h - size : WINDOW.y + 5.5;
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${tilt})`}>
      <rect
        x={-SIDE.w / 2}
        y={-SIDE.h / 2}
        width={SIDE.w}
        height={SIDE.h}
        rx={7}
        filter={`url(#${ids.shadow})`}
        className="fill-surface"
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
        x={shift - size / 2}
        y={top}
        width={size}
        height={size}
        clipPath={`url(#${ids.window})`}
      />
      <rect
        x={-SIDE.w / 2 + 6}
        y={-SIDE.h / 2 + 53}
        width={22}
        height={3.5}
        rx={1.75}
        className="fill-line"
      />
    </g>
  );
}

/**
 * The "Who am I?" thumbnail as an emblem: a hand of three cards, the others'
 * critters fanned behind and yours in front, a big "?". Built in a 160×100 box,
 * so it stays crisp from 38×24 up: at the smallest size it zooms in on your
 * card; from 80px wide the fan opens and the card art's question and "yes" join.
 * Still; it fills its box.
 */
export function WhoAmIThumb() {
  const id = `who-am-i-thumb-${useId().replace(/[^\w-]/g, "")}`;
  const ids = { shadow: `${id}-shadow`, window: `${id}-window` };
  return (
    <div
      aria-hidden="true"
      className="@container relative size-full overflow-hidden bg-sky-soft [--glow:50%] dark:[--glow:30%]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--surface) 55%, transparent), transparent 55%), radial-gradient(circle at 92% 105%, color-mix(in srgb, var(--butter) var(--glow), transparent), transparent 60%)",
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 160 100"
        className="absolute inset-0 size-full @max-[50px]:scale-[1.08]"
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

        {/* the others' cards: tucked behind yours while small… */}
        <g className="@min-[80px]:hidden">
          <SideCard
            cx={41}
            cy={55}
            tilt={-13}
            seed="dare-left"
            color="#F3D3B8"
            ids={ids}
          />
          <SideCard
            cx={119}
            cy={55}
            tilt={13}
            seed="dare-right"
            color="#BFE6C8"
            ids={ids}
          />
        </g>
        {/* …fanned wider from 80px, their critters bigger and clear of yours */}
        <g className="hidden @min-[80px]:inline">
          <SideCard
            cx={40}
            cy={61}
            tilt={-15}
            seed="dare-left"
            color="#F3D3B8"
            ids={ids}
            zoom={4 / 3}
            shift={-3}
          />
          <SideCard
            cx={120}
            cy={61}
            tilt={15}
            seed="dare-right"
            color="#BFE6C8"
            ids={ids}
            zoom={4 / 3}
            shift={3}
          />
          {/* the question… */}
          <path
            d={bubble(8, 6.5, 38, 16, 5, 1.5)}
            strokeWidth={1.2}
            filter={`url(#${ids.shadow})`}
            className="fill-surface dark:stroke-sky/35"
          />
          <rect
            x={12.5}
            y={13}
            width={18.5}
            height={3}
            rx={1.5}
            className="fill-ink/70"
          />
          <Mark cx={38.5} cy={14.5} h={11} className="fill-ink" />
          {/* …and its answer: yes */}
          <rect
            x={125}
            y={7}
            width={27}
            height={15}
            rx={7.5}
            filter={`url(#${ids.shadow})`}
            className="fill-yes"
          />
          <path
            d="M135.1 14.9 137.5 17.2 141.9 12.2"
            fill="none"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-on-yes"
          />
        </g>

        {/* yours: the "?", cut out of the others by a ring of the background */}
        <rect
          {...{ x: YOU.x, y: YOU.y, width: YOU.w, height: YOU.h }}
          rx={9}
          strokeWidth={5}
          filter={`url(#${ids.shadow})`}
          className="fill-surface stroke-sky-soft"
          paintOrder="stroke"
        />
        {/* your ring, as around your seat at the table: 4 units is still 1px at 38px wide; softer in light once big */}
        <rect
          x={YOU.x + 1.25}
          y={YOU.y + 1.25}
          width={YOU.w - 2.5}
          height={YOU.h - 2.5}
          rx={7.75}
          className="fill-none stroke-3 stroke-sky @max-[50px]:stroke-4 @min-[80px]:stroke-2 @min-[80px]:stroke-sky/60 @min-[80px]:dark:stroke-sky"
        />
        <Mark cx={80} cy={50} h={56} tilt={-8} className="fill-sky" />
      </svg>
    </div>
  );
}
