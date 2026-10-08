"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Creature, FigureArt } from "@/components/ui/figure-art";
import { UNDER_TOPBAR } from "@/components/ui/screen";
import { BannerRow, SCENE_WIDTH } from "@/features/home/banner-row";
import { cn } from "@/lib/cn";
import type { Figure } from "@/lib/figures";
import { useShuffle } from "@/lib/hooks/use-shuffle";
import { useStepLoop } from "@/lib/hooks/use-step-loop";

type Seat = "a" | "b" | "c" | "d";

/**
 * One loop of the banner, a lot in miniature: the photo goes on the board,
 * the coin towers rise bid by bid (the leader's glows), the hammer comes down
 * on "Sold!", the photo flies to its buyer and the mission nobody knew is
 * stuck on in its place. `ms` is how long each step stays.
 */
const STEPS: {
  ms: number;
  bids: Partial<Record<Seat, number>>;
  sold?: boolean;
  open?: boolean;
  /** The board cleared between loops: no lot, no mission. */
  clear?: boolean;
}[] = [
  { ms: 900, bids: {} },
  { ms: 650, bids: { b: 1 } },
  { ms: 650, bids: { b: 1, c: 2 } },
  { ms: 650, bids: { b: 3, c: 2 } },
  { ms: 900, bids: { b: 3, c: 2, d: 5 } },
  { ms: 1500, bids: { b: 3, c: 2, d: 5 }, sold: true },
  { ms: 3000, bids: { b: 3, c: 2, d: 5 }, sold: true, open: true },
  { ms: 700, bids: {}, clear: true },
];
/** The frame shown when motion is reduced: sold, and the mission up. */
const STILL = 6;

/** The lots up for auction, one a loop, in a random order that never repeats a lot back to back. */
const LOTS: Figure[] = ["fox", "robot", "pirate", "witch"];

/**
 * Who plays which part of STEPS in a loop: cast 0 to 3, its first bit swaps
 * the two seats phones keep (b opens, d buys), its second the two they hide.
 */
const PAIR: Record<Seat, Seat> = { a: "c", b: "d", c: "a", d: "b" };
const part = (seat: Seat, cast: number) =>
  cast & (seat === "b" || seat === "d" ? 1 : 2) ? PAIR[seat] : seat;

/**
 * Two on each side of the board, measured from its middle in the banner's
 * height (the board is 129 wide); phones keep one on each side.
 */
const SEATS: { seat: Seat; place: string; dna: string; color: string }[] = [
  {
    seat: "a",
    place: "left-[calc(50%_-_114cqh)] max-sm:hidden",
    dna: "Fox..Curious..0",
    color: "#F3D3B8",
  },
  {
    seat: "b",
    place: "left-[calc(50%_-_80cqh)] max-sm:left-[8%]",
    dna: "Frog..Happy..0",
    color: "#BFE6C8",
  },
  {
    seat: "c",
    place: "left-[calc(50%_+_80cqh)] max-sm:hidden",
    dna: "Penguin..Cozy..0",
    color: "#C9DDF6",
  },
  {
    seat: "d",
    place: "left-[calc(50%_+_114cqh)] max-sm:left-[92%]",
    dna: "Owl.Wizard...0",
    color: "#F2E3A8",
  },
];

/** Chalk marks drifting behind: [left %, top %, size px, seconds, glyph]. */
const MARKS: [number, number, number, number, string][] = [
  [4, 20, 26, 9, "?"],
  [17, 64, 20, 7.5, "✉"],
  [41, 6, 18, 8, "?"],
  [58, 70, 22, 9.5, "?"],
  [78, 10, 24, 8.5, "✉"],
  [95, 56, 20, 7, "?"],
];

/**
 * The game's pitch board lying on its side, in its slate's colour (night-dark
 * in the dark theme), lit from the top left as the standing board is.
 */
const SLATE =
  "radial-gradient(60% 40% at 25% 15%, rgba(255,255,255,0.07), transparent), radial-gradient(40% 30% at 80% 90%, rgba(255,255,255,0.05), transparent), linear-gradient(170deg, color-mix(in oklch, var(--art-lineup-slate), white 10%), var(--art-lineup-slate) 45%, color-mix(in oklch, var(--art-lineup-slate), black 32%))";

/**
 * Paper on the board, flat, and the same paper still in the hand, high above
 * it: the shadow grows soft and far as it lifts. Same shape, so it tweens.
 */
const FLAT = "0 1px 0 rgba(0,0,0,0.12), 0 6px 12px rgba(0,0,0,0.32)";
const LIFTED = "0 1px 0 rgba(0,0,0,0), 0 26px 30px rgba(0,0,0,0.22)";

