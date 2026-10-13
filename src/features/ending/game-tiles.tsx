"use client";

import { VenetianMask } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import type { GameKey } from "@/game/games";
import { cn } from "@/lib/cn";
import { type Figure, figureUri } from "@/lib/figures";
import s from "./game-tiles.module.css";

/** A figure's picture. */
function Fig({ name }: { name: Figure }) {
  // biome-ignore lint/performance/noImgElement: a generated svg
  return <img src={figureUri(name)} alt="" />;
}

/** The scene of `game` from the home, filling its (square) box; it loops on its own. */
export function GameTileArt({ game }: { game: GameKey }) {
  return game === "who-am-i" ? (
    <WhoArt />
  ) : game === "impostor" ? (
    <ImpostorArt />
  ) : (
    <LineupArt />
  );
}

/** Who am I?: the others' cards on the table, yours a "?" that turns, the question and the "Yes". */
function WhoArt() {
  const t = useTranslations("home.games.whoAmI");
  const yes = useTranslations("common.answers");
  return (
    <div className={cn(s.art, s.qse)} aria-hidden="true">
      <span
        className={s.spot}
        style={{
          left: "-10.7cqh",
          top: "-13.3cqh",
          width: "53cqh",
          height: "53cqh",
          background: "rgba(255,255,255,.4)",
        }}
      />
      <span
        className={s.spot}
        style={{
          right: "-8cqh",
          bottom: "-16cqh",
          width: "58.7cqh",
          height: "58.7cqh",
          background: "rgba(246,227,161,.5)",
        }}
      />
      {(["lady", "king"] as const).map((f, i) => (
        <div
          key={f}
          className={s.qSide}
          style={
            i
              ? { right: "9%", transform: "rotate(10deg)" }
              : { left: "9%", transform: "rotate(-10deg)" }
          }
        >
          <div className={s.qBob} style={{ animationDelay: `${i * 1.2}s` }}>
            <div className={cn(s.mini, s.shadowCard)}>
              <span className={s.miniPic}>
                <Fig name={f} />
              </span>
              <span className={s.miniLine} />
            </div>
          </div>
        </div>
      ))}
      <div className={s.qYou}>
        <div className={s.qFlip}>
          <div className={s.qFront}>?</div>
          <div className={s.qBack}>
            <div className={cn(s.mini, s.miniYes, s.shadowCard)}>
              <span className={s.miniPic}>
                <Fig name="cat" />
              </span>
              <span className={s.miniLine} />
            </div>
          </div>
        </div>
      </div>
      <div className={cn(s.bubble, s.qAsk)}>{t("demoQuestion")}</div>
      <span className={s.qYes}>
        <i />
        {yes("yes")}
      </span>
    </div>
  );
}

/** The Impostor's four cards, the odd one third. */
const IMP_CARDS = [
  { left: "6%", tilt: -8, odd: false },
  { left: "26.5%", tilt: -3, odd: false },
  { left: "46.5%", tilt: 3, odd: true },
  { left: "67%", tilt: 8, odd: false },
] as const;

