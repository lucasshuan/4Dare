"use client";

import { Popover } from "@base-ui/react/popover";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * A field label with a small info badge; the hint opens on hover (label or
 * badge) and on tap, so phones see it too. Screen readers get the hint as the
 * field's description through `hintId`.
 */
export function HintLabel({
  children,
  hint,
  hintId,
  className,
}: {
  children: React.ReactNode;
  hint: string;
  /** Put it in the field's aria-describedby. */
  hintId?: string;
  className?: string;
}) {
  const t = useTranslations("common");
  const fallbackId = useId();
  const triggerId = useId();
  const id = hintId ?? fallbackId;
  return (
    <Popover.Root>
      <span id={id} className="sr-only">
        {hint}
      </span>
      <Popover.Trigger
        id={triggerId}
        openOnHover
        delay={80}
        closeDelay={120}
        className={cn(
          "group inline-flex items-center gap-1.5 self-start rounded-sm font-semibold text-sm",
          className,
        )}
      >
        {children}
        {/* the button would otherwise share its name with the field */}
        <span className="sr-only">{`, ${t("moreInfo")}`}</span>
        <span
          aria-hidden
          className="flex size-4.5 items-center justify-center rounded-full bg-sunken text-ink-muted transition-colors duration-200 ease-soft group-hover:text-ink group-data-popup-open:bg-ink group-data-popup-open:text-on-ink"
        >
          <Info className="size-3" strokeWidth={2.5} />
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="top"
          align="start"
          sideOffset={8}
          className="z-50"
        >
          <Popover.Popup
            aria-labelledby={triggerId}
            className="w-max max-w-[min(300px,calc(100vw-2rem))] origin-[var(--transform-origin)] rounded-md bg-surface px-3 py-2 font-medium text-[13px] text-ink-muted leading-snug shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0"
          >
            {hint}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
