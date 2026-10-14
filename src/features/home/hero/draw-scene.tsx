"use client";

import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { BRAND, FOUR, QUESTION } from "@/components/ui/logo";
import { GAME_INFO, GameThumb, useGameName } from "@/features/create/game-info";
import { GAME_KEYS, type GameKey } from "@/game/games";
import { GUEST_NAME_COUNT, guestWords } from "@/game/guest-names";
import { creatureUri, dnaOf } from "@/lib/avatar";
import { cn } from "@/lib/cn";
import s from "./draw-scene.module.css";

/** Where the six stand along the table, in % of the scene's width. */
const SLOTS = [9, 21, 33, 67, 79, 91];
/** The order they hop in: from the ends towards the middle. */
const HOP_ORDER = [0, 5, 1, 4, 2, 3];
const CHEERS = ["🎉", "🙌", "🤩", "👏", "✨", "🥳"];
const CONFETTI = [
  "#f6e3a1",
  "#ffffff",
  "#ef7215",
  "#0b7a75",
  "#c2412f",
  "#8a4fc4",
];
/** The first crowd, the same on the server and the browser; later ones are drawn at random. */
const FIRST_CROWD = [17, 42, 88, 131, 205, 260];

const drawCrowd = () => {
  const out: number[] = [];
  while (out.length < SLOTS.length) {
    const n = Math.floor(Math.random() * GUEST_NAME_COUNT);
    if (!out.includes(n)) out.push(n);
  }
  return out;
};
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
class Stop extends Error {}

/** A creature standing on the page, its look kept per guest. */
function Member({ guest, slot }: { guest: number; slot: number }) {
  const [delay] = useState(
    () => `${(-((guest * 37) % 300) / 100).toFixed(2)}s`,
  );
  return (
    <span
      className={s.p}
      style={{ left: `${SLOTS[slot]}%`, "--d": delay } as CSSProperties}
    >
      {/* biome-ignore lint/performance/noImgElement: an inline svg data uri */}
      <img src={creatureUri(dnaOf(guestWords(guest)))} alt="" />
    </span>
  );
}

/**
 * "Any game": the site's own draw, at home scale. The crowd hops into the
 * logo's 4 one by one, it shakes and its "?" spins, and a card shoots out of
 * the tail with a game; everyone pops back out to cheer, then again with the
 * next game. The card is a button that picks its game (pointing at it holds
 * the scene); the rest of the scene plays any game. It holds out of view and
 * in a hidden tab; reduced motion shows the card, still.
 */
