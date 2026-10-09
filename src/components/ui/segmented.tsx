"use client";

import { m } from "motion/react";
import { type ReactNode, useId } from "react";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { LayoutMotion } from "./layout-motion";

/**
 * A pill track of choices whose white thumb glides to the one picked (a
 * radio group). Each option may carry an icon or a count. `size` "sm" for a
 * row of short codes (PT EN ES JA).
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  render,
  size = "md",
  className,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  const id = useId();
  return (
    <LayoutMotion>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "inline-flex max-w-full shrink-0 gap-0.5 overflow-x-auto rounded-pill bg-sunken p-1 [scrollbar-width:none]",
          className,
        )}
      >
        {options.map((o) => {
          const on = o === value;
          return (
            // biome-ignore lint/a11y/useSemanticElements: a styled radio, the thumb slides under it
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o)}
              className={cn(
                "relative inline-flex shrink-0 items-center justify-center gap-[7px] whitespace-nowrap rounded-pill font-semibold transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-sky",
                size === "sm"
                  ? "h-[30px] px-2.5 text-[13px]"
                  : "h-9 px-3.5 text-sm",
                on ? "text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {on ? (
                <m.span
                  layoutId={`seg-${id}`}
                  aria-hidden="true"
                  transition={{ duration: 0.34, ease: ease.soft }}
                  className="absolute inset-0 rounded-pill bg-surface shadow-card"
                />
              ) : null}
              <span className="relative inline-flex items-center gap-[7px]">
                {render(o)}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutMotion>
  );
}
