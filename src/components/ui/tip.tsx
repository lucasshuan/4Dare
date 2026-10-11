"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";

/** The ink pill under a top bar key. */
const TIP_POPUP =
  "origin-[var(--transform-origin)] rounded-pill bg-ink px-2.5 py-1 font-semibold text-[12.5px] text-on-ink shadow-pop transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0";

/**
 * Our look in place of the browser's title: a small ink label under a top bar
 * key while the pointer rests on it, or the keyboard is on it. It only names
 * the key, so it never takes the pointer. Phones, with no hover, never see it.
 * `children` is the key itself: an element (or a Base UI trigger) that takes
 * a ref and props. `open` hands the timing to the key (the sound key shows
 * its tip with its slider); `side` moves it off the bottom.
 */
export function Tip({
  label,
  children,
  side = "bottom",
  open,
}: {
  label: ReactNode;
  children: ReactElement;
  side?: "bottom" | "left";
  open?: boolean;
}) {
  return (
    <Tooltip.Root disableHoverablePopup open={open}>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner
          side={side}
          sideOffset={8}
          className="pointer-events-none z-50"
        >
          <Tooltip.Popup className={TIP_POPUP}>{label}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Moving from one key to the next shows its tip at once, without the wait. */
export function TipProvider({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider delay={350} closeDelay={0} timeout={400}>
      {children}
    </Tooltip.Provider>
  );
}
