"use client";

import { useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  BRAND,
  FOUR,
  LETTERS,
  LETTERS_JA,
  LOGO_WIDTH,
  QUESTION,
} from "@/components/ui/logo";
import { appName } from "@/config";
import { GAME_INFO } from "@/features/create/game-info";
import type { GameKey } from "@/game/games";
import { cn } from "@/lib/cn";
import s from "./headline.module.css";
import { HEADLINE_FONTS, type HeadlineFont } from "./headline-fonts";

export type Choice = GameKey | "any";

const msgKey = (c: Choice) => (c === "any" ? "any" : GAME_INFO[c].messages);

/** The Japanese headline fonts, fetched only on Japanese pages. */
let jaFonts: Record<GameKey, HeadlineFont> | null = null;
const loadJa = () =>
  import("./headline-fonts-ja").then((m) => {
    jaFonts = m.HEADLINE_FONTS_JA;
    return jaFonts;
  });

/** The logo, its pieces apart so each can move on its own (the 4, its "?", each letter). */
function HeadlineLogo({ ja }: { ja: boolean }) {
  const letters = ja ? LETTERS_JA : LETTERS;
  return (
    <svg
      viewBox={`-4 -4 ${ja ? LOGO_WIDTH.ja : LOGO_WIDTH.en} 838`}
      aria-hidden="true"
    >
      <g className={s.mark}>
        <path fill={BRAND.blue} d={FOUR} />
        <path className={s.q} fill={BRAND.butter} d={QUESTION} />
      </g>
      {letters.map(([d, fill]) =>
        ja ? (
          <path
            key={fill}
            className={s.ltr}
            fill={fill}
            stroke={fill}
            strokeWidth={22}
            strokeLinejoin="round"
            d={d}
          />
        ) : (
          <path key={fill} className={s.ltr} fill={fill} d={d} />
        ),
      )}
    </svg>
  );
}

/**
 * "Who's up for ___?": the blank is the game picked, in its own letters, as
 * big as it can be and still fit the column (the line keeps its height
 * whatever the name), or the logo for any game. A new name waits for its
 * font, the old one leaves, the new one comes in letter by letter.
 */
export function Headline({
  choice,
  id,
  className,
}: {
  choice: Choice;
  id?: string;
  className?: string;
}) {
  const t = useTranslations("home.hero.headline");
  const locale = useLocale();
  const ja = locale === "ja";
  const still = useReducedMotion() ?? false;
  const [shown, setShown] = useState(choice);
  const [entering, setEntering] = useState(!still);
  const box = useRef<HTMLHeadingElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  const after = t("order") === "name";

  const fontOf = useCallback(
    (c: Choice): HeadlineFont | null =>
      c === "any"
        ? null
        : ((ja ? jaFonts : HEADLINE_FONTS) ?? HEADLINE_FONTS)[c],
    [ja],
  );

  // a new choice: the old name leaves, the font loads, then the new one comes in
  useEffect(() => {
    if (choice === shown) return;
    let live = true;
    const next = choice;
    const fonts = ja && !jaFonts ? loadJa() : Promise.resolve(null);
    const ready = fonts.then(() => {
      const f = fontOf(next);
      const text = t(`name.${msgKey(next)}`);
      return f && document.fonts
        ? document.fonts
            .load(`${f.weight} 64px ${f.family}`, text || "?")
            .catch(() => {})
        : undefined;
    });
    const el = name.current;
    const out =
      el && !still
        ? el.animate(
            [
              { opacity: 1, transform: "none" },
              {
                opacity: 0,
                transform: "translateY(-18%) rotate(-3deg) scale(.96)",
              },
            ],
            { duration: 200, easing: "ease-in", fill: "forwards" },
          )
        : null;
    // the faded name stays faded until React swaps it for the new one (a
    // cancel here would show it again for a frame); a choice that changes
    // midway cancels it, in the same tick the next one starts
    let done = false;
    void Promise.all([out?.finished.catch(() => {}), ready]).then(() => {
      if (!live) return;
      done = true;
      setShown(next);
      setEntering(!still);
    });
    return () => {
      live = false;
      if (!done) out?.cancel();
    };
  }, [choice, shown, ja, still, t, fontOf]);

  // once it has played, the entrance steps aside so hovering never replays it
  useEffect(() => {
    if (!entering) return;
    const id = window.setTimeout(() => setEntering(false), 1900);
    return () => window.clearTimeout(id);
  }, [entering]);

  // the name fills the column's width at most
  const fitName = useCallback(() => {
    const h = box.current;
    const n = name.current;
    if (!h || !n) return;
    const cap = Number.parseFloat(getComputedStyle(h).fontSize) || 140;
    n.style.fontSize = `${cap}px`;
    const w = n.scrollWidth;
    const avail = h.clientWidth;
    n.style.fontSize = `${w > avail ? Math.max(28, Math.floor((cap * avail) / w)) : cap}px`;
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: refit whenever the name shown changes
  useLayoutEffect(() => {
    fitName();
    const f = fontOf(shown);
    if (f && document.fonts)
      void document.fonts
        .load(`${f.weight} 64px ${f.family}`)
        .then(fitName, () => {});
  }, [shown, fitName]);
  useEffect(() => {
    const h = box.current;
    if (!h) return;
    const ro = new ResizeObserver(() => fitName());
    ro.observe(h);
    return () => ro.disconnect();
  }, [fitName]);

  const k = t(`prefix.${msgKey(shown)}`);
  const n = t(`name.${msgKey(shown)}`);
  const font = fontOf(shown);
  const said = after
    ? `${shown === "any" ? appName(locale) : n} ${k}`
    : `${k} ${shown === "any" ? appName(locale) : ""}${n}`;

  return (
    <h1
      ref={box}
      id={id}
      data-g={shown}
      className={cn(s.title, after && s.after, className)}
      style={
        font
          ? ({
              "--hl-font": font.family,
              "--hl-w": font.weight,
            } as CSSProperties)
          : undefined
      }
    >
      <span className="sr-only">{said.trim()}</span>
      <KeyLine text={k} />
      <span
        ref={name}
        aria-hidden="true"
        className={cn(s.n, entering && s.in)}
        key={shown}
      >
        {shown === "any" ? (
          <>
            <span className={s.logo}>
              <span className={s.card}>
                <HeadlineLogo ja={ja} />
              </span>
            </span>
            {n ? <span className={s.trail}>{n}</span> : null}
          </>
        ) : (
          [...n].map((c, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: a letter's place in the name
              key={i}
              className={s.c}
              style={{ "--i": i } as CSSProperties}
            >
              {c === " " ? " " : c}
            </span>
          ))
        )}
      </span>
    </h1>
  );
}

/** The words before (or after) the name; they come in again only when they change. */
function KeyLine({ text }: { text: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  const still = useReducedMotion() ?? false;
  // before the paint: the new words never show for a frame ahead of their fade-in
  // biome-ignore lint/correctness/useExhaustiveDependencies: animate when the words change
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (still) return;
    el.current?.animate(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 360, easing: "cubic-bezier(.22,1,.36,1)" },
    );
  }, [text]);
  return (
    <span ref={el} aria-hidden="true" className={s.k}>
      {text}
    </span>
  );
}