/** Impostor: cards face down; the light drops, the spotlight hunts and stops on one; they turn (one isn't alike) and the stamp. */
function ImpostorArt() {
  const t = useTranslations("home.games.impostor");
  return (
    <div className={cn(s.art, s.imp)} aria-hidden="true">
      <span
        className={s.spot}
        style={{
          right: "-8cqh",
          bottom: "-16cqh",
          width: "58.7cqh",
          height: "58.7cqh",
          background: "rgba(246,227,161,.06)",
        }}
      />
      <VenetianMask
        className={s.iDeco}
        style={{
          top: "6%",
          right: "8%",
          width: "10cqh",
          height: "10cqh",
          transform: "rotate(12deg)",
          color: "#c2412f",
          opacity: 0.2,
        }}
      />
      <VenetianMask
        className={s.iDeco}
        style={{
          top: "76%",
          left: "9%",
          width: "6cqh",
          height: "6cqh",
          transform: "rotate(-12deg)",
          color: "#ef7215",
          opacity: 0.25,
        }}
      />
      {IMP_CARDS.map((c, i) => (
        <div
          key={c.left}
          className={s.iCard}
          style={{ left: c.left, transform: `rotate(${c.tilt}deg)` }}
        >
          <div className={s.iShuf} style={{ animationDelay: `${i * 0.06}s` }}>
            <div className={s.iFlip} style={{ animationDelay: `${i * 0.08}s` }}>
              <div className={s.iBack}>
                <span className={s.iDisc}>
                  <VenetianMask />
                </span>
              </div>
              <div className={cn(s.iFace, c.odd && s.iOdd)}>
                <div className={cn(s.held, s.shadowCard)}>
                  <span className={s.heldPic}>
                    <Fig name={c.odd ? "giraffe" : "lion"} />
                  </span>
                  <span className={s.heldLine} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <span className={s.iSpot} />
      <span className={s.iStamp}>{t("banner.caught")}</span>
      <div className={cn(s.bubble, s.iLine)}>{t("demoLine")}</div>
    </div>
  );
}

/** Lineup's four photos: place, tilt, figure and price. */
const LU_PHOTOS = [
  { cls: s.lP0, left: "6%", top: "24%", t: -5, fig: "fox", price: 5 },
  { cls: s.lP1, left: "29%", top: "28%", t: 4, fig: "robot", price: 1 },
  { cls: s.lP2, left: "52%", top: "23%", t: -3, fig: "pirate", price: 3 },
  { cls: s.lP3, left: "75%", top: "27%", t: 5, fig: "witch", price: 1 },
] as const;
/** The purse as the lots sell. */
const LU_LEFT = [
  { cls: s.lN0, n: 10 },
  { cls: s.lN1, n: 5 },
  { cls: s.lN2, n: 4 },
  { cls: s.lN3, n: 1 },
  { cls: s.lN4, n: 0 },
] as const;

/** Lineup: the board in its frame; the photos stick one by one with their price while the purse empties; the envelope drops and opens on the mission. */
function LineupArt() {
  const t = useTranslations("home.games.whatFor");
  return (
    <div className={cn(s.art, s.esc)} aria-hidden="true">
      <span
        className={s.spot}
        style={{
          left: "-10.7cqh",
          top: "-13.3cqh",
          width: "53cqh",
          height: "53cqh",
          background: "rgba(255,255,255,.15)",
        }}
      />
      <div className={cn(s.lFrame, s.shadowCard)}>
        <div className={s.lBoard}>
          <svg
            aria-hidden="true"
            className={s.lPitch}
            viewBox="0 0 572 372"
            preserveAspectRatio="none"
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
          {LU_PHOTOS.map((p) => (
            <div
              key={p.fig}
              className={cn(s.lPhoto, p.cls)}
              style={
                {
                  left: p.left,
                  top: p.top,
                  "--t": `${p.t}deg`,
                } as CSSProperties
              }
            >
              <div className={cn(s.lPin, s.shadowCard)}>
                <span className={s.lFig}>
                  <Fig name={p.fig} />
                </span>
                <span className={s.lTape} />
                <span className={s.lPrice}>{p.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={cn(s.lPurse, s.shadowCard)}>
        <svg viewBox="0 0 48 15" aria-hidden="true">
          <path d="M1 4.2V10.6A23 3.6 0 0 0 47 10.6V4.2Z" fill="#b58a1e" />
          <ellipse cx="24" cy="4.2" rx="23" ry="3.6" fill="#e7b94a" />
          <ellipse
            cx="24"
            cy="4.2"
            rx="17.5"
            ry="2.2"
            fill="none"
            stroke="#b58a1e"
            strokeWidth="0.8"
          />
        </svg>
        <span className={s.lLeft}>
          {LU_LEFT.map((x) => (
            <i key={x.n} className={x.cls}>
              {x.n}
            </i>
          ))}
        </span>
      </div>
      <div className={s.lEnv}>
        <div className={cn(s.lEnvBody, s.shadowPop)}>
          <span className={s.lWhat}>{t("banner.what")}</span>
          <span className={s.lLine}>{t("demoLines.0")}</span>
          <span className={s.lSeal}>?</span>
        </div>
      </div>
    </div>
  );
}
