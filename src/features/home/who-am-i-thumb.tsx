/** The "?" from the 4Dare logo (Bricolage ExtraBold). */
const QUESTION =
  "M533 454L460 467Q453 443 456 426Q458 409 466 397Q474 384 485 375Q495 365 504 356Q514 346 519 335Q524 324 522 309L522 309Q518 289 505 282Q492 275 471 279L471 279Q459 281 445 287Q431 292 417 300Q403 308 391 318L391 318L373 241Q388 230 404 222Q420 214 437 208Q454 203 469 200L469 200Q495 196 517 198Q540 200 559 210Q579 220 592 238Q605 255 610 282L610 282Q614 306 609 323Q604 340 594 354Q584 367 572 379Q561 390 550 401Q540 412 535 425Q530 437 533 454L533 454M525 596L525 596Q495 602 478 592Q461 582 456 555L456 555Q452 528 464 513Q476 498 506 493L506 493Q537 487 554 497Q571 507 576 534L576 534Q585 586 525 596";

/** One of the others' cards, leaning out: a critter face on its pastel. */
function SideCard({
  x,
  tilt,
  color,
}: {
  x: number;
  tilt: number;
  color: string;
}) {
  return (
    <g transform={`rotate(${tilt} ${x + 20} 56)`}>
      <rect
        x={x}
        y={26}
        width={40}
        height={56}
        rx={6}
        className="fill-surface"
      />
      <rect x={x + 4} y={30} width={32} height={38} rx={4} fill={color} />
      <circle cx={x + 20} cy={56} r={10} fill="#a5b4fc" />
      <circle cx={x + 16} cy={52} r={2.6} fill="#fff" />
      <circle cx={x + 24} cy={52} r={2.6} fill="#fff" />
    </g>
  );
}

/**
 * The "Who am I?" thumbnail: two of the others' cards and yours, the "?" one,
 * in the middle. Built in a 160×100 box; it fills its box.
 */
export function WhoAmIThumb() {
  return (
    <svg
      aria-hidden="true"
      data-art-theme="light"
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <rect width={160} height={100} className="fill-sky-soft" />
      <SideCard x={10} tilt={-10} color="#fde2c8" />
      <SideCard x={110} tilt={10} color="#cdeee9" />
      <rect
        x={52}
        y={12}
        width={56}
        height={78}
        rx={8}
        className="fill-butter"
      />
      <path
        d={QUESTION}
        fill="#2b69c8"
        transform="translate(43 21) scale(0.075)"
      />
    </svg>
  );
}
