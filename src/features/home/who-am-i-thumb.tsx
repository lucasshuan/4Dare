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

const SIDE = { w: 44, h: 62 };
const YOU = { x: 52, y: 11, w: 56, h: 78 };

/** One of the others' cards: a critter on its pastel, a name bar under it. */
function SideCard({
  cx,
  cy,
  tilt,
  seed,
  color,
  shadow,
}: {
  cx: number;
  cy: number;
  tilt: number;
  seed: string;
  color: string;
  shadow: string;
}) {
  const x = cx - SIDE.w / 2;
  const y = cy - SIDE.h / 2;
  return (
    <g transform={`rotate(${tilt} ${cx} ${cy})`}>
      <rect
        x={x}
        y={y}
        width={SIDE.w}
        height={SIDE.h}
        rx={7}
        filter={`url(#${shadow})`}
        className="fill-surface"
      />
      <rect
        x={x + 4}
        y={y + 4}
        width={SIDE.w - 8}
        height={45}
        rx={5}
        fill={color}
      />
      <image
        href={critterUri(seed, color)}
        x={x + 4}
        y={y + 6}
        width={SIDE.w - 8}
        height={43}
        preserveAspectRatio="xMidYMid meet"
      />
      <rect
        x={x + 6}
        y={y + 53}
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
 * so it stays crisp from 38×24 up; at the smallest size it zooms in on your card.
 */
export function WhoAmIThumb() {
  const shadow = `who-am-i-thumb-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <div
      aria-hidden="true"
      className="@container relative size-full overflow-hidden bg-sky-soft"
      style={{
        backgroundImage:
          "radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--surface) 55%, transparent), transparent 55%), radial-gradient(circle at 92% 105%, color-mix(in srgb, var(--butter) 50%, transparent), transparent 60%)",
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 160 100"
        className="absolute inset-0 size-full @max-[50px]:scale-[1.18]"
      >
        <defs>
          <filter id={shadow} x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow
              dx="0"
              dy="2.5"
              stdDeviation="2.5"
              floodColor="#000"
              floodOpacity="0.22"
            />
          </filter>
        </defs>

        {/* faint marks drifting behind, once there is room for them */}
        <g className="hidden opacity-20 @min-[80px]:inline">
          <Mark cx={14} cy={24} h={18} className="fill-apricot" />
          <Mark cx={148} cy={22} h={14} className="fill-yes" />
        </g>

        <SideCard
          cx={44}
          cy={55}
          tilt={-13}
          seed="dare-left"
          color="#F3D3B8"
          shadow={shadow}
        />
        <SideCard
          cx={116}
          cy={55}
          tilt={13}
          seed="dare-right"
          color="#BFE6C8"
          shadow={shadow}
        />

        {/* yours: the "?", cut out of the others by a ring of the background */}
        <rect
          {...{ x: YOU.x, y: YOU.y, width: YOU.w, height: YOU.h }}
          rx={9}
          strokeWidth={5}
          filter={`url(#${shadow})`}
          className="fill-surface stroke-sky-soft"
          paintOrder="stroke"
        />
        {/* your ring, as around your seat at the table: lighter as it grows */}
        <rect
          x={YOU.x + 1.25}
          y={YOU.y + 1.25}
          width={YOU.w - 2.5}
          height={YOU.h - 2.5}
          rx={7.75}
          className="fill-none stroke-3 stroke-sky @min-[80px]:stroke-2"
        />
        <Mark cx={80} cy={50} h={56} tilt={-8} className="fill-sky" />
      </svg>
    </div>
  );
}
