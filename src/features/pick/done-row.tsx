"use client";

import { Check } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useWithNames } from "@/components/ui/player-name";
import type { PlayerView } from "@/game/types";
import { gs } from "@/lib/motion";

/**
 * Under the confirmed card: everyone's avatar, a tick on those who have
 * picked, and who is still picking ("Done! Waiting for Bia and Rafa", then
 * "Everyone has picked!"). Fixed near the bottom of the window (above the
 * phone's chat bar); it rises in once the card has grown.
 */
export function DoneRow({
  players,
  confirmedIds,
  show,
}: {
  /** In turn order. */
  players: PlayerView[];
  confirmedIds: string[];
  show: boolean;
}) {
  const t = useTranslations("pickCard");
  const locale = useLocale();
  const withNames = useWithNames();
  const list = useMemo(
    () => new Intl.ListFormat(locale, { style: "long", type: "conjunction" }),
    [locale],
  );
  const waiting = players.filter((p) => !confirmedIds.includes(p.id));

  return (
    <AnimatePresence initial={false}>
      {show ? (
        <m.div
          key="done"
          initial={{ opacity: 0, y: 16 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.4, delay: 0.35, ease: gs.p1Out },
          }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(78px+var(--dock))] z-[2] flex flex-col items-center gap-2.5 px-4 sm:bottom-[34px]"
        >
          <div className="flex items-center gap-2.5" aria-hidden>
            {players.map((p) => {
              const done = confirmedIds.includes(p.id);
              return (
                <m.span
                  key={p.id}
                  initial={false}
                  animate={{ opacity: done ? 1 : 0.45 }}
                  transition={{ duration: 0.2 }}
                  className="relative flex"
                >
                  <Avatar avatar={p.avatar} size={36} />
                  <AnimatePresence initial={false}>
                    {done ? (
                      <m.span
                        key="tick"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.4, ease: gs.backOut(3) }}
                        className="-right-1 -bottom-1 absolute flex size-[18px] items-center justify-center rounded-full bg-yes text-on-yes"
                      >
                        <Check className="size-[11px]" strokeWidth={3.5} />
                      </m.span>
                    ) : null}
                  </AnimatePresence>
                </m.span>
              );
            })}
          </div>
          <output className="block max-w-[min(560px,100%)] text-balance text-center font-bold text-[16px] leading-snug">
            {waiting.length
              ? withNames((n) =>
                  t("doneWaiting", {
                    names: list.format(waiting.map((p) => n(p, p.isYou))),
                  }),
                )
              : t("doneAll")}
          </output>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
