"use client";

import { m } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  Face,
  MiniCard,
  type Script,
  Stamp,
  typed,
  type Who,
} from "./scene-player";

const SEATS = ["you", "bia", "leo", "rafa"] as const satisfies Who[];

const CARDS: Record<(typeof SEATS)[number], [string, string, string]> = {
  you: ["🔨", "Thor", "#cfe1fb"],
  bia: ["🦇", "Batman", "#ddd6f3"],
  leo: ["💪", "Hulk", "#cdeccb"],
  rafa: ["🌳", "Groot", "#f3dcc0"],
};

/** The table: a card over each face, yours face down until `reveal`; chips over the others' cards. */
function Table({
  reveal = false,
  chips = {},
  bubble,
  stamp,
}: {
  reveal?: boolean;
  chips?: Partial<Record<Who, ReactNode>>;
  bubble?: ReactNode;
  stamp?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="flex h-9 items-end">
        {bubble ? (
          <span className="rounded-[14px] bg-surface px-3 py-1.5 font-bold text-[14px] shadow-card">
            {bubble}
            <span className="ml-0.5 inline-block w-1.5 animate-pulse">|</span>
          </span>
        ) : null}
      </div>
      <div className="flex items-end gap-3 sm:gap-4">
        {SEATS.map((who, i) => {
          const [glyph, name, ground] = CARDS[who];
          return (
            <div key={who} className="flex flex-col items-center gap-1.5">
              <span className="flex h-6 items-end">
                {chips[who] ? (
                  <m.span
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="rounded-pill bg-surface px-2 py-0.5 font-bold text-[11.5px] shadow-card"
                  >
                    {chips[who]}
                  </m.span>
                ) : null}
              </span>
              <m.span
                initial={{ y: 16, opacity: 0, rotate: i % 2 ? 4 : -4 }}
                animate={{
                  y: 0,
                  opacity: 1,
                  rotate: i % 2 ? 3 : -3,
                  rotateY: who === "you" && reveal ? [90, 0] : 0,
                }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
              >
                <MiniCard
                  glyph={glyph}
                  name={name}
                  ground={ground}
                  hidden={who === "you" && !reveal}
                  size={58}
                  className={
                    who === "you" && !reveal
                      ? "ring-2 ring-sky ring-offset-2 ring-offset-transparent"
                      : undefined
                  }
                />
              </m.span>
              <Face who={who} size={28} />
            </div>
          );
        })}
      </div>
      {stamp ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {stamp}
        </div>
      ) : null}
    </div>
  );
}

/** "Who am I?" played out: the table, a question and its answers, the right guess. */
export function useWhoAmIScript(): Script {
  const t = useTranslations("home.gamePage.scenes.whoAmI");
  return {
    ground: "linear-gradient(160deg, var(--art-whoami), var(--art-whoami-2))",
    scenes: [
      { dur: 7, caption: t("c1"), stage: () => <Table /> },
      {
        dur: 7.5,
        caption: t("c2"),
        stage: (s) => (
          <Table
            bubble={typed(t("ask"), s - 0.4)}
            chips={{
              bia: s > 3 ? t("yes") : null,
              leo: s > 3.4 ? t("yes") : null,
              rafa: s > 3.8 ? t("maybe") : null,
            }}
          />
        ),
      },
      {
        dur: 6.5,
        caption: t("c3"),
        stage: (s) => (
          <Table
            bubble={s < 2.6 ? typed(t("guess"), s - 0.3) : undefined}
            reveal={s > 2.6}
            stamp={s > 3.2 ? <Stamp>{t("stamp")}</Stamp> : undefined}
          />
        ),
      },
    ],
    chat: [
      { at: 0.6, who: "bia", text: t("chat.hi") },
      { at: 1.8, who: "leo", text: t("chat.win") },
      { at: 3.2, who: "rafa", text: "😂", big: true },
      {
        at: 4.6,
        who: "sys",
        text: t.rich("chat.theme", { b: (x) => <b>{x}</b> }),
      },
      { at: 9.5, who: "leo", text: t("chat.good") },
      { at: 11.2, who: "bia", text: t("chat.lol") },
      { at: 13, who: "rafa", text: t("chat.close") },
      { at: 17.6, who: "sys", text: t("chat.done") },
      { at: 18.4, who: "leo", text: t("chat.no") },
      { at: 19.6, who: "rafa", text: t("chat.gg") },
    ],
  };
}
