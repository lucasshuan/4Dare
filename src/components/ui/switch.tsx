"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn } from "@/lib/cn";

/** An on/off switch: a pill that turns sky when on. Label it with `aria-label` or a wrapping <label>. */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...aria
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}) {
  return (
    <BaseSwitch.Root
      checked={checked}
      onCheckedChange={(c) => onCheckedChange(c)}
      disabled={disabled}
      nativeButton
      render={<button type="button" />}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-pill bg-line-strong p-[3px] transition-colors duration-200 ease-soft data-checked:bg-sky data-disabled:opacity-45",
        className,
      )}
      {...aria}
    >
      <BaseSwitch.Thumb className="size-[18px] rounded-pill bg-surface shadow-card transition-transform duration-200 ease-soft data-checked:translate-x-4" />
    </BaseSwitch.Root>
  );
}
