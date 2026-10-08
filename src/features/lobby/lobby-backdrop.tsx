"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { beatDelay, MUSIC_BEAT, useMusicPulse } from "@/lib/music";

/** The soft lights: [their colour (1–3), left %, top %, size px, roam x, roam y, head start s]. */
const GLOWS: [1 | 2 | 3, number, number, number, string, string, number][] = [
  [1, -20, -40, 1000, "160px", "100px", 0],
  [2, 50, 32, 1100, "-180px", "-90px", 10],
  [3, 12, 52, 760, "140px", "-130px", 20],
];

/** The "?" marks: [left %, top %, size px, bob s, beat (of 32) it lights on, wander x px, wander y px]. */
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

/**
 * The lobby's backdrop, behind the whole page: one full colour that turns
 * every 4 bars, soft lights roaming and "?" marks wandering, always. While the
 * music is audible the whole page flares to a vivid take of its colour on
 * each beat (more on a bar's first) and each mark lights on a beat of its own,
 * in time with what plays: the delays come from the music's own clock. The
 * ring of keyboard focus turns ink here, where sky would vanish.
 */
export function LobbyBackdrop() {
  const [body, setBody] = useState<HTMLElement | null>(null);
  // the colours start turning when the lobby shows; the flares join them where they are
  const [born] = useState(() =>
    typeof performance === "undefined" ? 0 : performance.now(),
  );
  const pulse = useMusicPulse();
  useEffect(() => {
    setBody(document.body);
    const root = document.documentElement.style;
    root.setProperty("--focus-ring", "var(--ink)");
    return () => {
      root.removeProperty("--focus-ring");
    };
  }, []);
  // worked out once per start of the music, as the elements that use them mount
  const beat = useMemo(() => {
    if (pulse === null) return null;
    const now = performance.now();
    return { delay: beatDelay(pulse, now), turn: (born - now) / 1000 };
  }, [pulse, born]);
  if (!body) return null;
  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden"
    >
      <div className="aurora-fill" />
      {GLOWS.map(([c, left, top, size, dx, dy, ahead]) => (
        <div
          key={`${left}-${top}`}
          className="aurora-glow"
          style={
            {
              "--glow": `var(--aurora-glow-${c})`,
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
      {/* a new start of the music remounts the marks, so their beats line up with it */}
      <div key={`marks-${pulse}`} data-beating={beat ? "" : undefined}>
        {MARKS.map(([left, top, size, bob, on, wx, wy], i) => (
          <span
            key={`${left}-${top}`}
            className="aurora-wander"
            style={
              {
                "--wx": `${wx}px`,
                "--wy": `${wy}px`,
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `-${(i * 1.7).toFixed(1)}s`,
              } as CSSProperties
            }
          >
            <span
              className="aurora-mark"
              style={{
                fontSize: size,
                animationDuration: `${bob}s`,
                animationDelay: `-${(i * 0.9).toFixed(1)}s`,
              }}
            >
              <span
                style={
                  beat
                    ? {
                        animationDelay: `${(beat.delay + on * MUSIC_BEAT).toFixed(4)}s`,
                      }
                    : undefined
                }
              >
                ?
              </span>
            </span>
          </span>
        ))}
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
    </div>,
    body,
  );
}
