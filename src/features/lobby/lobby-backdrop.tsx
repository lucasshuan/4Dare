"use client";

import {
  Coins,
  Eye,
  Fingerprint,
  Gavel,
  IdCard,
  type LucideIcon,
  MessageCircleQuestion,
  Search,
  Trophy,
  UsersRound,
  VenetianMask,
} from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { GAME_KEYS, type GameKey } from "@/game/games";
import { beatDelay, MUSIC_BEAT, useMusicPulse } from "@/lib/music";

/** The soft lights: [their colour (1–3), left %, top %, size px, roam x, roam y, head start s]. */
const GLOWS: [1 | 2 | 3, number, number, number, string, string, number][] = [
  [1, -20, -40, 1000, "160px", "100px", 0],
  [2, 50, 32, 1100, "-180px", "-90px", 10],
  [3, 12, 52, 760, "140px", "-130px", 20],
];

/** Shared destinations and clocks: [left %, top %, size px, bob s, beat (of 32), wander x px, wander y px]. */
const MARKS: [number, number, number, number, number, number, number][] = [
  [4, 14, 64, 5.5, 0, 90, 40],
  [15, 62, 40, 6.5, 3, -70, 60],
  [11, 86, 52, 5, 5, 80, -50],
  [24, 26, 34, 7, 8, -60, 70],
  [33, 88, 46, 6, 10, 100, -30],
  [63, 8, 36, 7.5, 12, -80, 50],
  [71, 86, 56, 5.5, 15, -90, -60],
  [80, 40, 32, 6.8, 17, 70, 80],
  [90, 16, 60, 5.8, 19, -100, 40],
  [95, 68, 42, 7.2, 21, -60, -70],
  [52, 4, 30, 6.2, 24, 80, 60],
  [6, 44, 36, 6.6, 26, 90, -40],
  [86, 92, 34, 5.4, 28, -70, -50],
  [45, 92, 32, 7, 30, 60, -80],
];

type MarkIcon = LucideIcon | "question";
const ICONS: Record<GameKey, readonly MarkIcon[]> = {
  "who-am-i": ["question", IdCard, MessageCircleQuestion, "question"],
  impostor: [VenetianMask, Eye, Fingerprint, Search],
  lineup: [Coins, UsersRound, Gavel, Trophy],
};

/** Fixed shuffles: [destination from MARKS, size multiplier, tilt in degrees]. */
const ARRANGEMENTS: Record<GameKey, readonly [number, number, number][]> = {
  "who-am-i": [
    [0, 1, -14],
    [1, 1, 10],
    [2, 1, -8],
    [3, 1, 18],
    [4, 1, 4],
    [5, 1, -16],
    [6, 1, 12],
    [7, 1, -10],
    [8, 1, 8],
    [9, 1, -18],
    [10, 1, 14],
    [11, 1, -6],
    [12, 1, 16],
    [13, 1, -12],
  ],
  impostor: [
    [8, 0.9, 22],
    [3, 1.15, -18],
    [10, 1.3, 12],
    [1, 0.9, -24],
    [12, 1.25, 16],
    [5, 1.1, 8],
    [0, 0.8, -12],
    [9, 0.9, 24],
    [2, 1, -20],
    [13, 1.1, 14],
    [6, 0.9, -8],
    [4, 0.95, 20],
    [11, 1.15, -16],
    [7, 0.85, 10],
  ],
  lineup: [
    [6, 1.15, -20],
    [11, 1.3, 16],
    [4, 0.9, 24],
    [9, 1.1, -12],
    [2, 1.15, -6],
    [13, 1.25, 22],
    [8, 0.85, -18],
    [0, 0.9, 12],
    [12, 1.35, -24],
    [7, 1.2, 18],
    [1, 1.1, -14],
    [10, 1.4, 8],
    [3, 1.25, -10],
    [5, 1.15, 20],
  ],
};

/**
 * The lobby's backdrop, behind the whole page: one full colour that turns
 * every 4 bars, soft lights roaming and game symbols wandering, always. Their
 * fixed arrangements ease into one another when the game changes. While the
 * music is audible the whole page flares to a vivid take of its colour on
 * each beat (more on a bar's first) and each mark lights on a beat of its own,
 * in time with what plays: the delays come from the music's own clock. The
 * ring of keyboard focus turns ink here, where sky would vanish.
 */
