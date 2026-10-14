"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** How askew each tile of the room code sits, in degrees. */
const TILE_TILT = [-3, 2, -1.5, 2.5, -2];

/** How long "Copied!" stays under the tiles. */
const COPIED_MS = 1600;

/**
 * The room code as game tiles, each a little askew, on one key that copies
 * it. The pointer resting on the key lifts the tiles and shows a small label
 * saying a press copies; the press sinks them and the label says it's done.
 * `onCopy` resolves to whether the code reached the clipboard.
 */
export function CodeTiles({
  code,
  onCopy,
}: {
  code: string;
  onCopy: () => Promise<boolean>;
}) {
  const t = useTranslations("lobby");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(id);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await onCopy()) setCopied(true);
      }}
      className="group relative flex cursor-pointer touch-manipulation gap-2 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-sky focus-visible:outline-offset-4"
    >
      <span className="sr-only">
        {t("codeLabel", { code: code.split("").join(" ") })}
      </span>
      {code.split("").map((c, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: always five cells
          key={i}
          aria-hidden="true"
          style={{ rotate: `${TILE_TILT[i % TILE_TILT.length]}deg` }}
          className="flex h-20 w-14 items-center justify-center rounded-md bg-sunken font-display font-extrabold text-[40px] text-ink shadow-[inset_0_-5px_0_var(--line)] transition-[translate,box-shadow] duration-150 ease-soft group-hover:-translate-y-1 group-hover:shadow-[inset_0_-5px_0_var(--line),0_10px_18px_-10px_rgba(20,16,40,0.35)] group-focus-visible:-translate-y-1 group-active:translate-y-0.5 group-active:shadow-[inset_0_-3px_0_var(--line)] short:h-16 short:text-[34px] sm:w-16 sm:short:w-14"
        >
          {c}
        </span>
      ))}
      <span
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-pill px-2.5 py-1 font-semibold text-[12px] leading-none shadow-pop transition-[opacity,translate,scale,background-color,color] duration-150 ease-soft",
          copied
            ? "bg-yes text-on-yes"
            : "translate-y-1 scale-95 bg-ink text-on-ink opacity-0 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100",
        )}
      >
        {copied ? (
          <>
            <Check className="size-3.5 shrink-0" strokeWidth={3} />
            {t("codeCopied")}
          </>
        ) : (
          <>
            <Copy className="size-3.5 shrink-0" strokeWidth={2.25} />
            {t("copyCode")}
          </>
        )}
      </span>
    </button>
  );
}
