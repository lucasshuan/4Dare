"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { FigureArt } from "@/features/who-am-i/who-am-i-banner";
import { cn } from "@/lib/cn";
import type { Figure } from "@/lib/figures";
import { useStepLoop } from "@/lib/hooks/use-step-loop";

/** The team bought at auction, left to right: figure, price, left edge (% of the board) and tilt. */
const TEAM: { figure: Figure; price: number; x: number; tilt: number }[] = [
  { figure: "fox", price: 5, x: 6, tilt: -5 },
  { figure: "robot", price: 1, x: 29, tilt: 4 },
  { figure: "pirate", price: 3, x: 52, tilt: -3 },
  { figure: "witch", price: 1, x: 75, tilt: 5 },
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
}: {
  className?: string;
  still?: boolean;
}) {
  const t = useTranslations("home.games.whatFor");
  const reduced = useReducedMotion() ?? false;
  const still = forceStill || reduced;
  const { step, loop } = useStepLoop(STEPS, STILL, still);
  const s = STEPS[step];
  const spent = TEAM.slice(0, s.team).reduce((a, c) => a + c.price, 0);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative isolate aspect-16/10 overflow-hidden rounded-lg art-lineup [container-type:size]",
        className,
      )}
    >
      <span className="absolute -top-10 -left-8 size-40 rounded-pill bg-white/15 blur-2xl" />

      {/* the board, in its frame */}
      <div className="absolute inset-x-[6%] top-[12%] bottom-[10%] rounded-[3cqh] bg-wood p-[2.4cqh] shadow-card">
        <div className="relative size-full overflow-hidden rounded-[1.6cqh] bg-board">
          <span className="absolute top-[9%] left-[5%] h-[2.6cqh] w-[34%] rounded-pill bg-chalk/80" />
          <span className="absolute inset-[5%] rounded-[1cqh] border border-chalk/20" />
          {TEAM.map((c, i) => (
            <AnimatePresence key={c.figure}>
              {i < s.team ? (
                <m.div
                  key={`${c.figure}-${loop}`}
                  className="absolute top-[26%] w-[19%]"
                  style={{ left: `${c.x}%` }}
                  initial={
                    still ? false : { opacity: 0, scale: 1.6, y: "-30%" }
                  }
                  animate={{ opacity: 1, scale: 1, y: "0%", rotate: c.tilt }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 380, damping: 24 }}
                >
                  <div className="relative bg-white p-[6%] shadow-card">
                    <FigureArt figure={c.figure} className="aspect-4/5" />
                    <span className="-translate-x-1/2 absolute -top-[5%] left-1/2 h-[9%] w-[44%] bg-butter/85" />
                    <span className="absolute -right-[14%] -bottom-[8%] rounded-[0.8cqh] bg-kraft px-[1.4cqh] font-bold font-mono text-[6cqh] text-kraft-ink leading-[1.3]">
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
      <div className="absolute top-[3%] left-[7%] flex items-center gap-[1cqh] rounded-pill bg-surface px-[2cqh] py-[0.6cqh] font-bold font-mono text-[6.5cqh] text-ink shadow-card">
        <Coin className="h-[4cqh] w-[8cqh]" />
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
            className="absolute right-[6%] bottom-[8%] w-[46%] origin-bottom-right"
            initial={still ? false : { opacity: 0, y: "-60%", rotate: 18 }}
            animate={{ opacity: 1, y: "0%", rotate: -4 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="relative rounded-[1.4cqh] bg-kraft px-[3cqh] pt-[2.4cqh] pb-[3cqh] shadow-pop">
              <span className="block font-bold font-display text-[5.5cqh] text-kraft-ink/70 uppercase tracking-[0.04em]">
                {t("banner.what")}
              </span>
              <span className="block font-bold font-display text-[8cqh] text-kraft-ink leading-[1.1] [text-wrap:balance]">
                {t("demoLine")}
              </span>
              <span className="-top-[7cqh] absolute right-[8%] grid size-[11cqh] place-items-center rounded-pill bg-wax font-black text-[6cqh] text-white shadow-card">
                ?
              </span>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