export function LobbyBackdrop({ game }: { game: GameKey }) {
  const reduced = useReducedMotion();
  const [body, setBody] = useState<HTMLElement | null>(null);
  // the colours start turning when the lobby shows; the flares join them where they are
  const [born] = useState(() =>
    typeof performance === "undefined" ? 0 : performance.now(),
  );
  const pulse = useMusicPulse();
  const audible = pulse !== null;
  const [markClock, setMarkClock] = useState({ audible, started: born });
  if (markClock.audible !== audible) {
    setMarkClock({ audible, started: performance.now() });
  }
  useEffect(() => {
    setBody(document.body);
    const root = document.documentElement.style;
    root.setProperty("--focus-ring", "var(--ink)");
    return () => {
      root.removeProperty("--focus-ring");
    };
  }, []);
  // Marks keep their DOM and animation clock while their positions and icons change.
  const beat = useMemo(() => {
    if (pulse === null) return null;
    const now = performance.now();
    return {
      delay: beatDelay(pulse, now),
      marks: beatDelay(pulse, markClock.started),
      turn: (born - now) / 1000,
    };
  }, [pulse, born, markClock.started]);
  if (!body) return null;
  return createPortal(
    <m.div
      aria-hidden="true"
      data-game={game}
      className="lobby-backdrop pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0.15 : 0.9, ease: [0.65, 0, 0.35, 1] }}
    >
      <div className="aurora-fill" />
      {GLOWS.map(([c, left, top, size, dx, dy, ahead]) => (
        <div
          key={`${left}-${top}`}
          className="aurora-glow"
          style={
            {
              "--glow": `var(--lobby-glow-${c})`,
              "--dx": dx,
              "--dy": dy,
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              animationDelay: `-${ahead}s`,
            } as CSSProperties
          }
        />
      ))}
      <div data-beating={beat ? "" : undefined}>
        {MARKS.map(([left, top, , bob, on, wx, wy], i) => {
          const [destination, scale, rotate] = ARRANGEMENTS[game][i];
          const [nextLeft, nextTop, size] = MARKS[destination];
          const nextSize = Math.round(size * scale);
          return (
            <span
              key={`${left}-${top}`}
              className="aurora-slot"
              style={{
                left: `${nextLeft}%`,
                top: `${nextTop}%`,
                width: nextSize,
                height: nextSize,
                fontSize: nextSize,
                rotate: `${rotate}deg`,
              }}
            >
              <span
                className="aurora-wander"
                style={
                  {
                    "--wx": `${wx}px`,
                    "--wy": `${wy}px`,
                    animationDelay: `-${(i * 1.7).toFixed(1)}s`,
                  } as CSSProperties
                }
              >
                <span
                  className="aurora-mark"
                  style={{
                    animationDuration: `${bob}s`,
                    animationDelay: `-${(i * 0.9).toFixed(1)}s`,
                  }}
                >
                  <span
                    style={
                      beat
                        ? {
                            animationDelay: `${(beat.marks + on * MUSIC_BEAT).toFixed(4)}s`,
                          }
                        : undefined
                    }
                  >
                    {GAME_KEYS.map((key) => {
                      const icons = ICONS[key];
                      const Icon = icons[i % icons.length];
                      return (
                        <span
                          key={key}
                          className="aurora-icon"
                          data-active={game === key ? "" : undefined}
                        >
                          {Icon === "question" ? (
                            "?"
                          ) : (
                            <Icon strokeWidth={1.75} />
                          )}
                        </span>
                      );
                    })}
                  </span>
                </span>
              </span>
            </span>
          );
        })}
      </div>
      {beat ? (
        <div key={`flashes-${pulse}`}>
          <div
            className="aurora-flash"
            data-on="beat"
            style={{
              animationDelay: `${beat.delay.toFixed(4)}s, ${beat.turn.toFixed(3)}s`,
            }}
          />
          <div
            className="aurora-flash"
            data-on="bar"
            style={{
              animationDelay: `${beat.delay.toFixed(4)}s, ${beat.turn.toFixed(3)}s`,
            }}
          />
        </div>
      ) : null}
    </m.div>,
    body,
  );
}
