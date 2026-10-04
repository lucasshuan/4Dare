"use client";

import { Dialog } from "@base-ui/react/dialog";
import { CheckCheck, Hourglass } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PlayerName } from "@/components/ui/player-name";
import type { PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/lib/motion";

const swap = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: dur.fast, ease: ease.soft },
} as const;

/**
 * The host pressed "Start" while someone has not confirmed: start anyway, or
 * wait. It follows the room live: a player who confirms leaves the list, and
 * once nobody is missing it says so.
 */
export function StartDialog({
  open,
  onClose,
  waiting,
  pending,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  /** Who has not confirmed yet, the host aside. */
  waiting: PlayerView[];
  pending: boolean;
  onStart: () => void;
}) {
  const t = useTranslations("lobby.confirmStart");
  const all = waiting.length === 0;
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-scrim transition-opacity duration-200 ease-soft data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-5 rounded-xl bg-canvas p-6 shadow-pop outline-none transition-[scale,opacity] duration-200 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0 sm:p-7">
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-pill transition-colors duration-300 ease-soft",
              all ? "bg-yes-soft text-yes" : "bg-butter-soft text-ink",
            )}
          >
            <AnimatePresence initial={false} mode="wait">
              <m.span
                key={all ? "all" : "waiting"}
                className="flex"
                initial={{ scale: 0.4, rotate: -30, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.4, rotate: 30, opacity: 0 }}
                transition={{ duration: dur.base, ease: ease.soft }}
              >
                {all ? (
                  <CheckCheck className="size-6" strokeWidth={2} />
                ) : (
                  <Hourglass className="size-6" strokeWidth={1.75} />
                )}
              </m.span>
            </AnimatePresence>
          </span>

          <div className="flex flex-col gap-3">
            <Dialog.Title className="font-bold font-display text-2xl">
              <AnimatePresence initial={false} mode="wait">
                <m.span
                  key={all ? "all" : "waiting"}
                  className="block"
                  {...swap}
                >
                  {all ? t("allTitle") : t("title")}
                </m.span>
              </AnimatePresence>
            </Dialog.Title>
            <Dialog.Description className="text-ink-muted" render={<div />}>
              <AnimatePresence initial={false} mode="wait">
                {all ? (
                  <m.p key="all" {...swap}>
                    {t("allBody")}
                  </m.p>
                ) : (
                  <m.div
                    key="waiting"
                    className="flex flex-col gap-2.5"
                    {...swap}
                  >
                    <p>{t("waiting", { count: waiting.length })}</p>
                    <ul className="flex flex-wrap gap-2">
                      <AnimatePresence initial={false} mode="popLayout">
                        {waiting.map((p) => (
                          <m.li
                            key={p.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: dur.base, ease: ease.soft }}
                            className="rounded-pill bg-surface px-3 py-1.5 font-semibold text-ink text-sm shadow-card"
                          >
                            <PlayerName player={p} />
                          </m.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </m.div>
                )}
              </AnimatePresence>
            </Dialog.Description>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => {
                onStart();
                onClose();
              }}
            >
              {all ? t("start") : t("startAnyway")}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              {t("wait")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
