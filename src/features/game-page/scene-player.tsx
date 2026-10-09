"use client";

import { Pause, Play } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Avatar } from "@/components/ui/avatar";
import type { Avatar as AvatarData } from "@/game/types";
import { randomDna } from "@/lib/avatar";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { seatColor } from "@/lib/seats";
import { AVATAR_COLORS } from "@/server/contract";

/** The pretend room's players, always the same faces and seat colours. */
export const WHO = ["you", "bia", "leo", "rafa", "mei"] as const;
export type Who = (typeof WHO)[number];

// a fixed creature per player: randomDna fed a small seeded generator
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};
const FACES = Object.fromEntries(
  WHO.map((w, i) => [
    w,
    {
      kind: "creature",
      dna: randomDna(seeded(i * 97 + 11)),
      color: AVATAR_COLORS[(i * 3) % AVATAR_COLORS.length],
    } satisfies AvatarData,
  ]),
) as Record<Who, AvatarData>;

export const NAMES: Record<Exclude<Who, "you">, string> = {
  bia: "Bia",
  leo: "Leo",
  rafa: "Rafa",
  mei: "Mei",
};

export function Face({
  who,
  size = 32,
  className,
}: {
  who: Who;
  size?: 20 | 24 | 28 | 32 | 36 | 40;
  className?: string;
}) {
  return (
    <Avatar
      avatar={FACES[who]}
      size={size}
      seat={WHO.indexOf(who)}
      className={className}
    />
  );
}

/** A line in the chat, at a time (s) from the loop's start. */
export type Line = {
  at: number;
  who: Who | "sys";
  text: ReactNode;
  /** An emoji alone, big and without a bubble. */
  big?: boolean;
};

/** A moment of the match: how long it lasts, what it is about, and its stage at `t` seconds in. */
export type Scene = {
  dur: number;
  caption: string;
  stage: (t: number) => ReactNode;
};

export type Script = {
  scenes: Scene[];
  chat: Line[];
  /** The stage's ground. */
  ground: string;
};

/**
 * The loop's clock, in seconds, ticking only while the panel shows (in view,
 * the tab open) and not paused. `loop` counts the turns, so the chat starts
 * over with each one.
 */
function useLoopClock(total: number, paused: boolean) {
  const ref = useRef<HTMLElement>(null);
  const [clock, setClock] = useState({ t: 0, loop: 0 });
  useEffect(() => {
    let showing = true;
    const watch = new IntersectionObserver(
      ([e]) => {
        showing = e.isIntersecting;
      },
      { threshold: 0.25 },
    );
    if (ref.current) watch.observe(ref.current);
    let last = performance.now();
    const tick = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (paused || !showing || document.hidden) return;
      setClock(({ t, loop }) =>
        t + dt >= total ? { t: 0, loop: loop + 1 } : { t: t + dt, loop },
      );
    }, 100);
    return () => {
      window.clearInterval(tick);
      watch.disconnect();
    };
  }, [total, paused]);
  return { ref, ...clock };
}

/**
 * A game's match, played out small and on a loop in a pretend room: the
 * stage goes through a few moments, each with a line on what is going on,
 * while the room chats beside it. Pauses when out of sight.
 */