/** The chalk lines of a pitch seen side on, faint on the slate. */
function PitchLines() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 572 372"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <g
        fill="none"
        stroke="rgba(238,242,230,0.16)"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <rect x="14" y="14" width="544" height="344" rx="6" />
        <path d="M286 14v344" />
        <circle cx="286" cy="186" r="40" />
        <path d="M14 120h44v132H14M558 120h-44v132h44" />
      </g>
    </svg>
  );
}

/** A strip of tape pressed on from one end, a beat after the paper lands. */
function Tape({
  className,
  delay,
  reduced,
}: {
  className: string;
  delay: number;
  reduced: boolean;
}) {
  return (
    <m.span
      className={cn(
        "absolute h-[4.4cqh] bg-butter/85 shadow-[0_1px_2px_rgba(0,0,0,0.15)]",
        className,
      )}
      initial={reduced ? false : { scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ delay, duration: 0.22, ease: "easeOut" }}
    />
  );
}

/** The coin seen from the side, as on the auction table. */
function Coin() {
  return (
    <svg
      viewBox="0 0 48 15"
      aria-hidden="true"
      className="-mt-[1.6cqh] block w-[11cqh]"
    >
      <path d="M1 4.2V10.6A23 3.6 0 0 0 47 10.6V4.2Z" fill="var(--gold-deep)" />
      <ellipse cx={24} cy={4.2} rx={23} ry={3.6} fill="var(--gold)" />
    </svg>
  );
}

/**
 * What for?'s page banner, on the kraft wall of its home card: the pitch
 * board hovers between the bidders, a photo taped on it for auction while they
 * raise their coin towers; "Sold!", the photo flies to its buyer and the
 * mission is stuck on in its place. Transforms, opacity and shadows only;
 * the still frame for reduced motion.
 */
