"use client";

import { PanelRightOpen, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AnswerChip, ResultChip } from "@/components/ui/answer-chip";
import { Avatar } from "@/components/ui/avatar";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { useRoomContext } from "@/features/data/room-context";
import type { HistoryEntryView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useMedia } from "@/lib/hooks/use-media";
import { dur, ease } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";

/** The bar at the bottom of the action column; opens the history drawer. */
export function HistoryPeek() {
  const t = useTranslations("turn.history");
  const [open, setOpen] = useState(false);
  const { view, me } = useRoomContext();
  const last = view.history.at(-1);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-auto flex min-h-16 w-full items-center gap-3 rounded-lg bg-surface px-4 py-3 text-left max-lg:sticky max-lg:bottom-3 max-lg:z-20 max-lg:shadow-pop"
      >
        {last ? (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-pill font-mono text-[13px]",
              last.byId === me.id ? "bg-sky-soft" : "bg-sunken",
            )}
          >
            {last.n}
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium text-ink-muted text-xs">
            {last ? t("last") : t("empty")}
          </span>
          {last ? (
            <span className="truncate font-semibold text-sm">
              {summary(last)}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2 font-semibold text-sm">
          <PanelRightOpen className="size-5" strokeWidth={1.75} />
          {t("title")}
        </span>
      </button>
      <HistoryDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const summary = (e: HistoryEntryView) =>
  e.kind === "guess" ? `“${e.text}”` : e.text;

function HistoryDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("turn.history");
  const name = useDisplayName();
  const { view, me, playerById } = useRoomContext();
  const [mine, setMine] = useState(true);
  const wide = useMedia("(min-width: 1024px)");
  const hidden = wide ? { x: "100%" } : { y: "100%" };
  const entries = [...view.history]
    .reverse()
    .filter((e) => !mine || e.byId === me.id);
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-40">
          <motion.button
            type="button"
            aria-label={t("close")}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-scrim"
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            initial={hidden}
            animate={{
              x: 0,
              y: 0,
              transition: { duration: dur.slow, ease: ease.soft },
            }}
            exit={{
              ...hidden,
              transition: { duration: dur.base, ease: ease.soft },
            }}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            className="absolute flex w-full flex-col bg-surface shadow-pop max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[85dvh] max-lg:rounded-t-xl lg:inset-y-0 lg:right-0 lg:max-w-110 lg:rounded-l-xl"
          >
            <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
              <h2 className="font-bold font-display text-3xl">{t("title")}</h2>
              <button
                type="button"
                ref={(el) => el?.focus()}
                onClick={onClose}
                aria-label={t("close")}
                className="flex size-11 items-center justify-center rounded-pill border-[1.5px] border-line-strong"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex flex-col gap-2 border-line border-b px-6 pb-4">
              <ChoiceGroup label={t("filter")} className="self-start">
                {[true, false].map((m) => (
                  <button
                    key={String(m)}
                    type="button"
                    aria-pressed={mine === m}
                    onClick={() => setMine(m)}
                    className={cn(
                      "h-9 rounded-pill px-4 font-semibold text-sm transition-colors",
                      mine === m
                        ? "bg-surface text-ink shadow-card"
                        : "text-ink-muted",
                    )}
                  >
                    {m ? t("mine") : t("all")}
                  </button>
                ))}
              </ChoiceGroup>
              <span className="font-medium text-[13px] text-ink-muted">
                {mine
                  ? t("mineCaption", {
                      shown: entries.length,
                      total: view.history.length,
                    })
                  : t("allCaption", { total: view.history.length })}
              </span>
            </div>
            <ol className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
              {entries.length === 0 ? (
                <li className="text-ink-muted">{t("nothing")}</li>
              ) : null}
              {entries.map((e) => {
                const by = playerById(e.byId);
                return (
                  <li key={e.n} className="flex gap-3">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-pill font-mono text-[13px]",
                        e.byId === me.id ? "bg-sky-soft" : "bg-sunken",
                      )}
                    >
                      {e.n}
                    </span>
                    <div className="flex min-w-0 flex-col items-start gap-1">
                      <span className="font-semibold text-[13px] text-ink-muted">
                        {t(e.kind === "question" ? "question" : "guess", {
                          name: by ? name(by, by.isYou) : "",
                        })}
                      </span>
                      <p className="text-base">{summary(e)}</p>
                      {e.kind === "guess" ? (
                        <ResultChip result={e.result} />
                      ) : (
                        <div className="flex flex-wrap gap-x-2.5 gap-y-1.5">
                          {e.answers.map((a) => {
                            const p = playerById(a.byId);
                            return (
                              <span
                                key={a.byId}
                                className="inline-flex items-center gap-1.5"
                              >
                                {p ? (
                                  <Avatar
                                    avatar={p.avatar}
                                    isGuest={p.isGuest}
                                    name={p.name}
                                    size={20}
                                  />
                                ) : null}
                                <AnswerChip value={a.value} small />
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {e.kind === "question"
                        ? e.answers
                            .filter((a) => a.note)
                            .map((a) => {
                              const p = playerById(a.byId);
                              return (
                                <p
                                  key={a.byId}
                                  className="text-ink-muted text-sm"
                                >
                                  {p ? `${name(p, p.isYou)}: ` : ""}“{a.note}”
                                </p>
                              );
                            })
                        : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
