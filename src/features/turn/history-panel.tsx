"use client";

import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { type Ref, useEffect, useRef, useState } from "react";
import { AnswerChip, ResultChip } from "@/components/ui/answer-chip";
import { Avatar } from "@/components/ui/avatar";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { PlayerName, useWithNames } from "@/components/ui/player-name";
import { useRoomContext } from "@/features/data/room-context";
import type { HistoryEntryView } from "@/game/types";
import { cn } from "@/lib/cn";
import { gs } from "@/lib/motion";
import { seatInk, seatSoft } from "@/lib/seats";

/** Wide windows show the history as a bar that pushes the screen; narrower ones as a drawer over it. */
export const WIDE = "(min-width: 1024px)";
const SIDEBAR_KEY = "ludodare:history-sidebar";
/** The bar's width on wide windows (px). */
const SIDEBAR_WIDTH = 360;

type Kind = "all" | HistoryEntryView["kind"];

/**
 * Whether the bar is open on wide windows, remembered in this browser so the
 * next match opens the same way.
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
 * "History" left of the theme, with how many plays so far: inked while the
 * history is open. On phones an icon button with the count on its corner.
 */
export function HistoryButton({
  open,
  onClick,
  ref,
}: {
  open: boolean;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  const t = useTranslations("turn.history");
  const { view } = useRoomContext();
  const count = view.history.length;
  const Icon = open ? PanelLeftClose : PanelLeftOpen;
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-pill border-[1.5px] font-semibold text-sm transition-colors duration-150 max-lg:w-10 lg:px-3",
        open
          ? "border-ink bg-ink text-on-ink"
          : "border-line-strong bg-surface text-ink hover:bg-sunken",
      )}
    >
      <Icon className="size-[19px]" strokeWidth={1.75} />
      <span className="max-lg:sr-only">{t("title")}</span>
      {count ? (
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 font-medium font-mono text-xs tabular-nums",
            open ? "bg-on-ink/18 text-on-ink" : "bg-sunken text-ink",
            // on the small button the count sits on its corner
            "max-lg:-top-1.5 max-lg:-right-1.5 max-lg:absolute max-lg:h-[18px] max-lg:min-w-[18px] max-lg:bg-sky max-lg:px-1 max-lg:text-[11px] max-lg:text-on-sky",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Wide windows: a full-height flat bar on the left. Its width opens from 0,
 * pushing the header and the screen aside, while the panel inside keeps its
 * width, anchored right, so it seems to slide in from the edge.
 */
export function HistorySidebar({ onClose }: { onClose: () => void }) {
  const t = useTranslations("turn.history");
  return (
    <m.div
      initial={{ width: 0 }}
      animate={{
        width: SIDEBAR_WIDTH,
        transition: { duration: 0.55, ease: gs.p3Out },
      }}
      exit={{ width: 0, transition: { duration: 0.4, ease: gs.p3In } }}
      // over the turn band and a guess's scene, like the match header
      className="sticky top-0 z-[38] flex h-dvh shrink-0 justify-end self-start overflow-hidden"
    >
      <section
        aria-label={t("title")}
        className="flex h-full w-[360px] shrink-0 flex-col border-line border-r bg-surface"
      >
        <HistoryBody onClose={onClose} />
      </section>
    </m.div>
  );
}

/** Phones and narrow windows: a drawer from the left over a scrim; Escape, the scrim or X close it. */
export function HistoryDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("turn.history");
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open ? (
        <div key="history" className="fixed inset-0 z-40">
          <m.button
            type="button"
            tabIndex={-1}
            aria-label={t("close")}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="absolute inset-0 bg-scrim"
          />
          <m.section
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            initial={{ x: "-100%" }}
            animate={{ x: 0, transition: { duration: 0.55, ease: gs.p3Out } }}
            exit={{ x: "-100%", transition: { duration: 0.4, ease: gs.p3In } }}
            className="absolute inset-y-0 left-0 flex w-[88vw] flex-col overflow-hidden rounded-r-[28px] bg-surface pt-[env(safe-area-inset-top)] shadow-pop"
          >
            <HistoryBody onClose={onClose} focusClose />
          </m.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

const summary = (e: HistoryEntryView) =>
  e.kind === "guess" ? `“${e.text}”` : e.text;

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
  // One tab per player: you first, then the others in turn order, like the player strip.
  const players = [...view.players].sort(
    (a, b) =>
      Number(b.isYou) - Number(a.isYou) ||
      (a.turnOrder ?? a.seat + 99) - (b.turnOrder ?? b.seat + 99),
  );
  const [whose, setWhose] = useState(me.id);
  const [kind, setKind] = useState<Kind>("all");
  // Focus the close button once when the drawer opens, not on every render.
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focusClose) closeRef.current?.focus();
  }, [focusClose]);
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
      <div className="flex items-center justify-between gap-4 pt-[18px] pr-4 pb-2.5 pl-[22px]">
        <h2 className="font-display font-extrabold text-[26px] leading-tight">
          {t("title")}
        </h2>
        <button
          type="button"
          ref={closeRef}
          onClick={onClose}
          aria-label={t("close")}
          className="flex size-10 shrink-0 items-center justify-center rounded-pill border-[1.5px] border-line-strong bg-surface transition-colors hover:bg-sunken"
        >
          <X className="size-[18px]" strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex flex-col gap-2.5 border-line border-b px-[22px] pb-3.5">
        <ChoiceGroup
          label={t("filter")}
          className="flex-wrap gap-0.5 self-start rounded-[22px]"
        >
          {players.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={whose === p.id}
              onClick={() => setWhose(p.id)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-pill px-2.5 font-semibold text-[13px] transition-colors",
                whose === p.id
                  ? "bg-surface text-ink shadow-card"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <PlayerName player={p} isYou={p.isYou} />
              <span className="text-[11.5px] tabular-nums opacity-60">
                {playsOf(p.id).length}
              </span>
            </button>
          ))}
        </ChoiceGroup>
        <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
          <legend className="sr-only">{t("kindFilter")}</legend>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "inline-flex h-[30px] items-center gap-1.5 rounded-pill border-[1.5px] px-3 font-semibold text-[13px] transition-colors",
                kind === k
                  ? "border-ink bg-ink text-on-ink"
                  : "border-line-strong text-ink-muted hover:text-ink",
              )}
            >
              {t(`kinds.${k}`)}
              <span className="text-[11.5px] tabular-nums opacity-60">
                {kindCount(k)}
              </span>
            </button>
          ))}
        </fieldset>
        <span className="font-medium text-[12.5px] text-ink-muted leading-[1.4]">
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
      <ol className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-[22px] py-4">
        {entries.length === 0 ? (
          <li className="text-[15px] text-ink-muted leading-[1.45]">
            {t("nothing")}
          </li>
        ) : null}
        <LayoutMotion>
          <AnimatePresence initial={false}>
            {entries.map((e) => {
              const by = playerById(e.byId);
              return (
                <m.li
                  key={`${e.kind}-${e.n}`}
                  layout="position"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  className="flex gap-3"
                >
                  {/* the round's number in its player's colour: one glance finds someone's plays */}
                  <span
                    style={
                      by
                        ? {
                            backgroundColor: seatSoft(by.colorSlot),
                            color: seatInk(by.colorSlot),
                          }
                        : undefined
                    }
                    className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-sunken font-medium font-mono text-[13px]"
                  >
                    {e.n}
                  </span>
                  <div className="flex min-w-0 flex-col items-start gap-[5px]">
                    <span className="font-semibold text-[13px] text-ink-muted">
                      {withNames((n) =>
                        t(e.kind === "question" ? "question" : "guess", {
                          name: by ? n(by, by.isYou) : "",
                        }),
                      )}
                    </span>
                    <p className="text-base leading-[1.35]">{summary(e)}</p>
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
                </m.li>
              );
            })}
          </AnimatePresence>
        </LayoutMotion>
      </ol>
    </>
  );
}
