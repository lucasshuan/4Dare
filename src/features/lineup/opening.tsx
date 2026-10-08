"use client";

// The opening on the slate: the whole rule in four lines (a room's first
// match), then the envelope that already holds the mission, what a mission
// can be and a tip. Later rounds open on "Round 2 of 2" and the envelope.
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { FigureArt } from "@/components/ui/figure-art";
import type { Beat } from "@/game/types";
import type { Figure } from "@/lib/figures";
import { CoinTower } from "./coin";
import { Envelope } from "./envelope";
import { beatDelay, useBeatAgo, useLineup } from "./use-lineup";

/** "Round 2 of 2", chalked big. */
export function RoundCard({ n, of }: { n: number; of: number }) {
  const t = useTranslations("lineup.opening");
  return (
    <m.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      className="mt-[18vh] font-bold font-chalk text-[clamp(44px,9vw,84px)] text-chalk leading-none"
    >
      {t("round", { n, of })}
    </m.div>
  );
}

const TEAM: { figure: Figure; price: number; tilt: number }[] = [
  { figure: "fox", price: 4, tilt: -5 },
  { figure: "pirate", price: 3, tilt: 4 },
  { figure: "robot", price: 1, tilt: -2 },
  { figure: "witch", price: 2, tilt: 5 },
];

/** The rule in four lines, each with its picture: coins, photos, the envelope, chalk. */
export function RulesScene({ beat }: { beat: Beat }) {
  const t = useTranslations("lineup.opening");
  const { view } = useLineup();
  const ago = useBeatAgo(beat);
  const coins = view.settings.coins;
  const at = (frac: number) => beatDelay(beat, ago, frac);
  const lines = [
    { key: "coins", at: 0, text: t("coins", { coins }) },
    { key: "auction", at: 0.24, text: t("auction") },
    { key: "secret", at: 0.5, text: t("secret") },
    { key: "defend", at: 0.74, text: t("defend") },
  ];
  // the photos take their price off the tower as they land
  const spent = (i: number) =>
    TEAM.slice(0, i + 1).reduce((a, c) => a + c.price, 0);
  return (
    <div className="flex w-full max-w-[880px] flex-col items-center gap-[4vh] pt-[4vh] text-chalk">
      <div className="relative flex h-[clamp(190px,36vh,300px)] w-full items-end justify-center gap-[3vw]">
        {/* the purse: ten coins drop, then the photos take theirs */}
        <div className="flex w-[clamp(54px,10vw,84px)] flex-col items-center">
          <m.div
            className="w-full"
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: at(0.02),
              type: "spring",
              stiffness: 260,
              damping: 16,
            }}
          >
            <TowerSteps
              coins={coins}
              steps={TEAM.map((_, i) => ({
                delay: at(0.3 + i * 0.05),
                left: Math.max(0, coins - spent(i)),
              }))}
            />
          </m.div>
          <span className="mt-1 h-2 w-[130%] rounded-[4px] bg-gradient-to-b from-wood to-wood-deep" />
        </div>
        {/* a little board, the photos taping on */}
        <div className="relative aspect-[3/2] w-[clamp(220px,46vw,420px)] rounded-[14px] bg-gradient-to-br from-wood to-wood-deep p-[1.6%] shadow-card">
          <div className="relative flex size-full items-center justify-center gap-[3%] rounded-[9px] bg-board px-[4%]">
            {TEAM.map((c, i) => (
              <m.div
                key={c.figure}
                className="relative w-[21%]"
                initial={{ opacity: 0, scale: 1.7, y: -30 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotate: c.tilt }}
                transition={{
                  delay: at(0.27 + i * 0.05),
                  type: "spring",
                  stiffness: 360,
                  damping: 22,
                }}
              >
                <div className="bg-white p-[6%] shadow-card">
                  <FigureArt figure={c.figure} className="aspect-4/5" />
                </div>
                <span className="absolute -right-[12%] -bottom-[8%] rounded-[4px] bg-kraft px-1 font-mono font-semibold text-[clamp(10px,1.6vw,14px)] text-kraft-ink">
                  {c.price}
                </span>
              </m.div>
            ))}
            {/* "then defend": chalk words under the photos */}
            <m.span
              className="absolute bottom-[7%] left-1/2 -translate-x-1/2 whitespace-nowrap font-bold font-hand text-[clamp(14px,2.6vw,24px)]"
              initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
              animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
              transition={{ delay: at(0.8), duration: 0.9 }}
            >
              {t("defendChalk")}
            </m.span>
          </div>
          {/* nobody knows what for: the sealed envelope lands on the corner */}
          <m.div
            className="absolute -top-[18%] -right-[10%] w-[34%]"
            initial={{ opacity: 0, y: -120, rotate: 30 }}
            animate={{ opacity: 1, y: 0, rotate: 8 }}
            transition={{
              delay: at(0.52),
              type: "spring",
              stiffness: 220,
              damping: 14,
            }}
          >
            <Envelope sealed small />
          </m.div>
        </div>
      </div>
      <div className="grid w-full place-items-center">
        {lines.map((l, i) => (
          <m.p
            key={l.key}
            className="col-start-1 row-start-1 m-0 max-w-[90vw] text-balance text-center font-bold font-chalk text-[clamp(26px,5vw,48px)] leading-[1.1]"
            initial={{ opacity: 0, y: 14 }}
            animate={{
              opacity: [0, 1, 1, i === lines.length - 1 ? 1 : 0],
              y: [14, 0, 0, 0],
            }}
            transition={{
              delay: at(l.at),
              duration:
                (((lines[i + 1]?.at ?? 1) - l.at) *
                  (beat.until - beat.startsAt)) /
                1000,
              times: [0, 0.12, 0.9, 1],
            }}
          >
            {l.text}
          </m.p>
        ))}
      </div>
    </div>
  );
}

