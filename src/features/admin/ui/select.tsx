"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { ITEM, POPUP, TRIGGER } from "@/components/ui/filter-select";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

/** The site's filter select (base-ui), with an icon per option; "sm" for a table row. */
export function AdminSelect({
  label,
  value,
  onChange,
  options,
  size = "md",
  disabled,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <Select.Root
      items={options.map((o) => ({ value: o.value, label: o.label }))}
      value={value}
      disabled={disabled}
      onValueChange={(v) => {
        if (v !== null && v !== undefined) onChange(v);
      }}
    >
      <Select.Trigger
        aria-label={label}
        className={cn(
          TRIGGER,
          size === "sm" && "h-8 rounded-[10px] px-2.5 text-[12.5px]",
          "max-w-none disabled:cursor-not-allowed disabled:opacity-55",
          className,
        )}
      >
        {current?.icon ? (
          <span className="flex shrink-0 text-ink-muted">{current.icon}</span>
        ) : null}
        <Select.Value className="min-w-0 flex-1 truncate">
          {() => current?.label ?? ""}
        </Select.Value>
        <Select.Icon className="text-ink-muted">
          <ChevronDown className="size-4" strokeWidth={2} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={6}
          align="start"
          alignItemWithTrigger={false}
          className="z-[95] outline-none"
        >
          <Select.Popup className={cn(POPUP, "max-h-[340px] overflow-y-auto")}>
            <Select.List>
              {options.map((o) => (
                <Select.Item key={o.value} value={o.value} className={ITEM}>
                  {o.icon ? (
                    <span className="flex shrink-0 text-ink-muted">
                      {o.icon}
                    </span>
                  ) : null}
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
