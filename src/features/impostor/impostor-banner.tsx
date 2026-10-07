"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { critterUri } from "@/components/ui/critter";
import { UNDER_TOPBAR } from "@/components/ui/screen";
import { cn } from "@/lib/cn";

/** Five seats at the table; the fourth holds the other card. */
const SEATS = [
  { seat: 0, x: 12, tilt: -10, answer: 9 },
  { seat: 1, x: 31, tilt: -4, answer: 8 },
  { seat: 2, x: 50, tilt: 0, answer: 9 },
  { seat: 3, x: 69, tilt: 4, answer: 4 },
  { seat: 4, x: 88, tilt: 10, answer: 8 },
];
const ODD = 3;
const CREW = { seed: "dare-crew", color: "#BFE3EA" };
const OTHER = { seed: "dare-odd", color: "#F4C7D9" };

/** The loop: cards down, cards up, the question, the answers, the vote, the stamp. */
const STEPS = [
  { ms: 1400, up: false },
  { ms: 1800, up: true },
  { ms: 1800, up: true, ask: "q" as const },
  { ms: 2400, up: true, ask: "q" as const, answers: true },
  { ms: 2200, up: true, ask: "vote" as const, answers: true },
  { ms: 2600, up: true, caught: true },
];
const STILL = 3;

const pop = {
  initial: { opacity: 0, scale: 0.85, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

function Face({ odd }: { odd: boolean }) {
  const c = odd ? OTHER : CREW;
  return (
    <div className="flex h-full flex-col gap-1 rounded-lg bg-surface p-1 shadow-card">
      <div
        className="aspect-4/5 overflow-hidden rounded-md"
        style={{ backgroundColor: c.color }}
      >
        {/* biome-ignore lint/performance/noImgElement: generated svg data uri */}
        <img src={critterUri(c.seed, c.color)} alt="" className="size-full" />
      </div>
    </div>
  );
}

/**
 * The Impostor page's banner: five cards turn over, all the same but one; a
 * question, everyone's answer over their card (one lands far from the
 * rest), the vote, and the odd one stamped. Still on the answers for
 * reduced motion.
 */
export function ImpostorBanner() {
  const t = useTranslations("home.games.impostor.banner");
  const reduced = useReducedMotion() ?? false;
  const [step, setStep] = useState(STILL);
  useEffect(() => {
    if (reduced) return setStep(STILL);
    let i = 0;
    let id: number;
    const next = () => {
      setStep(i);
      id = window.setTimeout(next, STEPS[i].ms);
      i = (i + 1) % STEPS.length;
    };
    next();
    return () => window.clearTimeout(id);
  }, [reduced]);
  const s = STEPS[step];
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative isolate select-none overflow-hidden bg-no-soft",
        UNDER_TOPBAR,
      )}
    >
      <span className="-z-10 absolute top-[-30%] left-[-5%] h-[90%] w-[45%] rounded-pill bg-surface/50 blur-3xl" />
      <span className="-z-10 absolute right-[-8%] bottom-[-40%] h-[90%] w-[50%] rounded-pill bg-butter/60 blur-3xl" />
      <div className="relative mx-auto h-[clamp(180px,min(22vw,27vh),230px)] w-full max-w-[1040px] max-sm:h-[210px]">
        <span className="-translate-x-1/2 absolute bottom-[-46%] left-1/2 h-[70%] w-[92%] rounded-[50%] bg-surface/45" />
        <div className="absolute inset-x-0 top-[1%] flex justify-center px-4">
          <AnimatePresence mode="wait">
            {s.caught ? (
              <m.div
                key="caught"
                {...pop}
                className="rounded-pill bg-no px-4 py-2 font-bold font-display text-[clamp(15px,2vw,20px)] text-on-no leading-tight shadow-card"
              >
                {t("caught")}
              </m.div>
            ) : s.ask ? (
              <m.div
                key={s.ask}
                {...pop}
                className={cn(
                  "max-w-[min(26rem,80%)] text-balance rounded-lg rounded-b-sm px-4 py-2 text-center font-bold font-display text-[clamp(15px,2vw,20px)] leading-tight shadow-card",
                  s.ask === "vote"
                    ? "bg-ink text-on-ink"
                    : "bg-surface text-ink",
                )}
              >
                {t(s.ask)}
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>
        {SEATS.map((p) => {
          const odd = p.seat === ODD;
          return (
            <div
              key={p.seat}
              className="-translate-x-1/2 absolute bottom-[3%] flex w-[clamp(56px,9vw,96px)] flex-col items-center gap-1.5"
              style={{ left: `${p.x}%` }}
            >
              <AnimatePresence>
                {s.answers ? (
                  <m.span
                    key="answer"
                    {...pop}
                    transition={{ delay: p.seat * 0.08 }}
                    className={cn(
                      "rounded-sm px-2 py-0.5 font-bold font-display text-[clamp(13px,1.6vw,18px)] shadow-card",
                      odd ? "bg-ink text-on-ink" : "bg-surface text-ink",
                    )}
                  >
                    {p.answer}
                  </m.span>
                ) : null}
              </AnimatePresence>
              <m.div
                className="w-full perspective-[600px]"
                animate={{
                  y: s.caught && odd ? -14 : 0,
                  rotate: p.tilt,
                }}
              >
                <m.div
                  className="relative transform-3d"
                  animate={{ rotateY: s.up ? 180 : 0 }}
                  transition={{ duration: 0.5, delay: p.seat * 0.06 }}
                >
                  <div className="flex aspect-[4/5.2] items-center justify-center rounded-lg bg-ink shadow-pop backface-hidden">
                    <span className="font-display font-extrabold text-[clamp(22px,3vw,34px)] text-butter">
                      ?
                    </span>
                  </div>
                  <div
                    className={cn(
                      "absolute inset-0 rotate-y-180 backface-hidden",
                      s.caught &&
                        odd &&
                        "rounded-lg outline-[3px] outline-no outline-solid",
                    )}
                  >
                    <Face odd={odd} />
                  </div>
                </m.div>
              </m.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