/** The tower at its height for each step: the photos take their coins as they land. */
function TowerSteps({
  coins,
  steps,
}: {
  coins: number;
  steps: { delay: number; left: number }[];
}) {
  const [n, setN] = useState(() =>
    steps.reduce((h, s) => (s.delay <= 0 ? s.left : h), coins),
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: the steps are set on mount
  useEffect(() => {
    const ids = steps
      .filter((s) => s.delay > 0)
      .map((s) => window.setTimeout(() => setN(s.left), s.delay * 1000));
    return () => ids.forEach(window.clearTimeout);
  }, []);
  return <CoinTower count={n} className="w-full" />;
}

/**
 * The closing beat: the envelope lands big and sealed, "the mission is already
 * in the envelope", what a mission can be (anything a team does together, even
 * something absurd), and a tip before the first lot.
 */
export function SecretScene({ beat, first }: { beat: Beat; first: boolean }) {
  const t = useTranslations("lineup.opening");
  const { view } = useLineup();
  const ago = useBeatAgo(beat);
  const at = (frac: number) => beatDelay(beat, ago, frac);
  const examples = t.raw("examples") as string[];
  const tips = t.raw("tips") as string[];
  // the same example and tip on every screen: picked by the show's start
  const pick = Math.floor(beat.startsAt / 1000);
  const example = examples[pick % examples.length];
  const tip = tips[(pick >> 3) % tips.length].replace(
    "{coins}",
    String(view.settings.coins),
  );
  const line = (frac: number, className: string, text: string) => (
    <m.p
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: at(frac), duration: 0.4 }}
    >
      {text}
    </m.p>
  );
  return (
    <div className="flex w-full max-w-[760px] flex-col items-center gap-5 pt-[5vh] text-center text-chalk">
      <m.div
        className="w-[clamp(180px,40vw,300px)]"
        initial={{ opacity: 0, y: -160, rotate: -16, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, rotate: -3, scale: 1 }}
        transition={{
          delay: at(0),
          type: "spring",
          stiffness: 200,
          damping: 14,
        }}
      >
        <Envelope sealed />
      </m.div>
      {line(
        first ? 0.1 : 0.06,
        "m-0 font-bold font-chalk text-[clamp(28px,5.4vw,50px)] leading-[1.08] text-balance",
        t("envelope"),
      )}
      <div className="flex flex-col items-center gap-1">
        {line(
          0.32,
          "m-0 font-bold text-[clamp(17px,2.6vw,24px)] text-chalk/90 text-balance",
          t("anything"),
        )}
        {line(
          0.48,
          "m-0 font-bold font-hand text-[clamp(24px,4vw,36px)] text-butter text-balance",
          example,
        )}
      </div>
      <m.p
        className="m-0 inline-flex items-center gap-2 rounded-pill bg-surface px-4 py-2 font-bold text-[clamp(14px,2.2vw,18px)] text-ink shadow-card"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: at(0.7),
          type: "spring",
          stiffness: 380,
          damping: 20,
        }}
      >
        {t("tip", { tip })}
      </m.p>
    </div>
  );
}
