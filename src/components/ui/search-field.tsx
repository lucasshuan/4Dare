"use client";

import { Search, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { cn } from "@/lib/cn";

/** A list page's search, as the characters and Workshop pages draw it, with a button that clears it. */
export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  clearLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  clearLabel: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex h-[46px] max-w-[420px] flex-[1_1_260px] items-center gap-2.5 rounded-[16px] border border-line-strong bg-surface px-3.5 transition-[border-color,box-shadow] duration-150 focus-within:border-sky focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--sky)_22%,transparent)]",
        className,
      )}
    >
      <Search className="size-5 shrink-0 text-ink-muted" strokeWidth={1.75} />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-muted focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <AnimatePresence>
        {value ? (
          <m.button
            type="button"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            aria-label={clearLabel}
            onClick={() => onChange("")}
            className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-sunken text-ink-muted hover:text-ink"
          >
            <X className="size-3.5" strokeWidth={2.25} />
          </m.button>
        ) : null}
      </AnimatePresence>
    </label>
  );
}
