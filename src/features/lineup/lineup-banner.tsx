"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { Creature, FigureArt } from "@/components/ui/figure-art";
import { UNDER_TOPBAR } from "@/components/ui/screen";
import { cn } from "@/lib/cn";
import type { Figure } from "@/lib/figures";
import { useShuffle } from "@/lib/hooks/use-shuffle";
import { useStepLoop } from "@/lib/hooks/use-step-loop";
import { BoardShell, FitBoard } from "./board";

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
  { ms: 500, bids: {}, clear: true },
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
 * On the wall either side of the board, measured from its middle in the
 * banner's height (the board is 61 wide); phones keep one on each side.
 */
const SEATS: { seat: Seat; place: string; dna: string; color: string }[] = [
  {
    seat: "a",
    place: "left-[calc(50%_-_100cqh)] max-sm:hidden",
    dna: "Fox..Curious..0",
    color: "#F3D3B8",
  },
  {
    seat: "b",
    place: "left-[calc(50%_-_54cqh)] max-sm:left-[16%]",
    dna: "Frog..Happy..0",
    color: "#BFE6C8",
  },
  {
    seat: "c",
    place: "left-[calc(50%_+_54cqh)] max-sm:hidden",
    dna: "Penguin..Cozy..0",
    color: "#C9DDF6",
  },
  {
    seat: "d",
    place: "left-[calc(50%_+_100cqh)] max-sm:left-[84%]",
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
 * The board's slate takes the banner's colours (night-dark in the dark
 * theme): BoardShell reads these three.
 */
const SLATE_VARS = {
  "--board": "var(--art-lineup-slate)",
  "--board-hi": "var(--art-lineup-slate-hi)",
  "--board-deep": "var(--art-lineup-slate-deep)",
} as CSSProperties;

/**
 * Paper on the board, flat, and the same paper still in the hand, high above
 * it: the shadow grows soft and far as it lifts. Same shape, so it tweens.
 * In the board's own units (400 × 600), like everything on it.
 */
const FLAT = "0 3px 0 rgba(0,0,0,0.12), 0 14px 26px rgba(0,0,0,0.4)";
const LIFTED = "0 3px 0 rgba(0,0,0,0), 0 64px 72px rgba(0,0,0,0.26)";

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
        "absolute h-[40px] bg-butter/85 shadow-[0_2px_3px_rgba(0,0,0,0.15)]",
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
      className="-mt-[2cqh] block w-[14cqh]"
    >
      <path d="M1 4.2V10.6A23 3.6 0 0 0 47 10.6V4.2Z" fill="var(--gold-deep)" />
      <ellipse cx={24} cy={4.2} rx={23} ry={3.6} fill="var(--gold)" />
    </svg>
  );
}

/**
 * What for?'s page banner, on the kraft wall of its home card: the pitch
 * board, small and hovering, gets a photo taped on for auction while the
 * bidders on the wall raise their coin towers; "Sold!", the photo flies to
 * its buyer and the mission is stuck on in its place. Transforms, opacity
 * and shadows only; the still frame for reduced motion.
 */
