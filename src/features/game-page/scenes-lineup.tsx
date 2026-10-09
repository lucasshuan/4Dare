"use client";

import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { Face, MiniCard, type Script, Stamp, type Who } from "./scene-player";

const LOT = { glyph: "🦇", name: "Batman", ground: "#ddd6f3" };

/** Bids over time (s into the scene): who, how many coins. */
const BIDS: [number, Who, number][] = [
  [1, "bia", 2],
  [1.6, "rafa", 1],
  [2.2, "leo", 3],
  [3.4, "bia", 4],
];

function Coins({ n }: { n: number }) {
  return (
    <span className="flex flex-col-reverse items-center">
      {Array.from({ length: n }, (_, i) => (
        <m.span
          // biome-ignore lint/suspicious/noArrayIndexKey: a stack of identical coins
          key={i}
          initial={{ y: -18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 20 }}
          className="-mt-1.5 h-3 w-7 rounded-[50%] border-[#b8860b] border-[1.5px] bg-[#e7b94a] shadow-[0_1px_0_#b8860b]"
        />
      ))}
    </span>
  );
}

/** The lot goes up; coins pile up under each bidder; sold. */
function Auction({ s }: { s: number }) {
  const t = useTranslations("home.gamePage.scenes.whatFor");
  const bid = (who: Who) =>
    BIDS.filter(([at, w]) => w === who && s > at).at(-1)?.[2] ?? 0;
  const sold = s > 5;
  return (
    <div className="relative flex items-end gap-6">
      <div className="flex flex-col items-center gap-1.5">
        <span className="rounded-pill bg-surface/85 px-2 py-0.5 font-bold text-[11px] uppercase tracking-[0.06em]">
          {t("lot")}
        </span>
        <MiniCard {...LOT} size={70} />
      </div>
      <div className="flex items-end gap-4">
        {(["bia", "leo", "rafa"] as const).map((who) => (
          <div key={who} className="flex flex-col items-center gap-1.5">
            <span className="flex h-[70px] items-end">
              <Coins n={bid(who)} />
            </span>
            <Face who={who} size={28} />
          </div>
        ))}
      </div>
      {sold ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Stamp tone="sky">{t("sold")}</Stamp>
          <m.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-1.5 rounded-pill bg-surface px-2.5 py-1 font-semibold text-[12.5px] shadow-card"
          >
            <Face who="bia" size={20} />
            Bia · {t("coins", { n: 4 })}
          </m.span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The kraft envelope opens; the mission slides up out of it. The flap sits
 * over the envelope while closed and behind the slip once open.
 */
function Mission({ s }: { s: number }) {
  const t = useTranslations("home.gamePage.scenes.whatFor");
  const open = s > 0.6;
  return (
    <div className="relative flex h-[210px] w-[260px] items-end justify-center">
      <m.span
        initial={{ rotateX: 0 }}
        animate={{ rotateX: open ? 180 : 0 }}
        transition={{ duration: 0.5 }}
        style={{
          transformOrigin: "top",
          clipPath: "polygon(0 0,100% 0,50% 100%)",
          zIndex: s > 0.85 ? 0 : 20,
        }}
        className="absolute bottom-[32px] h-[60px] w-[240px] bg-[#c99556]"
      />
      <m.span
        initial={{ y: 60, opacity: 0 }}
        animate={s > 1.2 ? { y: -92, opacity: 1 } : { y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 18 }}
        className="absolute bottom-6 z-10 w-[220px] rounded-md bg-white px-3 py-3 text-center font-bold text-[#1e2433] text-[14px] leading-snug shadow-card"
      >
        {t("mission")}
      </m.span>
      <span className="relative z-[15] h-[92px] w-[240px] rounded-md bg-[#d9a768] shadow-card" />
      {open ? null : (
        <span className="-translate-x-1/2 absolute bottom-[34px] left-1/2 z-30 size-5 rounded-pill bg-[#b23a3a]" />
      )}
    </div>
  );
}

const TEAMS: [Who, string[]][] = [
  ["bia", ["🦇", "🐦", "🤡"]],
  ["leo", ["💪", "👵", "🔧"]],
  ["rafa", ["🥊", "🥋", "🤼"]],
];

/** Each team in a row; the room's pins drop on Leo's. */
function Vote({ s }: { s: number }) {
  const t = useTranslations("home.gamePage.scenes.whatFor");
  return (
    <div className="relative flex flex-col gap-2">
      {TEAMS.map(([who, team]) => {
        const pins =
          who === "leo"
            ? (["you", "bia", "rafa"] as const).filter(
                (_, i) => s > 1.2 + i * 0.5,
              )
            : [];
        return (
          <div
            key={who}
            className="flex items-center gap-2 rounded-xl bg-surface/85 py-1.5 pr-2 pl-1.5"
          >
            <Face who={who} size={28} />
            {team.map((g) => (
              <MiniCard key={g} glyph={g} ground="#f4ead8" size={30} />
            ))}
            <span className="flex w-[66px] justify-end gap-0.5">
              {pins.map((v) => (
                <m.span
                  key={v}
                  initial={{ y: -24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 14 }}
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
          <Stamp>{t("won")}</Stamp>
        </div>
      ) : null}
    </div>
  );
}

/** "What for?" played out: an auction, the mission, the vote on the teams. */
export function useLineupScript(): Script {
  const t = useTranslations("home.gamePage.scenes.whatFor");
  return {
    ground: "linear-gradient(160deg, var(--art-lineup), var(--art-lineup-2))",
    scenes: [
      { dur: 8, caption: t("c1"), stage: (s) => <Auction s={s} /> },
      { dur: 6.5, caption: t("c2"), stage: (s) => <Mission s={s} /> },
      { dur: 7, caption: t("c3"), stage: (s) => <Vote s={s} /> },
    ],
    chat: [
      { at: 1, who: "bia", text: t("chat.any") },
      { at: 2.6, who: "leo", text: t("chat.pass") },
      { at: 5.4, who: "sys", text: t("chat.sold") },
      { at: 9, who: "sys", text: t("chat.mission") },
      { at: 10.5, who: "rafa", text: t("chat.fight") },
      { at: 12.4, who: "bia", text: t("chat.lol") },
      { at: 17, who: "leo", text: t("chat.self") },
      { at: 18.8, who: "rafa", text: t("chat.no") },
    ],
  };
}
