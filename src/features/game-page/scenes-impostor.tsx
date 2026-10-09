"use client";

import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import {
  Face,
  MiniCard,
  NAMES,
  type Script,
  Stamp,
  type Who,
} from "./scene-player";

const SEATS = ["you", "bia", "leo", "mei"] as const satisfies Who[];
const CREW = { glyph: "⚡", name: "Pikachu", ground: "#fbefb4" };
const ODD = { glyph: "🌱", name: "Bulbasaur", ground: "#cdeccb" };

/** Your card up close, the others' face down. */
function YourCard() {
  const t = useTranslations("home.gamePage.scenes.impostor");
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="rounded-pill bg-surface/85 px-2.5 py-1 font-semibold text-[12px] text-ink-muted">
        {t("yours")}
      </span>
      <m.span
        initial={{ rotateY: 90 }}
        animate={{ rotateY: 0 }}
        transition={{ delay: 0.5, duration: 0.45 }}
      >
        <MiniCard {...CREW} size={84} />
      </m.span>
      <div className="flex gap-3">
        {SEATS.filter((w) => w !== "you").map((who) => (
          <span key={who} className="flex flex-col items-center gap-1">
            <MiniCard hidden size={34} />
            <Face who={who} size={24} />
          </span>
        ))}
      </div>
    </div>
  );
}

const SCORES: Record<(typeof SEATS)[number], number> = {
  you: 8,
  bia: 7,
  leo: 8,
  mei: 3,
};

/** "How brave is your character?": each face drops onto a 1–10 rule. */
function Scale({ s }: { s: number }) {
  const t = useTranslations("home.gamePage.scenes.impostor");
  return (
    <div className="flex w-full max-w-[400px] flex-col gap-[68px]">
      <span className="text-center font-bold font-display text-[16px] leading-tight">
        {t("scale")}
      </span>
      <div className="relative mx-3 h-2 rounded-pill bg-surface/80">
        {SEATS.map((who, i) => {
          const at = (SCORES[who] - 1) / 9;
          // the two 8s side by side
          const nudge = who === "leo" ? 22 : 0;
          return s > 1 + i * 0.6 ? (
            <m.span
              key={who}
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
              className="-translate-x-1/2 absolute bottom-1.5 flex flex-col items-center"
              style={{ left: `calc(${at * 100}% + ${nudge}px)` }}
            >
              <Face who={who} size={28} />
              <span className="font-bold font-mono text-[11px]">
                {SCORES[who]}
              </span>
            </m.span>
          ) : null;
        })}
        <span className="-bottom-5 absolute left-0 font-mono text-[11px] text-ink-muted">
          1
        </span>
        <span className="-bottom-5 absolute right-0 font-mono text-[11px] text-ink-muted">
          10
        </span>
      </div>
    </div>
  );
}

/** The vote: every voter's face lands on Mei, then her card shows. */
function Vote({ s }: { s: number }) {
  const t = useTranslations("home.gamePage.scenes.impostor");
  const ts = useTranslations("home.gamePage.scenes");
  const caught = s > 3.4;
  return (
    <div className="relative grid grid-cols-4 gap-2">
      {SEATS.map((who) => {
        const voters =
          who === "mei"
            ? (["you", "bia", "leo"] as const).filter(
                (_, i) => s > 1.2 + i * 0.5,
              )
            : [];
        return (
          <div
            key={who}
            className={cn(
              "flex w-[78px] flex-col items-center gap-1.5 rounded-xl bg-surface/85 px-2 pt-2.5 pb-2 transition-shadow duration-300",
              who === "mei" && caught && "shadow-[0_0_0_2.5px_var(--no)]",
            )}
          >
            {who === "mei" && caught ? (
              <m.span initial={{ rotateY: 90 }} animate={{ rotateY: 0 }}>
                <MiniCard {...ODD} size={40} />
              </m.span>
            ) : (
              <Face who={who} size={40} />
            )}
            <b className="font-bold text-[12px]">
              {who === "you" ? ts("you") : NAMES[who]}
            </b>
            <span className="flex h-5 gap-0.5">
              {voters.map((v) => (
                <m.span
                  key={v}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                >
                  <Face who={v} size={20} />
                </m.span>
              ))}
            </span>
          </div>
        );
      })}
      {s > 3.4 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Stamp tone="no">{t("stamp")}</Stamp>
        </div>
      ) : null}
    </div>
  );
}

/** The Impostor played out: the card everyone (but one) holds, a rule to answer on, the vote. */
export function useImpostorScript(): Script {
  const t = useTranslations("home.gamePage.scenes.impostor");
  return {
    ground:
      "linear-gradient(160deg, var(--art-impostor), var(--art-impostor-2))",
    scenes: [
      { dur: 6.5, caption: t("c1"), stage: () => <YourCard /> },
      { dur: 7.5, caption: t("c2"), stage: (s) => <Scale s={s} /> },
      { dur: 7, caption: t("c3"), stage: (s) => <Vote s={s} /> },
    ],
    chat: [
      { at: 0.8, who: "mei", text: t("chat.warn") },
      { at: 2.2, who: "leo", text: t("chat.nobody") },
      { at: 9.2, who: "bia", text: t("chat.three") },
      { at: 10.6, who: "mei", text: t("chat.scared") },
      { at: 12, who: "leo", text: t("chat.coward") },
      { at: 17.6, who: "sys", text: t("chat.was") },
      { at: 18.3, who: "mei", text: t("chat.me") },
      { at: 19.8, who: "leo", text: t("chat.gg") },
    ],
  };
}
