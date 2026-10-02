"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "you" | "other";

const TONE: Record<Tone, string> = {
  neutral: "bg-sunken text-line-strong",
  you: "bg-sky-soft text-sky",
  other: "bg-apricot-soft text-apricot",
};

/** A 4:5 picture with a soft fade-in, or a silhouette when there is none. */
export function Portrait({
  src,
  tone = "neutral",
  className,
}: {
  src: string | null;
  tone?: Tone;
  className?: string;
}) {
  const [state, setState] = useState<"loading" | "ok" | "broken">("loading");
  const showImage = src && state !== "broken";
  return (
    <span
      className={cn(
        "relative block aspect-[4/5] w-full overflow-hidden rounded-lg",
        TONE[tone],
        className,
      )}
    >
      <svg
        viewBox="0 0 80 100"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
        className="absolute inset-0 size-full"
      >
        <circle cx="40" cy="42" r="15" fill="currentColor" />
        <path d="M10 100c0-20 13-32 30-32s30 12 30 32z" fill="currentColor" />
      </svg>
      {showImage ? (
        // biome-ignore lint/performance/noImgElement: remote library pictures of any size
        <img
          src={src}
          alt=""
          loading="lazy"
          onLoad={() => setState("ok")}
          onError={() => setState("broken")}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500 ease-soft",
            state === "ok" ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
    </span>
  );
}
