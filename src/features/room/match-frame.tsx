"use client";

import { AnimatePresence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, type Ref, useEffect, useRef, useState } from "react";
import { ThemeTag } from "@/components/ui/screen";
import { Timer } from "@/components/ui/timer";
import { useRoomContext } from "@/features/data/room-context";
import { useStage } from "@/features/stage/stage-context";
import { GiveUpButton } from "@/features/turn/give-up-button";
import {
  HistoryButton,
  HistoryDrawer,
  HistorySidebar,
  useHistorySidebar,
  WIDE,
} from "@/features/turn/history-panel";
import { themeSetEmoji } from "@/game/theme-sets";
import type { BeatKind, Lang, PlayerStatus, ShowView } from "@/game/types";
import { useMedia } from "@/lib/hooks/use-media";
import { dur, ease, gs } from "@/lib/motion";
import { LeaveMatchButton } from "./leave-match-button";

/**
 * Whether the server time `at` has come. Exact without reading the clock:
 * the stage wakes at every moment it lists (tag, clock, history, step start),
 * and `next` is the first of them still ahead, so anything before it is past.
 */
export function useReached(at: number | null): boolean {
  const { next } = useStage();
  return at !== null && (next === null || at < next);
}

/** Whether the step has started (no show or reveal holding it); a step without a start time always has. */
export function useStepStarted(): boolean {
  const { view } = useRoomContext();
  const reached = useReached(view.stepStartsAt);
  return view.stepStartsAt === null || reached;
}

/** The show of that kind while one of these beats runs, for the scene that plays it. */
export function useSceneShow(
  kind: ShowView["kind"],
  beats: readonly BeatKind[],
): ShowView | null {
  const { show, beat } = useStage();
  return show?.kind === kind && beat && beats.includes(beat.kind) ? show : null;
}

/** A header part popping in (scale from `from`, overshooting by `s`); it just fades out. */
const pop = (from: number, s: number, duration: number) => ({
  initial: { opacity: 0, scale: from },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration, ease: gs.backOut(s), opacity: { duration: 0.2 } },
  },
  exit: { opacity: 0, transition: { duration: 0.15 } },
});
const HISTORY_POP = pop(0.3, 2.4, 0.5);
const TAG_POP = pop(0.4, 2.2, 0.5);
const CLOCK_POP = pop(0.6, 2.5, 0.4);

interface HistoryControl {
  open: boolean;
  onToggle: () => void;
  ref: Ref<HTMLButtonElement>;
}

/**
 * The match's frame, mounted once for the whole match so it never remounts
 * between the theme, vote, pick and turn screens: the header over the screen
 * and, during the turns, the history. On wide windows the history is a
 * full-height bar on the left that pushes header and screen aside; on
 * narrower ones a drawer from the left over a scrim.
 */
export function MatchFrame({ children }: { children: ReactNode }) {
  const { screen, historyFrom } = useStage();
  const wide = useMedia(WIDE);
  const shown = useReached(screen === "turn" ? historyFrom : null);
  // remembered per browser; never open before the button exists, so it doesn't push a scene
  const [remembered, setRemembered] = useHistorySidebar();
  const [drawer, setDrawer] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!shown) setDrawer(false);
  }, [shown]);
  const open = shown && (wide ? remembered : drawer);
  const close = () => {
    if (wide) setRemembered(false);
    else setDrawer(false);
    button.current?.focus();
  };

  return (
    <m.div
      exit={{ opacity: 0, transition: { duration: dur.base, ease: ease.soft } }}
      className="flex min-h-dvh w-full"
    >
      <AnimatePresence>
        {wide && open ? <HistorySidebar key="history" onClose={close} /> : null}
      </AnimatePresence>
      <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 pb-[calc(2rem+var(--dock))] short:gap-2 short:pb-[calc(1rem+var(--dock))] sm:gap-3 sm:px-8 sm:short:gap-2">
        <MatchHeader
          history={
            shown
              ? {
                  open,
                  ref: button,
                  onToggle: () =>
                    wide ? setRemembered(!remembered) : setDrawer(!drawer),
                }
              : null
          }
        />
        <main className="w-full min-w-0 flex-1">{children}</main>
      </div>
      {wide ? null : <HistoryDrawer open={open} onClose={close} />}
    </m.div>
  );
}

/** Statuses that wait on this player's input. */
const AWAITED = new Set<PlayerStatus>([
  "theming",
  "voting",
  "picking",
  "asking",
  "answering",
  "guessing",
  "validating",
]);

/**
 * The clock waits on this player: only then it turns red and ticks near the
 * end, and the tab calls them back.
 */
export const isAwaited = (status: PlayerStatus) => AWAITED.has(status);

/**
 * Left: the history button (turns only) and the theme tag. Right: the step
 * clock, then leave and give up (turns only). Each part pops in when it arrives live
 * (at the times the stage gives); one already there on mount just shows.
 */
export function MatchHeader({ history }: { history: HistoryControl | null }) {
  const t = useTranslations("room");
  const lang = useLocale() as Lang;
  const { view, me, offset } = useRoomContext();
  const frame = useStage();
  const tagReached = useReached(frame.themeFrom);
  const clockReached = useReached(frame.clockFrom);
  const clockShown =
    frame.clockFrom !== null && (!frame.clockPops || clockReached);
  const canGiveUp = !me.gaveUp && me.discoveredAt === null && !me.away;
  // the header comes in with the match (after the lobby leaves); joined later, it is just there
  const [arrives] = useState(() => frame.beat?.kind === "curtain");
  const theme = tagReached ? view.theme : null;

  return (
    <m.header
      initial={arrives ? { opacity: 0 } : false}
      animate={{ opacity: 1, transition: { duration: 0.4 } }}
      className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-[18px] sm:short:py-3"
    >
      {/* no own width (the tag truncates): the header wraps only when the tag would get under 6rem */}
      <div className="flex min-w-24 flex-1 basis-0 items-center gap-2.5">
        <AnimatePresence initial={false}>
          {history ? (
            <m.div key="history" {...HISTORY_POP} className="flex shrink-0">
              <HistoryButton
                ref={history.ref}
                open={history.open}
                onClick={history.onToggle}
              />
            </m.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {theme ? (
            <m.div key="tag" {...TAG_POP} className="flex min-w-0">
              <ThemeTag
                label={t("theme")}
                theme={theme[lang]}
                emoji={theme.set === null ? "✍️" : themeSetEmoji(theme.set)}
              />
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <AnimatePresence initial={false}>
          {clockShown ? (
            <m.div
              key="clock"
              {...CLOCK_POP}
              // only a show's clock pops; the one under an answers or guess reveal recharges as ever
              initial={frame.clockPops ? CLOCK_POP.initial : false}
              className="flex"
            >
              <Timer
                deadline={view.deadline}
                stepStartsAt={view.stepStartsAt}
                // a show's clock appears when its step starts: never a refill
                rechargeFrom={
                  frame.clockPops
                    ? view.stepStartsAt
                    : (view.reveal?.startsAt ?? null)
                }
                offset={offset}
                totalMs={view.stepMs}
                alarm={isAwaited(me.status)}
              />
            </m.div>
          ) : null}
        </AnimatePresence>
        <LeaveMatchButton />
        <AnimatePresence initial={false}>
          {history && canGiveUp ? (
            <m.div key="give-up" {...HISTORY_POP} className="flex">
              <GiveUpButton />
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
    </m.header>
  );
}
