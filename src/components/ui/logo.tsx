import { cn } from "@/lib/cn";

// The 4Dare logo, drawn from Bricolage Grotesque ExtraBold. The 4 is a speech
// bubble: its leg is the bubble's tail and a "?" sits inside, then "Dare" in four
// colours, each letter a little tilted. Brand blue and butter stay the same in
// both themes; the letters follow the theme. Static copies live in public/brand.

export const FOUR =
  "M525 0L640 0Q700 0 700 60L700 489Q700 505 716 505L776 505Q820 505 820 549L820 611Q820 655 776 655L716 655Q700 655 688 665L511 809Q485 830 493 797L521 671Q525 655 509 655L70 655Q0 655 0 585L0 545Q0 465 61 414Q254 254 427 46Q465 0 525 0Z";
export const QUESTION =
  "M533 454L460 467Q453 443 456 426Q458 409 466 397Q474 384 485 375Q495 365 504 356Q514 346 519 335Q524 324 522 309L522 309Q518 289 505 282Q492 275 471 279L471 279Q459 281 445 287Q431 292 417 300Q403 308 391 318L391 318L373 241Q388 230 404 222Q420 214 437 208Q454 203 469 200L469 200Q495 196 517 198Q540 200 559 210Q579 220 592 238Q605 255 610 282L610 282Q614 306 609 323Q604 340 594 354Q584 367 572 379Q561 390 550 401Q540 412 535 425Q530 437 533 454L533 454M525 596L525 596Q495 602 478 592Q461 582 456 555L456 555Q452 528 464 513Q476 498 506 493L506 493Q537 487 554 497Q571 507 576 534L576 534Q585 586 525 596";
const LETTERS = [
  [
    "M1185 660L1009 672L1001 556L1172 544Q1219 540 1249 518Q1279 496 1292 456Q1305 415 1301 356L1301 356Q1297 308 1285 275Q1273 242 1252 221Q1231 200 1200 192Q1169 183 1129 186L1129 186L976 197L967 80L1115 69Q1226 62 1298 92Q1371 122 1408 185Q1445 248 1451 338L1451 338Q1456 408 1443 461Q1430 513 1403 550Q1377 586 1341 610Q1306 634 1265 645Q1225 657 1185 660L1185 660M1086 667L941 677L900 85L1045 74L1086 667",
    "var(--apricot)",
  ],
  [
    "M1627 663L1627 663Q1587 659 1558 641Q1529 623 1515 591Q1500 559 1504 516L1504 516Q1508 476 1526 451Q1544 426 1575 413Q1606 400 1649 393Q1693 387 1747 383L1747 383Q1773 381 1791 378Q1809 376 1819 368Q1829 360 1830 343L1830 343Q1832 320 1817 303Q1803 285 1767 282L1767 282Q1742 280 1721 287Q1700 294 1684 310Q1668 326 1659 349L1659 349L1535 300Q1550 264 1573 238Q1597 212 1628 196Q1659 180 1698 175Q1737 170 1780 174L1780 174Q1852 180 1895 207Q1938 234 1956 284Q1974 333 1967 409L1967 409L1961 481Q1958 514 1956 547Q1955 579 1954 612Q1954 645 1954 679L1954 679L1827 668Q1825 647 1824 617Q1823 588 1824 557L1824 557L1807 556Q1791 589 1765 615Q1739 641 1704 654Q1669 666 1627 663M1701 566L1701 566Q1717 568 1734 563Q1752 559 1768 550Q1784 541 1798 527Q1812 513 1819 495L1819 495L1824 424L1843 430Q1825 440 1804 444Q1783 449 1761 450Q1740 452 1720 454Q1699 457 1683 462Q1667 466 1657 476Q1647 486 1645 505L1645 505Q1643 530 1659 547Q1674 564 1701 566",
    "var(--yes)",
  ],
  [
    "M2190 660L2045 667L2033 447L2020 193L2138 186L2149 347L2167 346Q2170 283 2186 245Q2202 207 2233 188Q2265 169 2314 166L2314 166Q2321 166 2330 166Q2339 166 2351 167L2351 167L2354 322Q2339 316 2322 314Q2305 313 2293 314L2293 314Q2258 315 2233 330Q2208 345 2195 374Q2181 402 2179 445L2179 445L2190 660",
    "var(--no)",
  ],
  [
    "M2624 673L2624 673Q2565 667 2520 646Q2475 625 2446 592Q2416 558 2404 511Q2392 465 2398 406L2398 406Q2404 350 2425 304Q2447 259 2481 227Q2516 196 2563 182Q2610 168 2667 174L2667 174Q2724 180 2765 203Q2807 226 2831 265Q2856 303 2864 356Q2872 409 2860 475L2860 475L2490 439L2498 364L2786 391L2731 421Q2742 377 2734 347Q2725 318 2704 302Q2683 287 2657 284L2657 284Q2626 281 2600 296Q2575 310 2558 341Q2541 372 2536 418L2536 418Q2528 492 2557 528Q2585 565 2634 570L2634 570Q2658 572 2675 567Q2692 562 2703 553Q2715 544 2722 532Q2729 520 2734 509L2734 509L2856 549Q2846 581 2827 606Q2809 631 2780 648Q2752 665 2713 672Q2675 678 2624 673",
    "var(--sky)",
  ],
] as const;

export const BRAND = { blue: "#2B69C8", butter: "#F6E3A1" } as const;

/** The 4 bubble and its "?"; when a parent `group` is hovered the bubble tilts and the "?" leans the other way. */
function Mark() {
  return (
    <g className="origin-bottom-left transition-transform duration-300 ease-soft [transform-box:fill-box] group-hover:-rotate-6 group-focus-visible:-rotate-6">
      <path fill={BRAND.blue} d={FOUR} />
      <path
        fill={BRAND.butter}
        d={QUESTION}
        className="origin-center transition-transform delay-75 duration-500 ease-soft [transform-box:fill-box] group-hover:rotate-12 group-focus-visible:rotate-12"
      />
    </g>
  );
}

/**
 * The 4 bubble alone, still (no hover tilt), in any two colours: the match's
 * draw turns it into an urn (butter bubble, blue "?"). The "?" path carries
 * `data-q` and turns around its own centre, so a scene can shake it inside.
 * Decorative: size it with `className`.
 */
export function LogoMark({
  bubble = BRAND.blue,
  mark = BRAND.butter,
  className,
}: {
  bubble?: string;
  mark?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="-10 -10 840 850"
      aria-hidden="true"
      className={cn("block overflow-visible", className)}
    >
      <path fill={bubble} d={FOUR} />
      <path
        data-q=""
        fill={mark}
        d={QUESTION}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
    </svg>
  );
}

/** Full logo. Size it by height (`h-9 w-auto`); it shrinks to fit a narrower parent. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-4 -4 2880 838"
      role="img"
      aria-label="4Dare"
      className={cn("max-w-full overflow-visible", className)}
    >
      <Mark />
      {LETTERS.map(([d, fill]) => (
        <path key={fill} fill={fill} d={d} />
      ))}
    </svg>
  );
}
