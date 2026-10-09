"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { FigureArt } from "@/components/ui/figure-art";
import { cn } from "@/lib/cn";
import type { Figure } from "@/lib/figures";
import { useShuffle } from "@/lib/hooks/use-shuffle";
import { useStepLoop } from "@/lib/hooks/use-step-loop";

/** The team bought at auction, in a new order every loop. */
const TEAM: Figure[] = ["fox", "robot", "pirate", "witch"];
/** Where the photos land, left to right: price, left and top edges (% of the board) and tilt. */
const SLOTS: { price: number; x: number; y: number; tilt: number }[] = [
  { price: 5, x: 6, y: 24, tilt: -5 },
  { price: 1, x: 29, y: 28, tilt: 4 },
  { price: 3, x: 52, y: 23, tilt: -3 },
  { price: 1, x: 75, y: 27, tilt: 5 },
];
const COINS = 10;

/**
 * One loop: the empty board, the photos taped on one by one as the coins run
 * out, then the envelope drops and opens on the mission.
 */
const STEPS: { ms: number; team: number; open?: boolean }[] = [
  { ms: 700, team: 0 },
  { ms: 520, team: 1 },
  { ms: 520, team: 2 },
  { ms: 520, team: 3 },
  { ms: 900, team: 4 },
  { ms: 2600, team: 4, open: true },
  { ms: 500, team: 0 },
];
/** The frame shown when still: the whole team and the open envelope. */
const STILL = 5;

/** The coin seen from the side, the same drawing as on the auction table. */
function Coin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 15" aria-hidden="true" className={className}>
      <path d="M1 4.2V10.6A23 3.6 0 0 0 47 10.6V4.2Z" fill="var(--gold-deep)" />
      <ellipse cx={24} cy={4.2} rx={23} ry={3.6} fill="var(--gold)" />
      <ellipse
        cx={24}
        cy={4.2}
        rx={17.5}
        ry={2.2}
        fill="none"
        stroke="var(--gold-deep)"
        strokeWidth={0.8}
      />
    </svg>
  );
}

/**
 * What for?'s card art: a board in its wood frame; the photos land one by one
 * with their price tags while the purse empties, then the sealed envelope
 * drops and opens on the mission. Still (envelope open) for reduced motion,
 * or with `still`.
 */