export function LineupBanner() {
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
      aria-hidden="true"
      className={cn(
        "relative isolate select-none overflow-hidden pb-8 art-lineup",
        UNDER_TOPBAR,
      )}
    >
      {/* the wall's light and chalk marks */}
      <div className="-inset-10 -z-10 absolute">
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
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
        style={{
          background:
            "linear-gradient(in oklch to bottom, transparent, color-mix(in oklch, var(--art-lineup-2) 45%, var(--canvas)) 60%, var(--canvas))",
        }}
      />

      <div className="relative isolate mx-auto h-[clamp(180px,min(22vw,27vh),230px)] w-full max-w-[1040px] [container-type:size] max-sm:h-[210px]">
        {/* the pitch board, hovering slowly; what is stuck on it rides along */}
        <m.div
          className="-translate-x-1/2 absolute top-[4cqh] left-1/2 z-10 w-[61cqh]"
          style={SLATE_VARS}
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
          <FitBoard>
            <BoardShell />

            {/* the lot, taped on; a leaving lot and the next share one cell */}
            <div className="-translate-x-1/2 absolute top-[92px] left-1/2 grid">
              <AnimatePresence>
                {s.open || s.clear ? null : (
                  <m.div
                    key={`lot-${loop}`}
                    className="relative w-[262px] rounded-[8px] bg-white p-[12px] [grid-area:1/1]"
                    style={{ boxShadow: FLAT }}
                    initial={
                      reduced
                        ? false
                        : {
                            opacity: 0,
                            y: -150,
                            rotate: -14,
                            scale: 1.18,
                            boxShadow: LIFTED,
                          }
                    }
                    animate={{
                      opacity: 1,
                      y: 0,
                      rotate: -3,
                      scale: 1,
                      boxShadow: FLAT,
                    }}
                    exit={{
                      opacity: 0,
                      x: away * 420,
                      y: 260,
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
                      className="aspect-4/5 rounded-[4px]"
                    />
                    <Tape
                      className="-rotate-3 top-[-20px] left-[27%] w-[46%] origin-left"
                      delay={0.3}
                      reduced={reduced}
                    />
                    {/* the price, bumped up bid by bid */}
                    <m.span
                      key={top}
                      className="absolute -right-[26px] -bottom-[20px] rounded-[10px] bg-kraft px-[16px] font-bold font-mono text-[46px] text-kraft-ink leading-[1.3] shadow-card"
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
                          className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 whitespace-nowrap rounded-[12px] bg-wax px-[26px] py-[8px] font-display font-extrabold text-[60px] text-white uppercase shadow-pop"
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
                  className="-translate-x-1/2 absolute top-[132px] left-1/2 w-[520px] rounded-[16px] bg-kraft px-[44px] pt-[46px] pb-[50px] text-center"
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
                          y: -210,
                          rotate: 10,
                          scale: 1.12,
                          boxShadow: LIFTED,
                        }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                    rotate: -2.5,
                    scale: 1,
                    boxShadow: FLAT,
                  }}
                  exit={{
                    opacity: 0,
                    y: -40,
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
                    className="-left-[36px] -rotate-[28deg] top-[-4px] w-[124px] origin-right"
                    delay={0.6}
                    reduced={reduced}
                  />
                  <Tape
                    className="-right-[36px] top-[-4px] w-[124px] origin-left rotate-[28deg]"
                    delay={0.7}
                    reduced={reduced}
                  />
                  <span className="block font-bold font-display text-[38px] text-kraft-ink/70 uppercase tracking-[0.06em]">
                    {t("banner.what")}
                  </span>
                  <span className="block text-balance font-bold font-display text-[56px] text-kraft-ink leading-[1.12]">
                    {line}
                  </span>
                  {/* the seal, broken as it lands */}
                  <m.span
                    className="-translate-x-1/2 absolute top-[-38px] left-1/2 grid size-[76px] place-items-center rounded-pill bg-wax font-black text-[40px] text-white shadow-card"
                    initial={reduced ? false : { scale: 1 }}
                    animate={reduced ? { scale: 1 } : { scale: [1, 1.3, 0] }}
                    transition={{ delay: 0.75, duration: 0.4 }}
                  >
                    ?
                  </m.span>
                </m.div>
              ) : null}
            </AnimatePresence>
          </FitBoard>
        </m.div>

        {/* the bidders on the wall, each under the coins they put up */}
        {SEATS.map((p) => {
          const bid = s.bids[part(p.seat, cast)] ?? 0;
          const leads = bid > 0 && bid === top;
          return (
            <div
              key={p.seat}
              className={cn(
                "-translate-x-1/2 absolute bottom-[8%] flex flex-col items-center",
                p.place,
                s.open && "opacity-60 transition-opacity duration-500",
              )}
            >
              <div className="flex min-h-[30cqh] flex-col-reverse items-center pb-[1cqh]">
                <AnimatePresence>
                  {Array.from({ length: bid }, (_, k) => (
                    <m.span
                      // biome-ignore lint/suspicious/noArrayIndexKey: one per coin in the tower
                      key={k}
                      className="block"
                      initial={reduced ? false : { opacity: 0, y: -14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
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
                  className="size-[20cqh] rounded-pill"
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
