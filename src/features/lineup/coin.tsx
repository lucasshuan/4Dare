// The coin, seen from the side and a little from above like in a platformer:
// an oval face with a rim over a reeded edge, all gold. Stacked, the height is
// the amount; whose it is shows by the lane, never by the coin. Drawn once
// (CoinDefs) and reused, so a table of towers is a handful of <use>s.
import { cn } from "@/lib/cn";

/** How much each coin above the first adds, in the coin's 48×15 units. */
export const COIN_EDGE = 6.6;
const EDGE_D = "M1 4.2V10.6A23 3.6 0 0 0 47 10.6V4.2Z";
const REED = Array.from(
  { length: 21 },
  (_, i) => `M${(3 + i * 2.1).toFixed(1)} 4.2V15`,
).join("");

/** The coin's drawing, once per page: every <CoinTower> points at it. */
export function CoinDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="lu-coin-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9c6a0e" />
          <stop offset=".14" stopColor="#e9b93e" />
          <stop offset=".32" stopColor="#fff0b0" />
          <stop offset=".5" stopColor="#f2c94c" />
          <stop offset=".84" stopColor="#c88f1d" />
          <stop offset="1" stopColor="#8f5f0b" />
        </linearGradient>
        <linearGradient id="lu-coin-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c2" />
          <stop offset="1" stopColor="#f0c449" />
        </linearGradient>
        <clipPath id="lu-coin-clip">
          <path d={EDGE_D} />
        </clipPath>
        <symbol id="lu-coin" viewBox="0 0 48 15">
          <path
            d={EDGE_D}
            fill="url(#lu-coin-edge)"
            stroke="#7a5209"
            strokeWidth=".7"
          />
          <path
            d={REED}
            clipPath="url(#lu-coin-clip)"
            stroke="#6e4a08"
            strokeOpacity=".32"
            strokeWidth=".7"
          />
          <ellipse
            cx="24"
            cy="4.2"
            rx="23"
            ry="3.6"
            fill="url(#lu-coin-top)"
            stroke="#7a5209"
            strokeWidth=".7"
          />
          <ellipse
            cx="24"
            cy="4.2"
            rx="17.5"
            ry="2.2"
            fill="none"
            stroke="#c48a17"
            strokeWidth=".8"
          />
          <ellipse
            cx="16"
            cy="3.3"
            rx="6.5"
            ry=".75"
            fill="#ffffff"
            opacity=".75"
          />
        </symbol>
      </defs>
    </svg>
  );
}

/** Coins nudged left and right a little, so a stack looks hand-made. */
const WOBBLE = [0, 2, -1.5, 1];

/**
 * `count` coins stacked; `ghost` more drawn faint on top (a bid's preview).
 * Sized by width: the height follows the count.
 */
export function CoinTower({
  count,
  ghost = 0,
  className,
}: {
  count: number;
  ghost?: number;
  className?: string;
}) {
  const n = count + ghost;
  if (n <= 0) return null;
  const h = 15 + (n - 1) * COIN_EDGE;
  return (
    <svg
      aria-hidden="true"
      viewBox={`-3 0 54 ${h.toFixed(2)}`}
      className={cn("block shrink-0", className)}
      style={{ aspectRatio: `54 / ${h.toFixed(2)}` }}
    >
      {Array.from({ length: n }, (_, i) => (
        <use
          // biome-ignore lint/suspicious/noArrayIndexKey: a stack, bottom up
          key={i}
          href="#lu-coin"
          x={WOBBLE[i % WOBBLE.length]}
          y={h - 15 - i * COIN_EDGE}
          width="48"
          height="15"
          opacity={i >= count ? 0.32 : 1}
        />
      ))}
    </svg>
  );
}
