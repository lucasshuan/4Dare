"use client";

import { Popover } from "@base-ui/react/popover";
import { Ellipsis, Lock, LockOpen, UserRoundX } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/lib/motion";

const swap = {
  initial: { opacity: 0, y: 4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: dur.fast, ease: ease.soft },
  },
  exit: { opacity: 0, transition: { duration: 0.08 } },
} as const;

/**
 * The host's "⋯" on another player's seat. The seat itself stays free for
 * what clicking a player will do (their profile); this holds what the host
 * can do to them. Removing asks once more, in the same popup.
 */
export function PlayerMenu({
  name,
  pending,
  onKick,
}: {
  name: string;
  pending: boolean;
  onKick: () => Promise<unknown>;
}) {
  const t = useTranslations("lobby");
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirming(false);
      }}
    >
      <Popover.Trigger
        aria-label={t("playerActions", { name })}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 ease-soft hover:bg-surface/70 hover:text-ink",
          open && "bg-surface/70 text-ink",
        )}
      >
        <Ellipsis className="size-5" strokeWidth={2} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={6}
          className="z-50"
        >
          <Popover.Popup className="w-[min(260px,calc(100vw-2rem))] origin-(--transform-origin) rounded-md bg-surface p-1.5 shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <AnimatePresence mode="wait" initial={false}>
              {confirming ? (
                <m.div
                  key="confirm"
                  {...swap}
                  className="flex flex-col gap-1 p-2.5"
                >
                  <p className="font-semibold leading-snug">
                    {t("kickTitle", { name })}
                  </p>
                  <p className="text-[13px] text-ink-muted leading-snug">
                    {t("kickBody")}
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={pending}
                      onClick={async () => {
                        await onKick();
                        setOpen(false);
                      }}
                    >
                      {t("kickYes")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirming(false)}
                    >
                      {t("kickNo")}
                    </Button>
                  </div>
                </m.div>
              ) : (
                <m.div key="menu" {...swap}>
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-left font-semibold text-no text-sm transition-colors duration-150 hover:bg-no-soft"
                  >
                    <UserRoundX className="size-4.5 shrink-0" strokeWidth={2} />
                    {t("kick")}
                  </button>
                </m.div>
              )}
            </AnimatePresence>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** The host's pill on a seat: closes an empty one, opens a closed one. */
export function SeatToggle({
  closed,
  pending,
  onClick,
}: {
  closed: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("lobby");
  const Icon = closed ? LockOpen : Lock;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      aria-label={t(closed ? "openSeatLabel" : "closeSeatLabel")}
      className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill bg-surface px-3 font-semibold text-[13px] text-ink-muted shadow-card transition-[color,translate] duration-200 ease-soft hover:-translate-y-px hover:text-ink disabled:pointer-events-none disabled:opacity-45"
    >
      <Icon className="size-3.5" strokeWidth={2.25} />
      {t(closed ? "openSeat" : "closeSeat")}
    </button>
  );
}
