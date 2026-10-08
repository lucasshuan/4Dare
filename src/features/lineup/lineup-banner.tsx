"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Creature, FigureArt } from "@/components/ui/figure-art";
import { UNDER_TOPBAR } from "@/components/ui/screen";
import { cn } from "@/lib/cn";
import { useRandomStart } from "@/lib/hooks/use-random-start";
import { useStepLoop } from "@/lib/hooks/use-step-loop";

type Seat = "a" | "b" | "c" | "d";

/**
 * One loop of the banner, a lot in miniature: the photo goes on the table,
 * the coin towers rise bid by bid (the leader's glows), the hammer comes down
 * on "Sold!", and the sealed envelope drops and opens on the mission nobody
 * knew. `ms` is how long each step stays.
 */
const STEPS: {
  ms: number;
  bids: Partial<Record<Seat, number>>;
  sold?: boolean;
  open?: boolean;
  /** The table cleared between loops: no lot, no envelope. */
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
/** The frame shown when motion is reduced: sold, and the envelope open. */
const STILL = 6;

/** Around the lot, left to right; phones keep one on each side. */
const SEATS: { seat: Seat; place: string; dna: string; color: string }[] = [
  {
    seat: "a",
    place: "left-[20%] max-sm:hidden",
    dna: "Fox..Curious..0",
    color: "#F3D3B8",
  },
  {
    seat: "b",
    place: "left-[36%] max-sm:left-[16%]",
    dna: "Frog..Happy..0",
    color: "#BFE6C8",
  },
  {
    seat: "c",
    place: "left-[64%] max-sm:hidden",
    dna: "Penguin..Cozy..0",
    color: "#C9DDF6",
  },
  {
    seat: "d",
    place: "left-[80%] max-sm:left-[84%]",
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
 * What for?'s page banner, on the chalkboard: a lot on the table, the bidders' coin
 * towers, "Sold!", then the envelope with the mission. Transforms and
 * opacity only; the still frame for reduced motion.
 */
export function LineupBanner() {
  const t = useTranslations("home.games.whatFor");
  const reduced = useReducedMotion() ?? false;
  const { step, loop } = useStepLoop(STEPS, STILL, reduced);
  const s = STEPS[step];
  const top = Math.max(0, ...Object.values(s.bids));
  // a different mission each loop, from a random one
  const lines = t.raw("banner.lines") as string[];
  const first = useRandomStart(lines.length);
  const line = lines[(first + loop) % lines.length];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative isolate select-none overflow-hidden",
        UNDER_TOPBAR,
      )}
      style={{
        background:
          "linear-gradient(120deg, var(--board-hi), var(--board) 55%, var(--board-deep))",
      }}
    >
      {/* chalk light and marks */}
      <div className="-inset-10 -z-10 absolute">
        <span className="absolute top-[-30%] left-[-5%] h-[90%] w-[45%] rounded-pill bg-white/10 blur-3xl" />
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
          out slowly so it reads as the board's own light */}
      <span
        className="-z-10 pointer-events-none absolute top-0 left-0 h-[260px] w-[max(360px,42%)]"
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
            "linear-gradient(in oklch to bottom, transparent, color-mix(in oklch, var(--board) 45%, var(--canvas)) 60%, var(--canvas))",
        }}
      />

      <div className="relative isolate mx-auto h-[clamp(180px,min(22vw,27vh),230px)] w-full max-w-[1040px] [container-type:size] max-sm:h-[210px]">
        {/* the lot on the table, then sold; a leaving lot and the next share one cell */}
        <div className="-translate-x-1/2 absolute top-[5%] left-1/2 grid">
          <AnimatePresence>
            {s.open || s.clear ? null : (
              <m.div
                key={`lot-${loop}`}
                className="relative w-[40cqh] bg-white p-[1.6cqh] shadow-pop [grid-area:1/1]"
                initial={
                  reduced ? false : { opacity: 0, y: "-40%", rotate: -12 }
                }
                animate={{ opacity: 1, y: "0%", rotate: -3 }}
                exit={{
                  opacity: 0,
                  x: "60%",
                  y: "40%",
                  scale: 0.6,
                  transition: { duration: 0.35 },
                }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
              >
                <FigureArt figure="pirate" className="aspect-4/5" />
                <span className="-translate-x-1/2 absolute -top-[5%] left-1/2 h-[9%] w-[44%] bg-butter/85" />
                <span className="absolute -right-[12%] -bottom-[6%] rounded-[1cqh] bg-kraft px-[2cqh] font-bold font-mono text-[8cqh] text-kraft-ink leading-[1.3] shadow-card">
                  {top || "–"}
                </span>
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
                      className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 whitespace-nowrap rounded-md bg-wax px-[2.4cqh] py-[0.8cqh] font-display font-extrabold text-[8cqh] text-white uppercase shadow-pop"
                    >
                      {t("banner.sold")}
                    </m.span>
                  ) : null}
                </AnimatePresence>
              </m.div>
            )}
          </AnimatePresence>
        </div>

        {/* the envelope drops and opens on the mission */}
        <AnimatePresence>
          {s.open ? (
            <m.div
              key={`envelope-${loop}`}
              className="-translate-x-1/2 absolute top-[6%] left-1/2 w-[min(64cqh+20cqw,520px)] max-sm:w-[86%]"
              initial={reduced ? false : { opacity: 0, y: "-50%", rotate: 10 }}
              animate={{ opacity: 1, y: "0%", rotate: -2 }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 280, damping: 20 }}
            >
              <div className="relative rounded-[2cqh] bg-kraft px-[4cqh] pt-[3cqh] pb-[3.6cqh] text-center shadow-pop">
                <span className="block font-bold font-display text-[7cqh] text-kraft-ink/70 uppercase tracking-[0.06em]">
                  {t("banner.what")}
                </span>
                <span className="block text-balance font-bold font-display text-[clamp(16px,11cqh,26px)] text-kraft-ink leading-[1.15]">
                  {line}
                </span>
                <m.span
                  className="-top-[6cqh] absolute right-[8%] grid size-[13cqh] place-items-center rounded-pill bg-wax font-black text-[7cqh] text-white shadow-card"
                  initial={reduced ? false : { scale: 1 }}
                  animate={reduced ? { scale: 1 } : { scale: [1, 1.3, 0] }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  ?
                </m.span>
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>

        {/* the bidders, each under the coins they put up */}
        {SEATS.map((p) => {
          const bid = s.bids[p.seat] ?? 0;
          const leads = bid > 0 && bid === top;
          return (
            <div
              key={p.seat}
              className={cn(
                "-translate-x-1/2 absolute bottom-[4%] flex flex-col items-center",
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
                    : "shadow-[0_0_0_3px_var(--board)]",
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
