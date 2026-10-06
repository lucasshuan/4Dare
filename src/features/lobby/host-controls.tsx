"use client";

import { Popover } from "@base-ui/react/popover";
import { ChevronDown } from "lucide-react";
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

export interface SeatAction {
  label: string;
  danger?: boolean;
  /** Asked once more, in the same popup, before `run`. */
  confirm?: { title: string; body: string; yes: string };
  run: () => void;
}

/**
 * The host's one control on a seat: the same quiet button on every seat it
 * fits, opening a dropdown of what the host can do there. The seat itself
 * stays free for what clicking a player will do (their profile).
 */
export function SeatMenu({
  label,
  actions,
}: {
  label: string;
  actions: SeatAction[];
}) {
  const t = useTranslations("lobby");
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState<SeatAction | null>(null);
  const done = (action: SeatAction) => {
    setOpen(false);
    action.run();
  };
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setAsking(null);
      }}
    >
      <Popover.Trigger
        aria-label={label}
        className={cn(
          "ml-auto flex size-8 shrink-0 items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 ease-soft hover:bg-surface/70 hover:text-ink",
          open && "bg-surface/70 text-ink",
        )}
      >
        <ChevronDown
          className={cn(
            "size-4.5 transition-transform duration-200 ease-soft",
            open && "rotate-180",
          )}
          strokeWidth={2.25}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={6}
          className="z-50"
        >
          <Popover.Popup className="w-[min(240px,calc(100vw-2rem))] origin-(--transform-origin) rounded-md bg-surface p-1.5 shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <AnimatePresence mode="wait" initial={false}>
              {asking?.confirm ? (
                <m.div
                  key="confirm"
                  {...swap}
                  className="flex flex-col gap-1 p-2.5"
                >
                  <p className="font-semibold leading-snug">
                    {asking.confirm.title}
                  </p>
                  <p className="text-[13px] text-ink-muted leading-snug">
                    {asking.confirm.body}
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      variant={asking.danger ? "danger" : "primary"}
                      size="sm"
                      onClick={() => done(asking)}
                    >
                      {asking.confirm.yes}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAsking(null)}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </m.div>
              ) : (
                <m.div key="menu" {...swap} className="flex flex-col">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() =>
                        action.confirm ? setAsking(action) : done(action)
                      }
                      className={cn(
                        "w-full rounded-sm px-3 py-2.5 text-left font-semibold text-sm transition-colors duration-150",
                        action.danger
                          ? "text-no hover:bg-no-soft"
                          : "text-ink hover:bg-sunken",
                      )}
                    >
                      {action.label}
                    </button>
                  ))}
                </m.div>
              )}
            </AnimatePresence>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
