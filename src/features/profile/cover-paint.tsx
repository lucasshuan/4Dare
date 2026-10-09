import type { CSSProperties } from "react";
import {
  type Banner,
  DEFAULT_COVER,
  type Pattern,
  type Tint,
} from "@/game/profile/profile";
import { cn } from "@/lib/cn";

/** A palette colour as CSS: the avatar's pastel deepened (lighter in the dark theme), or the theme's value. */
export const tintColor = (tint: Tint, avatarColor: string) =>
  tint === "avatar"
    ? `oklch(from ${avatarColor} var(--tint-avatar-l) clamp(0.06, calc(c * var(--tint-avatar-c)), 0.16) h)`
    : `var(--tint-${tint})`;

/** The profile's accent (the XP ring, the tabs, the garden's flowers) and its soft tint. */
export const accentStyle = (accent: Tint | null, avatarColor: string) => {
  const c = tintColor(accent ?? "sky", avatarColor);
  return {
    "--accent": c,
    "--on-accent": "var(--on-tint)",
    "--accent-soft": `color-mix(in oklab, ${c} 18%, var(--surface))`,
  } as CSSProperties;
};

const svg = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`,
  )}") 0 0 / ${w}px ${h}px repeat`;

const line = (d: string, width = 2.5) =>
  `<path d="${d}" fill="none" stroke="#000" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

const sparkle = (x: number, y: number, r: number) =>
  `<path d="M${x} ${y - r}Q${x + r * 0.15} ${y - r * 0.15} ${x + r} ${y}Q${x + r * 0.15} ${y + r * 0.15} ${x} ${y + r}Q${x - r * 0.15} ${y + r * 0.15} ${x - r} ${y}Q${x - r * 0.15} ${y - r * 0.15} ${x} ${y - r}Z"/>`;

// a speech bubble with a question mark, the logo's
const bubble = (x: number, y: number) =>
  line(
    `M${x + 7} ${y}h14a7 7 0 0 1 7 7v6a7 7 0 0 1-7 7h-10l-6 5v-5.4a7 7 0 0 1-5-6.6v-6a7 7 0 0 1 7-7Z`,
    2.2,
  ) +
  line(`M${x + 11} ${y + 6.5}a3 3 0 1 1 4.2 2.75c-.7.3-1.2.9-1.2 1.6v.9`, 2.2) +
  `<circle cx="${x + 14}" cy="${y + 15}" r="1.3"/>`;

/** Each pattern's tile, black on clear: it masks the marks' colour. */
const MASKS: Record<Exclude<Pattern, "plain">, string> = {
  dots: svg(
    24,
    24,
    '<circle cx="6" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/>',
  ),
  stripes: svg(28, 28, line("M-7 7 7-7M0 28 28 0M21 35 35 21", 6)),
  checks: svg(
    40,
    40,
    '<rect width="20" height="20"/><rect x="20" y="20" width="20" height="20"/>',
  ),
  waves: svg(48, 20, line("M0 10q12-8 24 0t24 0")),
  zigzag: svg(32, 16, line("M0 12 8 4l8 8 8-8 8 8")),
  stars: svg(
    64,
    64,
    `${sparkle(16, 16, 7)}${sparkle(46, 44, 5)}<circle cx="47" cy="14" r="1.6"/><circle cx="14" cy="48" r="1.6"/>`,
  ),
  questions: svg(76, 76, bubble(6, 6) + bubble(44, 42)),
};

// how strong the marks show: the checks are big blocks, kept faint
const STRENGTH: Partial<Record<Pattern, number>> = { checks: 0.35 };

/**
 * A cover's paint, filling its (positioned) parent: a picture, or a colour's
 * soft gradient with its pattern over it. Drawn by CSS, so it stays sharp at
 * any width and follows the theme.
 */
export function CoverPaint({
  banner,
  avatarColor,
  className,
}: {
  banner: Banner | null;
  avatarColor: string;
  className?: string;
}) {
  const box = cn("pointer-events-none absolute inset-0", className);
  if (banner?.kind === "image")
    return (
      <div
        aria-hidden
        className={cn(box, "bg-center bg-cover")}
        style={{
          backgroundColor: avatarColor,
          backgroundImage: `url("${banner.url}")`,
        }}
      />
    );
  const { pattern, tint } = banner ?? DEFAULT_COVER;
  const c = tintColor(tint, avatarColor);
  const mix = (n: number) =>
    `color-mix(in oklab, ${c} ${n}%, var(--cover-base))`;
  return (
    <div
      aria-hidden
      className={box}
      style={{
        background: `radial-gradient(circle at 88% -10%, ${mix(64)}, transparent 55%), radial-gradient(circle at 8% 120%, ${mix(52)}, transparent 50%), linear-gradient(135deg, ${mix(28)}, ${mix(46)})`,
      }}
    >
      {pattern === "plain" ? null : (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: mix(72),
            mask: MASKS[pattern],
            opacity: STRENGTH[pattern] ?? 0.55,
          }}
        />
      )}
    </div>
  );
}
