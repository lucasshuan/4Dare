"use client";

import { Popover } from "@base-ui/react/popover";
import { useTranslations } from "next-intl";
import type { DeferredProps } from "@/lib/hooks/use-deferred";
import type { CurrentMatch } from "@/server/contract";
import {
  BADGE_TRIGGER,
  BadgeFace,
  MatchActions,
  MatchChip,
} from "./match-lock";

/** The badge's popover itself, loaded after the page (CurrentMatchBadge shows a stand-in until then). */
export function MatchBadgePopover({
  match,
  open,
  onOpenChange,
  autoFocus,
}: { match: CurrentMatch } & DeferredProps) {
  const t = useTranslations("common.currentMatch");
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger
        autoFocus={autoFocus}
        aria-label={`${t("badge")} · ${match.code}`}
        className={BADGE_TRIGGER}
      >
        <BadgeFace match={match} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" className="z-50">
          <Popover.Popup className="flex w-[min(320px,calc(100vw-2rem))] origin-[var(--transform-origin)] flex-col gap-3 rounded-xl bg-surface p-4 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <Popover.Title className="font-semibold">
              {t("badge")}
            </Popover.Title>
            <MatchChip match={match} />
            <MatchActions match={match} onLeft={() => onOpenChange(false)} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
