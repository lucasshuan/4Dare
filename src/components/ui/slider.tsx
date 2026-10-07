"use client";

import { Slider as BaseSlider } from "@base-ui/react/slider";
import { cn } from "@/lib/cn";

/** A 0–100 slider: a sky fill on a sunken track, a round thumb. */
export function Slider({
  value,
  onValueChange,
  label,
  disabled,
  className,
}: {
  value: number;
  onValueChange: (value: number) => void;
  /** Read by screen readers on the thumb. */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <BaseSlider.Root
      value={value}
      min={0}
      max={100}
      step={5}
      disabled={disabled}
      onValueChange={(v) => onValueChange(Array.isArray(v) ? v[0] : v)}
      className={cn("data-disabled:opacity-40", className)}
    >
      <BaseSlider.Control className="flex w-full touch-none select-none items-center py-2.5">
        <BaseSlider.Track className="h-1.5 w-full select-none rounded-pill bg-sunken">
          <BaseSlider.Indicator className="select-none rounded-pill bg-sky" />
          <BaseSlider.Thumb
            aria-label={label}
            className="size-[18px] select-none rounded-pill border-2 border-sky bg-surface shadow-card has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-sky has-[:focus-visible]:outline-offset-2"
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
