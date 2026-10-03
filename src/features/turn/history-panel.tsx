"use client";

import { History, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AnswerChip, ResultChip } from "@/components/ui/answer-chip";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { PlayerName, useWithNames } from "@/components/ui/player-name";
import { useRoomContext } from "@/features/data/room-context";
import type { HistoryEntryView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useMedia } from "@/lib/hooks/use-media";
import { dur, ease } from "@/lib/motion";

/** Wide windows show the history as a sidebar; narrower ones as a drawer. */
export const WIDE = "(min-width: 1024px)";
const SIDEBAR_KEY = "ludodare:history-sidebar";

type Kind = "all" | HistoryEntryView["kind"];

/**
 * Whether the sidebar is open on wide windows, remembered in this browser so
 * the next match opens the same way.
 */
export function useHistorySidebar() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setOpen(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {}
  }, []);
  const set = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
    } catch {}
  };
  return [open, set] as const;
}

/**
 * "History" right of the clock, with how many plays so far. On wide windows
 * it opens and closes the sidebar; on narrow ones it is a small button that
 * opens a drawer.
 */
export function HistoryButton({
  sidebarOpen,
  onSidebar,
}: {
  sidebarOpen: boolean;
  onSidebar: (open: boolean) => void;
}) {
  const t = useTranslations("turn.history");
  const wide = useMedia(WIDE);
  const [drawer, setDrawer] = useState(false);
  const { view } = useRoomContext();
  const count = view.history.length;
  const open = wide ? sidebarOpen : drawer;
  const Icon = wide ? (open ? PanelRightClose : PanelRightOpen) : History;
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-label={wide ? undefined : t("title")}
        onClick={() => (wide ? onSidebar(!sidebarOpen) : setDrawer(true))}
        className={buttonClass(
          "secondary",
          "sm",
          cn(
            "relative h-10 max-lg:w-10 max-lg:px-0",
            open && "border-ink bg-ink text-on-ink",
          ),
        )}
      >
        <Icon strokeWidth={1.75} />
        <span className="max-lg:sr-only">{t("title")}</span>
        {count ? (
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 font-mono text-xs tabular-nums",
              open ? "bg-on-ink/15" : "bg-sunken",
              // on the small button the count sits on its corner
              "max-lg:-top-1.5 max-lg:-right-1.5 max-lg:absolute max-lg:h-[18px] max-lg:min-w-[18px] max-lg:bg-sky max-lg:px-1 max-lg:text-[11px] max-lg:text-on-ink",
            )}
          >
            {count}
          </span>
        ) : null}
      </button>
      {wide ? null : (
        <HistoryDrawer open={drawer} onClose={() => setDrawer(false)} />
      )}
    </>
  );
}

/** The history beside the screen on wide windows: slides open, scrolls on its own. */
export function HistorySidebar({ onClose }: { onClose: () => void }) {
  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{
        width: "auto",
        opacity: 1,
        transition: { duration: dur.slow, ease: ease.soft },
      }}
      exit={{
        width: 0,
        opacity: 0,
        transition: { duration: dur.base, ease: ease.soft },
      }}
      className="sticky top-6 shrink-0 self-start overflow-hidden"
    >
      {/* fixed width inside, so the text doesn't reflow while it slides */}
      <section
        aria-label={useTranslations("turn.history")("title")}
        className="ml-6 flex h-[calc(100dvh-7.5rem)] w-[clamp(320px,26vw,420px)] flex-col overflow-hidden rounded-xl bg-surface shadow-card short:h-[calc(100dvh-6rem)]"
      >
        <HistoryBody onClose={onClose} />
      </section>
    </motion.aside>
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
            initial={{ y: "100%" }}
            animate={{
              y: 0,
              transition: { duration: dur.slow, ease: ease.soft },
            }}
            exit={{
              y: "100%",
              transition: { duration: dur.base, ease: ease.soft },
            }}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            className="absolute inset-x-0 bottom-0 flex h-[85dvh] w-full flex-col rounded-t-xl bg-surface shadow-pop"
          >
            <HistoryBody onClose={onClose} focusClose />
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/** Title, the filters (whose plays, and questions or guesses) and the plays, newest first. */
function HistoryBody({
  onClose,
  focusClose = false,
}: {
  onClose: () => void;
  focusClose?: boolean;
}) {
  const t = useTranslations("turn.history");
  const withNames = useWithNames();
  const { view, me, playerById } = useRoomContext();
  // One tab per player, you first, like the player strip.
  const players = [...view.players].sort(
    (a, b) => Number(b.isYou) - Number(a.isYou),
  );
  const [whose, setWhose] = useState(me.id);
  const [kind, setKind] = useState<Kind>("all");
  const playsOf = (id: string) => view.history.filter((e) => e.byId === id);
  const theirs = playsOf(whose);
  const entries = theirs
    .filter((e) => kind === "all" || e.kind === kind)
    .reverse();
  const selected = playerById(whose);
  const kinds: Kind[] = ["all", "question", "guess"];
  const kindCount = (k: Kind) =>
    k === "all" ? theirs.length : theirs.filter((e) => e.kind === k).length;

  return (
    <>
      <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3 sm:px-6">
        <h2 className="font-bold font-display text-2xl">{t("title")}</h2>
        <button
          type="button"
          ref={focusClose ? (el) => el?.focus() : undefined}
          onClick={onClose}
          aria-label={t("close")}
          className="flex size-10 items-center justify-center rounded-pill border-[1.5px] border-line-strong transition-colors hover:bg-sunken"
        >
          <X className="size-5" strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex flex-col gap-2.5 border-line border-b px-5 pb-4 sm:px-6">
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
        <fieldset className="m-0 flex gap-1.5 border-0 p-0">
          <legend className="sr-only">{t("kindFilter")}</legend>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-pill border-[1.5px] px-3 font-semibold text-[13px] transition-colors",
                kind === k
                  ? "border-ink bg-ink text-on-ink"
                  : "border-line-strong text-ink-muted hover:text-ink",
              )}
            >
              {t(`kinds.${k}`)}
              <span className="tabular-nums opacity-60">{kindCount(k)}</span>
            </button>
          ))}
        </fieldset>
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
      <ol className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6">
        {entries.length === 0 ? (
          <li className="text-ink-muted">{t("nothing")}</li>
        ) : null}
        <AnimatePresence initial={false}>
          {entries.map((e) => {
            const by = playerById(e.byId);
            return (
              <motion.li
                key={e.n}
                layout="position"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="flex gap-3"
              >
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
                            <p key={a.byId} className="text-ink-muted text-sm">
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
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </>
  );
}