export function DrawScene({
  onPlay,
  onPick,
  className,
}: {
  onPlay: () => void;
  onPick: (game: GameKey) => void;
  className?: string;
}) {
  const t = useTranslations("home.hero");
  const tg = useTranslations("home.games");
  const gameName = useGameName();
  const still = useReducedMotion() ?? false;
  const [crowd, setCrowd] = useState(FIRST_CROWD);
  const [line, setLine] = useState<string | null>(null);
  const [game, setGame] = useState<GameKey>(GAME_KEYS[0]);
  const [cardOn, setCardOn] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const urn = useRef<HTMLDivElement>(null);
  const q = useRef<SVGPathElement>(null);
  const chip = useRef<HTMLSpanElement>(null);
  const card = useRef<HTMLButtonElement>(null);
  const crowdEl = useRef<HTMLDivElement>(null);
  const held = useRef(false);
  const lines = t.raw("draw.lines") as string[];
  const drawing = t("draw.drawing");
  const words = useRef({ lines, drawing });
  words.current = { lines, drawing };

  // a new line comes up with a little spring
  useEffect(() => {
    if (line === null || still) return;
    const el = chip.current;
    if (!el) return;
    for (const a of el.getAnimations()) a.cancel();
    el.animate(
      [
        { transform: "translateY(8px) scale(.85)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 380, easing: "cubic-bezier(.34,1.56,.64,1)" },
    );
  }, [line, still]);

  useEffect(() => {
    const box = root.current;
    const u = urn.current;
    const qm = q.current;
    const ch = chip.current;
    const cd = card.current;
    const cr = crowdEl.current;
    if (!box || !u || !qm || !ch || !cd || !cr) return;

    const place = () => {
      const r = box.getBoundingClientRect();
      cd.style.left = `${r.width / 2 - cd.offsetWidth / 2}px`;
      cd.style.top = `${r.height * 0.22}px`;
    };
    if (still) {
      place();
      setCardOn(true);
      return;
    }

    let visible = true;
    let live = true;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) visible = e.isIntersecting;
      },
      { threshold: 0.1 },
    );
    io.observe(box);
    const w = async (ms: number) => {
      await sleep(ms);
      while (live && (!visible || document.hidden || held.current))
        await sleep(150);
      if (!live) throw new Stop();
    };
    const rect = () => box.getBoundingClientRect();
    // the 4's mouth (the top of the bubble) and its tail, in the scene's px
    const mouth = () => {
      const r = rect();
      const b = u.getBoundingClientRect();
      return {
        x: b.left - r.left + b.width * 0.5,
        y: b.top - r.top + b.height * 0.18,
      };
    };
    const tail = () => {
      const r = rect();
      const b = u.getBoundingClientRect();
      return {
        x: b.left - r.left + b.width * 0.66,
        y: b.top - r.top + b.height * 0.9,
      };
    };
    const hush = () => {
      for (const a of ch.getAnimations()) a.cancel();
      ch.animate(
        [
          { transform: "none", opacity: 1 },
          { transform: "translateY(-6px) scale(.9)", opacity: 0 },
        ],
        { duration: 220, easing: "ease-in", fill: "forwards" },
      );
    };
    const confetti = () => {
      const r = rect();
      for (let i = 0; i < 26; i++) {
        const c = document.createElement("i");
        c.className = s.conf;
        c.style.background = CONFETTI[i % CONFETTI.length];
        c.style.left = `${r.width / 2}px`;
        c.style.top = `${r.height * 0.3}px`;
        box.appendChild(c);
        const a = Math.random() * Math.PI * 2;
        const v = 70 + Math.random() * 150;
        c.animate(
          [
            { transform: "translate(0,0) rotate(0)", opacity: 1 },
            {
              transform: `translate(${Math.cos(a) * v}px, ${Math.sin(a) * v * 0.6 + 120}px) rotate(${(Math.random() - 0.5) * 900}deg)`,
              opacity: 0,
            },
          ],
          { duration: 1300, easing: "cubic-bezier(.2,.7,.4,1)" },
        ).onfinish = () => c.remove();
      }
    };
    const cheer = (p: HTMLElement) => {
      if (Math.random() < 0.6) {
        const e = document.createElement("span");
        e.className = s.cheer;
        e.textContent = pick(CHEERS);
        p.appendChild(e);
        window.setTimeout(() => e.remove(), 1300);
      }
      p.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(-14%)" },
          { transform: "translateY(0)" },
        ],
        { duration: 420, iterations: 2, easing: "ease-in-out" },
      );
    };

    let round = 0;
    const play = async () => {
      const g = GAME_KEYS[round % GAME_KEYS.length];
      round++;
      setGame(g);
      const ps = [...cr.children] as HTMLElement[];
      setLine(pick(words.current.lines));
      await w(700);
      // everyone hops into the 4, one by one, on an arc
      for (const k of HOP_ORDER) {
        const p = ps[k];
        if (!p) continue;
        const r = rect();
        const pr = p.getBoundingClientRect();
        const m = mouth();
        const dx = m.x - (pr.left - r.left + pr.width / 2);
        const dy = m.y - (pr.top - r.top + pr.height / 2);
        const turn = dx > 0 ? 1 : -1;
        p.animate(
          [
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            {
              transform: `translate(${dx * 0.5}px, ${dy - 70}px) scale(.85) rotate(${turn * 25}deg)`,
              opacity: 1,
              offset: 0.55,
            },
            {
              transform: `translate(${dx}px, ${dy + 10}px) scale(.25) rotate(${turn * 70}deg)`,
              opacity: 0,
            },
          ],
          {
            duration: 620,
            easing: "cubic-bezier(.3,.6,.4,1)",
            fill: "forwards",
          },
        );
        window.setTimeout(
          () =>
            u.animate(
              [
                { transform: "scale(1)" },
                { transform: "scale(1.06,.94)" },
                { transform: "scale(1)" },
              ],
              { duration: 260, easing: "ease-out" },
            ),
          560,
        );
        await w(210);
      }
      await w(650);
      // the shake
      setLine(words.current.drawing);
      u.animate(
        [
          { rotate: "0deg" },
          { rotate: "-7deg" },
          { rotate: "6deg" },
          { rotate: "-5deg" },
          { rotate: "4deg" },
          { rotate: "-2deg" },
          { rotate: "0deg" },
        ],
        { duration: 1000, easing: "ease-in-out" },
      );
      qm.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(720deg)" }],
        { duration: 1000, easing: "cubic-bezier(.5,0,.3,1)" },
      );
      await w(1050);
      // the card, out of the tail
      const r = rect();
      const tl = tail();
      const cw = cd.offsetWidth;
      const chh = cd.offsetHeight;
      const endX = r.width / 2 - cw / 2;
      const endY = r.height * 0.22;
      cd.style.left = `${endX}px`;
      cd.style.top = `${endY}px`;
      setCardOn(true);
      const fx = tl.x - endX - cw / 2;
      cd.animate(
        [
          {
            transform: `translate(${fx}px, ${tl.y - endY - chh / 2}px) scale(.15) rotate(-30deg)`,
            opacity: 0,
          },
          {
            transform: `translate(${fx * 0.3}px, -30px) scale(1.08) rotate(8deg)`,
            opacity: 1,
            offset: 0.6,
          },
          { transform: "translate(0,0) scale(1) rotate(-3deg)", opacity: 1 },
        ],
        { duration: 700, easing: "cubic-bezier(.3,.7,.4,1)", fill: "forwards" },
      );
      hush();
      await w(450);
      // everyone pops back out and cheers
      ps.forEach((p, i) => {
        const r2 = rect();
        for (const a of p.getAnimations()) a.cancel();
        const pr = p.getBoundingClientRect();
        const m = mouth();
        const dx = m.x - (pr.left - r2.left + pr.width / 2);
        const dy = m.y - (pr.top - r2.top + pr.height / 2);
        p.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: 0 },
            {
              transform: `translate(${dx * 0.45}px, -60px) scale(.9)`,
              opacity: 1,
              offset: 0.5,
            },
            { transform: "translate(0,0) scale(1)", opacity: 1 },
          ],
          {
            duration: 600,
            delay: i * 70,
            easing: "cubic-bezier(.3,.7,.4,1)",
            fill: "backwards",
          },
        );
        window.setTimeout(() => live && cheer(p), 600 + i * 70);
      });
      confetti();
      await w(3000);
      const away = cd.animate(
        [
          { transform: "translate(0,0) scale(1) rotate(-3deg)", opacity: 1 },
          {
            transform: "translate(0,-20px) scale(.9) rotate(4deg)",
            opacity: 0,
          },
        ],
        { duration: 320, easing: "ease-in", fill: "forwards" },
      );
      away.onfinish = () => {
        if (!live) return;
        setCardOn(false);
        held.current = false;
      };
      await w(500);
      // a fresh crowd now and then
      if (round % 2 === 0) {
        const out = cr.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 250,
          fill: "forwards",
        });
        out.onfinish = () => {
          if (!live) return;
          setCrowd(drawCrowd());
          requestAnimationFrame(() => {
            out.cancel();
            cr.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
          });
        };
        await w(600);
      }
    };

    void (async () => {
      try {
        for (;;) await play();
      } catch (e) {
        if (!(e instanceof Stop)) throw e;
      }
    })();
    return () => {
      live = false;
      io.disconnect();
      for (const el of box.querySelectorAll("*"))
        for (const a of el.getAnimations()) a.cancel();
      for (const c of box.querySelectorAll(`.${s.conf}, .${s.cheer}`))
        c.remove();
      held.current = false;
      setCardOn(false);
      setLine(null);
    };
  }, [still]);

  const hold = (on: boolean) => () => {
    held.current = on;
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: it holds the card's own button, so it can't be a button itself
    <div
      ref={root}
      role="button"
      tabIndex={0}
      aria-label={t("playAny")}
      className={cn(s.scene, className)}
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay();
        }
      }}
    >
      <span className={s.floor} aria-hidden="true" />
      <div className={s.top} aria-live="polite">
        <span
          ref={chip}
          className={s.chip}
          style={still ? { opacity: 0 } : undefined}
        >
          {line ?? lines[0]}
        </span>
      </div>
      <div ref={urn} className={s.urn} aria-hidden="true">
        <svg viewBox="-10 -10 840 850" aria-hidden="true">
          <path d={FOUR} fill={BRAND.butter} />
          <path ref={q} className={s.q} d={QUESTION} fill={BRAND.blue} />
        </svg>
      </div>
      <div ref={crowdEl} className={s.crowd} aria-hidden="true">
        {crowd.map((g, i) => (
          <Member key={g} guest={g} slot={i} />
        ))}
      </div>
      <button
        ref={card}
        type="button"
        tabIndex={cardOn ? 0 : -1}
        aria-hidden={cardOn ? undefined : true}
        aria-label={t("draw.pick", { game: gameName(game) })}
        className={cn(s.card, cardOn && s.on)}
        onClick={(e) => {
          e.stopPropagation();
          onPick(game);
        }}
        onPointerEnter={hold(true)}
        onPointerLeave={hold(false)}
        onFocus={hold(true)}
        onBlur={hold(false)}
      >
        <span className={s.cardIn}>
          <GameThumb game={game} size="fill" className={s.cardThumb} />
          <b>{gameName(game)}</b>
          <small>{tg(`${GAME_INFO[game].messages}.players`)}</small>
          <span className={s.cta}>
            {t("draw.cta")}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </span>
      </button>
    </div>
  );
}
