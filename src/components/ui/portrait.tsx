"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { usePictureLook } from "@/lib/picture-look";

type Tone = "neutral" | "you" | "other";

const TONE: Record<Tone, string> = {
  neutral: "bg-sunken text-line-strong",
  you: "bg-sky-soft text-sky",
  other: "bg-apricot-soft text-apricot",
};

/** A picture at least this much wider than 4:5 is shown whole, with bands above and below. */
const WIDE_FROM = 0.86;

/** JPEGs are never see-through: one that isn't wide needs no look. */
const opaque = (src: string) => /\.jpe?g($|\?)/i.test(src);

/**
 * A 4:5 picture with a soft fade-in, or a silhouette when there is none. A
 * tall picture is cropped from the top, not the middle: a character's head
 * is almost always there, and it is what makes them recognisable. A wide one
 * (square, landscape) is shown whole, across the full width, on bands in its
 * own colour with the game's "?" marks; a cut-out character stands on them.
 */
export function Portrait({
  src,
  tone = "neutral",
  className,
}: {
  src: string | null;
  tone?: Tone;
  className?: string;
}) {
  // Keyed by the picture, so a new one (a card whose picture changed) fades in from scratch.
  const [loaded, setLoaded] = useState<{
    src: string;
    ok: boolean;
    ratio: number;
  } | null>(null);
  const img = useRef<HTMLImageElement>(null);
  // a picture already there before hydration never fires onLoad: read it as loaded
  useEffect(() => {
    const el = img.current;
    if (src && el?.complete && el.naturalWidth)
      setLoaded({ src, ok: true, ratio: el.naturalWidth / el.naturalHeight });
  }, [src]);
  const state = loaded?.src !== src ? "loading" : loaded.ok ? "ok" : "broken";
  const showImage = src && state !== "broken";
  const wide = state === "ok" && (loaded?.ratio ?? 0) > WIDE_FROM;
  const look = usePictureLook(
    src && state === "ok" && (wide || !opaque(src)) ? src : null,
  );
  const cutout = look?.cutout ?? false;
  const banded = wide || cutout;
  return (
    <span
      className={cn(
        "relative block aspect-[4/5] w-full overflow-hidden rounded-lg transition-[background-color] duration-500 ease-soft",
        TONE[tone],
        banded && "q-marks",
        className,
      )}
      style={
        banded
          ? {
              backgroundColor: `oklch(var(--pic-band-l) ${Math.min(look?.c ?? 0, 0.085)} ${look?.h ?? 0})`,
            }
          : undefined
      }
    >
      {state === "ok" ? null : (
        <svg
          viewBox="0 0 80 100"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden="true"
          className="absolute inset-0 size-full"
        >
          <circle cx="40" cy="42" r="15" fill="currentColor" />
          <path d="M10 100c0-20 13-32 30-32s30 12 30 32z" fill="currentColor" />
        </svg>
      )}
      {showImage ? (
        // biome-ignore lint/performance/noImgElement: remote library pictures of any size
        <img
          ref={img}
          src={src}
          alt=""
          loading="lazy"
          onLoad={(e) =>
            setLoaded({
              src,
              ok: true,
              ratio:
                e.currentTarget.naturalWidth / e.currentTarget.naturalHeight,
            })
          }
          onError={() => setLoaded({ src, ok: false, ratio: 0 })}
          className={cn(
            "absolute transition-opacity duration-500 ease-soft",
            wide
              ? "inset-x-0 top-1/2 h-auto w-full -translate-y-1/2"
              : "inset-0 size-full object-cover object-top",
            wide &&
              !cutout &&
              "shadow-[0_0_0_2px_rgba(255,255,255,0.92),0_8px_18px_-6px_rgba(30,36,51,0.38)]",
            cutout && "drop-shadow-[0_6px_10px_rgba(30,36,51,0.28)]",
            state === "ok" ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
    </span>
  );
}
