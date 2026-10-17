"use client";

import { Popover } from "@base-ui/react/popover";
import { DoorOpen, Ellipsis, Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SoundToggle } from "@/components/ui/sound-toggle";
import { ThemeSwitch } from "@/components/ui/theme-toggle";
import { useRoomContext } from "@/features/data/room-context";
import { GiveUpConfirm } from "@/features/who-am-i/turn/give-up-button";
import { cn } from "@/lib/cn";
import { LeaveConfirm, useWatchOut } from "./leave-match-button";

const row =
  "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left font-semibold text-[15px] text-no transition-colors duration-150 hover:bg-no-soft active:bg-no-soft [&_svg]:size-5";

/**
 * Phones: the match header's keys behind one round "Options" key, so the
 * header keeps to a single row beside the clock and never jumps as the clock
 * comes and goes. Sound and theme sit on top as the same keys; under them,
 * give up (turns only) and leave, each asking first in the same popup.
 */
export function MatchMenu({
  giveUp,
  className,
}: {
  /** The turns' "Give up" is on offer. */
  giveUp: boolean;
  className?: string;
}) {
  const t = useTranslations("room");
  const tMatch = useTranslations("common.currentMatch");
  const tGiveUp = useTranslations("whoAmI.turn.giveUp");
  const { me, watching } = useRoomContext();
  const watchOut = useWatchOut();
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState<"giveUp" | "leave" | null>(null);
  const close = () => setOpen(false);
  return (
    <Popover.Root
      open={open}
      onOpenChange={setOpen}
      // back to the list once the popup has faded, never while it shows
      onOpenChangeComplete={(next) => {
        if (!next) setAsk(null);
      }}
    >
      <Popover.Trigger
        aria-label={t("options")}
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface text-ink transition-colors duration-200 ease-soft data-popup-open:bg-ink data-popup-open:text-on-ink dark:bg-sunken",
          className,
        )}
      >
        <Ellipsis className="size-5" strokeWidth={2} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="flex w-[min(300px,calc(100vw-2rem))] origin-[var(--transform-origin)] flex-col gap-3 rounded-xl bg-surface p-4 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            {ask === "giveUp" ? (
              <GiveUpConfirm onClose={close} />
            ) : ask === "leave" ? (
              <LeaveConfirm onClose={close} />
            ) : (
              <>
                <div className="flex gap-2">
                  <SoundToggle />
                  <ThemeSwitch />
                </div>
                <div className="-mx-1.5 -mb-1.5 flex flex-col border-line border-t pt-1.5">
                  {giveUp ? (
                    <button
                      type="button"
                      className={row}
                      onClick={() => setAsk("giveUp")}
                    >
                      <Flag strokeWidth={2} aria-hidden />
                      {tGiveUp("button")}
                    </button>
                  ) : null}
                  {me.away ? null : (
                    <button
                      type="button"
                      className={row}
                      // someone watching just goes: nobody waits on them
                      onClick={watching ? watchOut : () => setAsk("leave")}
                    >
                      <DoorOpen strokeWidth={1.75} aria-hidden />
                      {tMatch("leave")}
                    </button>
                  )}
                </div>
              </>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