export function LineupBanner({ aside }: { aside: ReactNode }) {
  const t = useTranslations("home.games.whatFor");
  const reduced = useReducedMotion() ?? false;
  const { step, loop } = useStepLoop(STEPS, STILL, reduced);
  const s = STEPS[step];
  const top = Math.max(0, ...Object.values(s.bids));
  // the missions and the lots each in a random order, a new one each loop
  const lines = t.raw("banner.lines") as string[];
  const lineOrder = useShuffle(lines.length);
  const line = lines[lineOrder[loop % lines.length]];
  const lotOrder = useShuffle(LOTS.length);
  const lot = LOTS[lotOrder[loop % LOTS.length]];
  // the bidders too: each loop a different cast of who bids and who buys
  const castOrder = useShuffle(4);
  const cast = castOrder[loop % 4];
  // the sold photo flies off to the side its buyer sits on
  const buyer = SEATS.find((p) => part(p.seat, cast) === "d")?.seat;
  const away = buyer === "a" || buyer === "b" ? -1 : 1;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden art-lineup",
        UNDER_TOPBAR,
      )}
    >
      {/* the wall's light and chalk marks */}
      <div aria-hidden="true" className="-inset-10 -z-10 absolute select-none">
        <span className="absolute top-[-30%] left-[-5%] h-[90%] w-[45%] rounded-pill bg-white/10 blur-3xl dark:hidden" />
        <span className="absolute right-[-8%] bottom-[-40%] h-[90%] w-[50%] rounded-pill bg-gold/15 blur-3xl" />
        {MARKS.map(([left, top, size, seconds, glyph]) => (
          <m.span
            key={`${left}-${top}`}
            className="absolute font-display font-extrabold text-chalk leading-none opacity-[0.14]"
            style={{ left: `${left}%`, top: `${top}%`, fontSize: size }}
            {...(reduced
              ? {}
              : {
                  animate: { y: [0, -12, 0], rotate: [-8, 8, -8] },
                  transition: {
                    duration: seconds,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  },
                })}
          >
            {glyph}
          </m.span>
        ))}
      </div>

      {/* a chalk haze in the top left corner, where the logo sits; it fades
          out slowly so it reads as the wall's own light; none in the dark */}
      <span
        className="-z-10 pointer-events-none absolute top-0 left-0 h-[260px] w-[max(360px,42%)] dark:hidden"
        style={{
          background:
            "radial-gradient(farthest-side at 0 0, color-mix(in oklch, var(--chalk) 40%, transparent), color-mix(in oklch, var(--chalk) 26%, transparent) 22%, color-mix(in oklch, var(--chalk) 12%, transparent) 48%, color-mix(in oklch, var(--chalk) 3%, transparent) 76%, transparent)",
        }}
      />

      {/* melts into the page below through the ground's own hue */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-6"
        style={{
          background:
            "linear-gradient(in oklch to bottom, transparent, color-mix(in oklch, var(--art-lineup-2) 45%, var(--canvas)) 60%, var(--canvas))",
        }}
      />

      <BannerRow aside={aside}>
        <div
          aria-hidden="true"
          className={cn(
            "relative isolate h-[clamp(180px,min(22vw,27vh),230px)] select-none [container-type:size] max-sm:h-[210px]",
            SCENE_WIDTH,
          )}
        >
          {/* the pitch board, as tall as the banner allows, hovering slowly;
            what is stuck on it rides along */}
          <m.div
            className="-translate-x-1/2 absolute top-[2cqh] left-1/2 z-10 aspect-[3/2] w-[min(129cqh,74cqw)]"
            {...(reduced
              ? {}
              : {
                  animate: { y: [0, -7, 0], rotate: [-0.6, 0.6, -0.6] },
                  transition: {
                    duration: 6.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  },
                })}
          >
            {/* the frame and its slate, the standing board's own finish */}
            <div
              className="absolute inset-0 rounded-[3.4cqh] p-[2.8cqh]"
              style={{
                background:
                  "linear-gradient(150deg, var(--wood), var(--wood-deep))",
                boxShadow:
                  "inset 0 2px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.2), 0 14px 30px rgba(18,22,31,0.28)",
              }}
            >
              <div
                className="relative size-full overflow-hidden rounded-[2cqh]"
                style={{
                  background: SLATE,
                  boxShadow:
                    "inset 0 0 0 2px rgba(0,0,0,0.25), inset 0 5px 14px rgba(0,0,0,0.35)",
                }}
              >
                <PitchLines />
              </div>
            </div>

            {/* the lot, taped on in front; a leaving lot and the next share one cell */}
            <div className="-translate-x-1/2 absolute top-[14cqh] left-1/2 grid">
              <AnimatePresence>
                {s.open || s.clear ? null : (
                  <m.div
                    key={`lot-${loop}`}
                    className="relative w-[46cqh] rounded-[1cqh] bg-white p-[1.7cqh] [grid-area:1/1]"
                    style={{ boxShadow: FLAT }}
                    initial={
                      reduced
                        ? false
                        : {
                            opacity: 0,
                            y: "-45%",
                            rotate: -14,
                            scale: 1.18,
                            boxShadow: LIFTED,
                          }
                    }
                    animate={{
                      opacity: 1,
                      y: "0%",
                      rotate: -3,
                      scale: 1,
                      boxShadow: FLAT,
                    }}
                    exit={{
                      opacity: 0,
                      x: `${away * 130}%`,
                      y: "80%",
                      rotate: away * 30,
                      scale: 0.35,
                      boxShadow: LIFTED,
                      transition: { duration: 0.5, ease: [0.5, 0, 0.75, 0] },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 17,
                      opacity: { duration: 0.2 },
                      boxShadow: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                    }}
                  >
                    <FigureArt
                      figure={lot}
                      className="aspect-4/5 rounded-[0.6cqh]"
                    />
                    <Tape
                      className="-rotate-3 top-[-2.2cqh] left-[27%] w-[46%] origin-left"
                      delay={0.3}
                      reduced={reduced}
                    />
                    {/* the price, bumped up bid by bid */}
                    <m.span
                      key={top}
                      className="absolute -right-[3.6cqh] -bottom-[2.6cqh] rounded-[1.2cqh] bg-kraft px-[2.2cqh] font-bold font-mono text-[7.4cqh] text-kraft-ink leading-[1.3] shadow-card"
                      initial={
                        reduced || !top ? false : { scale: 1.4, rotate: -10 }
                      }
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 520,
                        damping: 14,
                      }}
                    >
                      {top || "–"}
                    </m.span>
                    <AnimatePresence>
                      {s.sold ? (
                        <m.span
                          key="sold"
                          initial={
                            reduced
                              ? { opacity: 0 }
                              : { opacity: 0, scale: 2.4, rotate: -18 }
                          }
                          animate={{ opacity: 1, scale: 1, rotate: -10 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.35,
                            ease: [0.34, 1.56, 0.64, 1],
                          }}
                          className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 whitespace-nowrap rounded-md bg-wax px-[3cqh] py-[1cqh] font-display font-extrabold text-[9cqh] text-white uppercase shadow-pop"
                        >
                          {t("banner.sold")}
                        </m.span>
                      ) : null}
                    </AnimatePresence>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            {/* the mission, stuck on in the lot's place once it's gone */}
            <AnimatePresence>
              {s.open ? (
                <m.div
                  key={`mission-${loop}`}
                  className="-translate-x-1/2 absolute top-[22cqh] left-1/2 w-[104cqh] rounded-[2cqh] bg-kraft px-[4.4cqh] pt-[5cqh] pb-[4.6cqh] text-center"
                  style={{
                    boxShadow: FLAT,
                    backgroundImage:
                      "linear-gradient(170deg, rgba(255,255,255,0.14), transparent 45%)",
                  }}
                  initial={
                    reduced
                      ? false
                      : {
                          opacity: 0,
                          y: "-60%",
                          rotate: 10,
                          scale: 1.12,
                          boxShadow: LIFTED,
                        }
                  }
                  animate={{
                    opacity: 1,
                    y: "0%",
                    rotate: -2.5,
                    scale: 1,
                    boxShadow: FLAT,
                  }}
                  exit={{
                    opacity: 0,
                    y: "-12%",
                    rotate: -7,
                    scale: 1.05,
                    boxShadow: LIFTED,
                    transition: { duration: 0.3 },
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 240,
                    damping: 18,
                    delay: reduced ? 0 : 0.2,
                    opacity: { duration: 0.2, delay: reduced ? 0 : 0.2 },
                    boxShadow: {
                      duration: 0.55,
                      delay: reduced ? 0 : 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  }}
                >
                  <Tape
                    className="-left-[5cqh] -rotate-[28deg] top-[-0.8cqh] w-[16cqh] origin-right"
                    delay={0.6}
                    reduced={reduced}
                  />
                  <Tape
                    className="-right-[5cqh] top-[-0.8cqh] w-[16cqh] origin-left rotate-[28deg]"
                    delay={0.7}
                    reduced={reduced}
                  />
                  <span className="block font-bold font-display text-[clamp(11px,4.8cqh,14px)] text-kraft-ink/70 uppercase tracking-[0.06em]">
                    {t("banner.what")}
                  </span>
                  <span className="block text-balance font-bold font-display text-[clamp(14px,7.6cqh,19px)] text-kraft-ink leading-[1.15]">
                    {line}
                  </span>
                  {/* the seal, broken as it lands */}
                  <m.span
                    className="-translate-x-1/2 absolute top-[-5cqh] left-1/2 grid size-[10cqh] place-items-center rounded-pill bg-wax font-black text-[5.4cqh] text-white shadow-card"
                    initial={reduced ? false : { scale: 1 }}
                    animate={reduced ? { scale: 1 } : { scale: [1, 1.3, 0] }}
                    transition={{ delay: 0.75, duration: 0.4 }}
                  >
                    ?
                  </m.span>
                </m.div>
              ) : null}
            </AnimatePresence>
          </m.div>

          {/* the bidders on the wall, each under the coins they put up */}
          {SEATS.map((p) => {
            const bid = s.bids[part(p.seat, cast)] ?? 0;
            const leads = bid > 0 && bid === top;
            return (
              <div
                key={p.seat}
                className={cn(
                  "-translate-x-1/2 absolute bottom-[12%] flex flex-col items-center transition-opacity duration-500",
                  p.place,
                  s.open && "opacity-60",
                )}
              >
                <div className="flex min-h-[26cqh] flex-col-reverse items-center pb-[1cqh]">
                  <AnimatePresence>
                    {Array.from({ length: bid }, (_, k) => (
                      <m.span
                        // biome-ignore lint/suspicious/noArrayIndexKey: one per coin in the tower
                        key={k}
                        className="block"
                        initial={reduced ? false : { opacity: 0, y: -14 }}
                        animate={{ opacity: 1, y: 0 }}
                        // the tower comes down from the top, coin by coin
                        exit={{
                          opacity: 0,
                          y: 6,
                          scale: 0.85,
                          transition: {
                            duration: 0.28,
                            ease: "easeIn",
                            delay: reduced ? 0 : (bid - 1 - k) * 0.04,
                          },
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 520,
                          damping: 22,
                          delay: reduced ? 0 : k * 0.05,
                        }}
                      >
                        <Coin />
                      </m.span>
                    ))}
                  </AnimatePresence>
                </div>
                <span
                  className={cn(
                    "block rounded-pill transition-shadow duration-300",
                    leads
                      ? "shadow-[0_0_0_3px_var(--gold),0_0_18px_var(--gold)]"
                      : "shadow-[0_0_0_3px_var(--wood),0_6px_14px_rgba(42,29,12,0.22)]",
                  )}
                >
                  <Creature
                    dna={p.dna}
                    color={p.color}
                    className="size-[16cqh] rounded-pill"
                  />
                </span>
              </div>
            );
          })}
        </div>
      </BannerRow>
    </div>
  );
}