export function LineupSnapshot({
  className,
  still: forceStill = false,
  wide = false,
}: {
  className?: string;
  still?: boolean;
  /** Laid out for a 2:1 strip (the lobby's game panel): the board left, the envelope beside it. */
  wide?: boolean;
}) {
  const t = useTranslations("home.games.whatFor");
  const reduced = useReducedMotion() ?? false;
  const still = forceStill || reduced;
  const { step, loop } = useStepLoop(STEPS, STILL, still);
  const s = STEPS[step];
  // the missions in a random order, a new one each loop; the team in a
  // random order too, turned by one each loop
  const lines = t.raw("demoLines") as string[];
  const lineOrder = useShuffle(lines.length);
  const line = lines[lineOrder[loop % lines.length]];
  const teamOrder = useShuffle(TEAM.length);
  const spent = SLOTS.slice(0, s.team).reduce((a, c) => a + c.price, 0);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative isolate overflow-hidden art-lineup [container-type:size]",
        !wide && "aspect-square",
        className,
      )}
    >
      <span className="absolute -top-10 -left-8 size-40 rounded-pill bg-white/15 blur-2xl dark:hidden" />

      {/* the board, in its frame */}
      <div
        className={cn(
          "absolute bg-wood shadow-card",
          wide
            ? "top-[17%] right-[40%] bottom-[8%] left-[4%] rounded-[5cqh] p-[4cqh]"
            : "inset-x-[6%] top-[13%] bottom-[29%] rounded-[3.4cqh] p-[2.6cqh]",
        )}
      >
        <div
          className={cn(
            "relative size-full overflow-hidden bg-board",
            wide ? "rounded-[3cqh]" : "rounded-[2cqh]",
          )}
        >
          <span className="absolute top-[9%] left-[5%] h-[1.6cqh] w-[34%] rounded-pill bg-chalk/80" />
          <span className="absolute inset-[5%] rounded-[1.4cqh] border border-chalk/20" />
          {SLOTS.map((c, i) => (
            <AnimatePresence key={c.x}>
              {i < s.team ? (
                <m.div
                  key={`${c.x}-${loop}`}
                  className={cn("absolute", wide ? "w-[21%]" : "w-[19%]")}
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  initial={
                    still ? false : { opacity: 0, scale: 1.6, y: "-30%" }
                  }
                  animate={{ opacity: 1, scale: 1, y: "0%", rotate: c.tilt }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 380, damping: 24 }}
                >
                  <div className="relative bg-white p-[6%] shadow-card">
                    <FigureArt
                      figure={TEAM[teamOrder[(i + loop) % TEAM.length]]}
                      className="aspect-4/5"
                    />
                    <span className="-translate-x-1/2 absolute -top-[5%] left-1/2 h-[9%] w-[44%] bg-butter/85" />
                    <span
                      className={cn(
                        "absolute -right-[14%] -bottom-[8%] bg-kraft font-bold font-mono text-kraft-ink leading-[1.3]",
                        wide
                          ? "rounded-[0.8cqh] px-[1.4cqh] text-[5.5cqh]"
                          : "rounded-[0.5cqh] px-[0.9cqh] text-[3.75cqh]",
                      )}
                    >
                      {c.price}
                    </span>
                  </div>
                </m.div>
              ) : null}
            </AnimatePresence>
          ))}
        </div>
      </div>

      {/* the purse emptying */}
      <div
        className={cn(
          "absolute flex items-center rounded-pill bg-surface font-bold font-mono text-ink shadow-card",
          wide
            ? "top-[4%] left-[4%] gap-[1cqh] px-[2.2cqh] py-[0.6cqh] text-[7cqh]"
            : "top-[3%] left-[7%] gap-[0.6cqh] px-[1.25cqh] py-[0.4cqh] text-[4cqh]",
        )}
      >
        <Coin
          className={wide ? "h-[4.5cqh] w-[9cqh]" : "h-[2.5cqh] w-[5cqh]"}
        />
        <m.span
          key={spent}
          initial={still ? false : { y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {COINS - spent}
        </m.span>
      </div>

      {/* the envelope drops and opens on the mission */}
      <AnimatePresence>
        {s.open ? (
          <m.div
            key={`envelope-${loop}`}
            className={cn(
              "absolute origin-bottom-right",
              wide
                ? "right-[3%] bottom-[10%] w-[35%]"
                : "right-[5%] bottom-[27%] w-[54%]",
            )}
            initial={still ? false : { opacity: 0, y: "-60%", rotate: 18 }}
            animate={{ opacity: 1, y: "0%", rotate: -4 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div
              className={cn(
                "relative bg-kraft shadow-pop",
                wide
                  ? "rounded-[1.4cqh] px-[5cqh] pt-[5cqh] pb-[5.5cqh]"
                  : "rounded-[0.9cqh] px-[4cqh] pt-[3.6cqh] pb-[4cqh]",
              )}
            >
              <span
                className={cn(
                  "block font-bold font-display text-kraft-ink/70 uppercase tracking-[0.04em]",
                  wide ? "text-[5.5cqh]" : "text-[3.6cqh]",
                )}
              >
                {t("banner.what")}
              </span>
              <span
                className={cn(
                  "block font-bold font-display text-kraft-ink leading-[1.1] [text-wrap:balance]",
                  wide ? "text-[8cqh]" : "text-[5.6cqh]",
                )}
              >
                {line}
              </span>
              <span
                className={cn(
                  "absolute right-[8%] grid place-items-center rounded-pill bg-wax font-black text-white shadow-card",
                  wide
                    ? "-top-[7cqh] size-[14cqh] text-[7cqh]"
                    : "-top-[5cqh] size-[9.5cqh] text-[4.5cqh]",
                )}
              >
                ?
              </span>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
