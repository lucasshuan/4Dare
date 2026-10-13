"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

/** The filter selects' parts, alike in every one (the room and game lists). */
export const TRIGGER =
  "flex h-13 min-w-0 flex-1 items-center gap-2.5 rounded-pill border-[1.5px] border-line-strong bg-canvas px-4 text-left max-sm:px-3.5 font-semibold text-sm transition-[border-color,box-shadow] duration-200 ease-soft hover:border-ink-muted data-popup-open:border-sky md:w-52 md:flex-none";
export const POPUP =
  "min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-lg bg-surface p-1.5 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0";
export const ITEM =
  "flex items-center gap-2.5 rounded-md py-2 pr-3 pl-2.5 font-semibold text-sm outline-none select-none data-highlighted:bg-sky-soft";

export interface FilterOption {
  value: string;
  label: string;
  icon: ReactNode;
}

/** A filter as a select, as tall as the search beside it. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <Select.Root
      items={options.map((o) => ({ value: o.value, label: o.label }))}
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v);
      }}
    >
      <Select.Trigger aria-label={label} className={TRIGGER}>
        <span className="flex shrink-0 text-ink-muted max-sm:hidden">
          {current.icon}
        </span>
        <Select.Value className="min-w-0 flex-1 truncate">
          {() => current.label}
        </Select.Value>
        <Select.Icon className="text-ink-muted">
          <ChevronDown className="size-4" strokeWidth={2} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={6}
          align="end"
          alignItemWithTrigger={false}
          className="z-50 outline-none"
        >
          <Select.Popup className={POPUP}>
            <Select.List>
              {options.map((o) => (
                <Select.Item key={o.value} value={o.value} className={ITEM}>
                  <span className="flex shrink-0 text-ink-muted">{o.icon}</span>
                  <Select.ItemText className="flex-1 whitespace-nowrap">
                    {o.label}
                  </Select.ItemText>
                  <Select.ItemIndicator className="text-sky">
                    <Check className="size-4" strokeWidth={2.25} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
