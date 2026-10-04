"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRoomContext } from "@/features/data/room-context";
import { useClock } from "@/lib/hooks/use-server-clock";
import { type StageFrame, stageFrame } from "./stage";

const StageContext = createContext<StageFrame | null>(null);

/** setTimeout's longest wait. */
const MAX_WAIT = 2 ** 31 - 1;

/**
 * Where the room stands on stage (see stageFrame), kept current for
 * everything inside: worked out again when the view or the clock changes,
 * and woken by a single timer exactly at the next moment anything in it
 * changes. Scenes never re-render per frame; their timelines run on their own.
 */
export function StageProvider({ children }: { children: ReactNode }) {
  const { view } = useRoomContext();
  const clock = useClock();
  // the moment the last timer was set for: reached, even if the timer fired a hair early
  const [woke, setWoke] = useState({ clock, at: 0 });
  const now =
    woke.clock === clock ? Math.max(woke.at, clock.now()) : clock.now();
  const computed = stageFrame(view, now);
  const [frame, setFrame] = useState(computed);
  // the same frame keeps its identity, so nothing under it re-renders for nothing
  if (!sameFrame(frame, computed)) setFrame(computed);

  useEffect(() => {
    if (frame.next === null || clock.frozen) return;
    const at = frame.next;
    const wait = (at - clock.now()) / clock.rate;
    const id = window.setTimeout(
      () => setWoke({ clock, at }),
      Math.min(MAX_WAIT, Math.max(0, wait)),
    );
    return () => window.clearTimeout(id);
  }, [frame, clock]);

  // a hidden tab's timers run late: catch up when it shows again
  useEffect(() => {
    const back = () => {
      if (document.visibilityState === "visible")
        setWoke({ clock, at: clock.now() });
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [clock]);

  return (
    <StageContext.Provider value={frame}>{children}</StageContext.Provider>
  );
}

/** Where the room stands on stage now. Only usable under <StageProvider>. */
export function useStage(): StageFrame {
  const frame = useContext(StageContext);
  if (!frame) throw new Error("useStage must be used inside StageProvider");
  return frame;
}

const sameBeat = (
  a: { kind: string; startsAt: number; until: number } | null,
  b: { kind: string; startsAt: number; until: number } | null,
) =>
  a === b ||
  (!!a &&
    !!b &&
    a.kind === b.kind &&
    a.startsAt === b.startsAt &&
    a.until === b.until);

function sameFrame(a: StageFrame, b: StageFrame) {
  return (
    a.area === b.area &&
    a.screen === b.screen &&
    a.finishedWait === b.finishedWait &&
    sameBeat(a.show, b.show) &&
    a.show?.n === b.show?.n &&
    sameBeat(a.beat, b.beat) &&
    a.themeFrom === b.themeFrom &&
    a.clockFrom === b.clockFrom &&
    a.clockPops === b.clockPops &&
    a.historyFrom === b.historyFrom &&
    a.look.tone === b.look.tone &&
    a.look.glyphs === b.look.glyphs &&
    a.look.glyphColor === b.look.glyphColor &&
    a.look.fade === b.look.fade &&
    a.next === b.next
  );
}
