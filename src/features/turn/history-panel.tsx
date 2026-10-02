"use client";

import { PanelRightOpen, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AnswerChip, ResultChip } from "@/components/ui/answer-chip";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { PlayerName, useWithNames } from "@/components/ui/player-name";
import { useRoomContext } from "@/features/data/room-context";
import type { HistoryEntryView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useMedia } from "@/lib/hooks/use-media";
import { dur, ease } from "@/lib/motion";

/** "History" in the match header, with how many plays so far; opens the history drawer. */
export function HistoryButton() {
  const t = useTranslations("turn.history");
  const [open, setOpen] = useState(false);
  const { view } = useRoomContext();
  const count = view.history.length;
  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="h-10 max-sm:px-3"
      >
        <PanelRightOpen strokeWidth={1.75} />
        <span className="max-sm:sr-only">{t("title")}</span>
        {count ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-sunken px-1.5 font-mono text-xs tabular-nums">
            {count}
          </span>
        ) : null}
      </Button>
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
  const withNames = useWithNames();
  const { view, me, playerById } = useRoomContext();
  // One tab per player, you first, like the player strip.
  const players = [...view.players].sort(
    (a, b) => Number(b.isYou) - Number(a.isYou),
  );
  const [whose, setWhose] = useState(me.id);
  const wide = useMedia("(min-width: 1024px)");
  const hidden = wide ? { x: "100%" } : { y: "100%" };
  const playsOf = (id: string) => view.history.filter((e) => e.byId === id);
  const entries = playsOf(whose).reverse();
  const selected = playerById(whose);
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
              <ChoiceGroup
                label={t("filter")}
                className="flex-wrap self-start rounded-[22px]"
              >
                {players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={whose === p.id}
                    onClick={() => setWhose(p.id)}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-pill px-3 font-semibold text-sm transition-colors",
                      whose === p.id
                        ? "bg-surface text-ink shadow-card"
                        : "text-ink-muted hover:text-ink",
                    )}
                  >
                    <PlayerName player={p} isYou={p.isYou} />
                    <span className="text-xs tabular-nums opacity-60">
                      {playsOf(p.id).length}
                    </span>
                  </button>
                ))}
              </ChoiceGroup>
              <span className="font-medium text-[13px] text-ink-muted">
                {whose === me.id || !selected
                  ? t("mineCaption", {
                      shown: entries.length,
                      total: view.history.length,
                    })
                  : withNames((n) =>
                      t("playerCaption", {
                        name: n(selected),
                        shown: entries.length,
                        total: view.history.length,
                      }),
                    )}
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
                        {withNames((n) =>
                          t(e.kind === "question" ? "question" : "guess", {
                            name: by ? n(by, by.isYou) : "",
                          }),
                        )}
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
                                  {p ? (
                                    <>
                                      <PlayerName player={p} isYou={p.isYou} />
                                      {": "}
                                    </>
                                  ) : null}
                                  “{a.note}”
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