export function ScenePlayer({
  script,
  label,
  className,
}: {
  script: Script;
  label: string;
  className?: string;
}) {
  const t = useTranslations("home.gamePage.scenes");
  const [paused, setPaused] = useState(false);
  const total = script.scenes.reduce((s, x) => s + x.dur, 0);
  const clock = useLoopClock(total, paused);

  let start = 0;
  let index = 0;
  while (
    index < script.scenes.length - 1 &&
    clock.t >= start + script.scenes[index].dur
  ) {
    start += script.scenes[index].dur;
    index++;
  }
  const scene = script.scenes[index];
  const lines = script.chat
    .map((line, i) => ({ ...line, i }))
    .filter((line) => line.at <= clock.t)
    .slice(-6);

  return (
    <section
      ref={clock.ref}
      aria-label={label}
      className={cn(
        "grid overflow-hidden rounded-xl bg-surface sm:h-[420px] sm:grid-cols-[minmax(0,1fr)_230px]",
        className,
      )}
    >
      <div
        className="relative flex min-h-[340px] flex-col"
        style={{ background: script.ground }}
      >
        <div className="flex items-center gap-2 px-3.5 pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface/80 px-2.5 py-1 font-bold text-[11px] text-no uppercase tracking-[0.06em] backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-pill bg-no" />
            {t("live")}
          </span>
          <span className="ml-auto flex gap-1">
            {script.scenes.map((s, i) => (
              <span
                key={s.caption}
                className={cn(
                  "h-1.5 rounded-pill transition-[width,background-color] duration-300",
                  i === index ? "w-4 bg-ink/70" : "w-1.5 bg-ink/20",
                )}
              />
            ))}
          </span>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? t("play") : t("pause")}
            className="flex size-7 items-center justify-center rounded-pill bg-surface/80 text-ink backdrop-blur transition-colors hover:bg-surface"
          >
            {paused ? (
              <Play className="size-3.5" strokeWidth={2.25} />
            ) : (
              <Pause className="size-3.5" strokeWidth={2.25} />
            )}
          </button>
        </div>
        <div className="relative flex flex-1 items-center justify-center px-3 py-2">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={`${clock.loop}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: ease.soft }}
              className="flex w-full items-center justify-center"
            >
              {scene.stage(clock.t - start)}
            </m.div>
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <m.p
            key={scene.caption}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-3 mb-3 rounded-lg bg-surface/85 px-3 py-2 text-center font-semibold text-[13.5px] leading-snug backdrop-blur"
          >
            {scene.caption}
          </m.p>
        </AnimatePresence>
      </div>
      <Chat lines={lines} loop={clock.loop} />
    </section>
  );
}

function Chat({
  lines,
  loop,
}: {
  lines: (Line & { i: number })[];
  loop: number;
}) {
  const t = useTranslations("home.gamePage.scenes");
  return (
    <div className="flex min-h-0 flex-col border-line max-sm:h-[220px] max-sm:border-t sm:border-l">
      <div className="px-3.5 pt-3 pb-1.5 font-semibold text-[12.5px] text-ink-muted">
        {t("chat")}
      </div>
      <ol className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden px-3 pb-3">
        {lines.map((line) => (
          <m.li
            key={`${loop}-${line.i}`}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="flex"
          >
            <ChatLine line={line} />
          </m.li>
        ))}
      </ol>
    </div>
  );
}

function ChatLine({ line }: { line: Line }) {
  if (line.who === "sys")
    return (
      <span className="mx-auto rounded-[12px] bg-sunken px-2.5 py-1 text-center font-semibold text-[11.5px] text-ink-muted leading-snug">
        {line.text}
      </span>
    );
  if (line.who === "you")
    return (
      <span className="ml-auto max-w-[85%] rounded-[14px_14px_4px_14px] bg-sky px-2.5 py-1.5 text-[13px] text-on-sky leading-snug">
        {line.text}
      </span>
    );
  return (
    <span className="flex min-w-0 items-end gap-1.5">
      <Face who={line.who} size={24} />
      <span className="flex min-w-0 flex-col">
        <small
          className="font-bold text-[11px]"
          style={{ color: seatColor(WHO.indexOf(line.who)) }}
        >
          {NAMES[line.who]}
        </small>
        {line.big ? (
          <span className="text-[28px] leading-none">{line.text}</span>
        ) : (
          <span className="rounded-[14px_14px_14px_4px] bg-sunken px-2.5 py-1.5 text-[13px] leading-snug">
            {line.text}
          </span>
        )}
      </span>
    </span>
  );
}

/** A character's card, small: an emoji on a soft ground, or face down ("?"). */
export function MiniCard({
  glyph,
  name,
  ground,
  hidden = false,
  size = 64,
  className,
  style,
}: {
  glyph?: string;
  name?: string;
  ground?: string;
  hidden?: boolean;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 flex-col items-center justify-center gap-1 rounded-[12px] bg-white p-1 shadow-card",
        className,
      )}
      style={{ width: size, height: size * 1.25, ...style }}
    >
      {hidden ? (
        <span
          className="flex flex-1 items-center justify-center font-display font-extrabold text-sky leading-none"
          style={{ fontSize: size * 0.5 }}
        >
          ?
        </span>
      ) : (
        <>
          <span
            className="flex w-full flex-1 items-center justify-center rounded-[9px] leading-none"
            style={{ background: ground, fontSize: size * 0.42 }}
          >
            {glyph}
          </span>
          {name ? (
            <span className="max-w-full truncate px-0.5 font-bold text-[#1e2433] text-[10px] leading-tight">
              {name}
            </span>
          ) : null}
        </>
      )}
    </span>
  );
}

/** A stamp that lands hard and tilted (Found out!, Impostor!, Sold!). */
export function Stamp({
  children,
  tone = "yes",
}: {
  children: ReactNode;
  tone?: "yes" | "no" | "sky";
}) {
  return (
    <m.span
      initial={{ scale: 2.2, opacity: 0, rotate: -14 }}
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      transition={{ duration: 0.35, ease: [0.5, 0, 0.75, 0] }}
      className={cn(
        "inline-block rounded-lg border-[3px] bg-surface/90 px-3 py-1 font-display font-extrabold text-[20px] uppercase tracking-[0.02em]",
        tone === "yes" && "border-yes text-yes",
        tone === "no" && "border-no text-no",
        tone === "sky" && "border-sky text-sky",
      )}
    >
      {children}
    </m.span>
  );
}

/** Text typed in, letter by letter, from `t` = 0 (seconds), at `cps` letters a second. */
export function typed(text: string, t: number, cps = 16) {
  return text.slice(0, Math.max(0, Math.floor(t * cps)));
}
