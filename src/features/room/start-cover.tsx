"use client";

import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Loader } from "@/components/ui/loader";
import { useRoomContext } from "@/features/data/room-context";
import { useStage } from "@/features/stage/stage-context";
import { useClock } from "@/lib/hooks/use-server-clock";
import { ease } from "@/lib/motion";

// The loading screen of a match's start: from the host's press (on their page
// at once, on the others' as the start reaches them) until the title scene
// plays. Behind it the ready check runs: every page loads and rehearses the
// scene, and the match begins for all of them together.

let asked = false;
const listeners = new Set<() => void>();

/** The host pressed start and the server has not answered yet: their page covers at once. */
export function setStartAsked(on: boolean) {
  if (asked === on) return;
  asked = on;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Whether the start's loading screen is up: the press, the ready check, then the curtain before the title scene. */
export function useStartCovered(): boolean {
  const pressed = useSyncExternalStore(
    subscribe,
    () => asked,
    () => false,
  );
  const { view } = useRoomContext();
  const { show, beat } = useStage();
  const checking = view.phase === "lobby" && !!view.starting;
  // the press holds until the room shows the start waiting (or under way):
  // let go sooner, the lobby would come back for a moment in between
  const reached = checking || view.phase !== "lobby";
  useEffect(() => {
    if (reached) setStartAsked(false);
  }, [reached]);
  // the match is on, a moment ahead: the lobby leaves under it until the title plays
  const ahead =
    show?.kind === "opening" &&
    !!show.title &&
    (beat === null || beat.kind === "curtain");
  return pressed || checking || ahead;
}

/** How long Who am I?'s stage takes to open over the loading screen (its iris, with a margin; ms). */
const IRIS_MS = 650;

/**
 * Whether the lobby's backdrop stays behind the start: under the loading
 * screen, and under Who am I?'s title while its stage opens in a circle over it.
 */
export function useStartBackdrop(): boolean {
  const covered = useStartCovered();
  const { view } = useRoomContext();
  const { show, beat } = useStage();
  const clock = useClock();
  const iris =
    view.settings.game === "who-am-i" &&
    show?.kind === "opening" &&
    beat?.kind === "title"
      ? beat.startsAt + IRIS_MS
      : null;
  const [opened, setOpened] = useState<number | null>(null);
  useEffect(() => {
    if (iris === null) return;
    const id = window.setTimeout(
      () => setOpened(iris),
      Math.max(0, iris - clock.now()),
    );
    return () => window.clearTimeout(id);
  }, [iris, clock]);
  return covered || (iris !== null && opened !== iris);
}

/**
 * The start's loading screen: the room entrance's shuffling hand, over the
 * lobby's backdrop and under the title scene, which covers it as it comes in
 * (Who am I?'s stage opens over it in a circle).
 */
export function StartCover() {
  const covered = useStartBackdrop();
  const t = useTranslations("room");
  return (
    <AnimatePresence>
      {covered ? (
        <m.div
          key="start-cover"
          data-start-cover
          className="pointer-events-none fixed inset-0 z-25 flex items-center justify-center overflow-hidden pb-6"
          initial={{ opacity: 0 }}
          // as the lobby's last panel goes (three panels 70 ms apart, 0.3 s each: globals.css, .lobby-leave)
          animate={{ opacity: 1, transition: { duration: 0.25, delay: 0.42 } }}
          exit={{ opacity: 0, transition: { duration: 0.3, ease: ease.soft } }}
        >
          <Loader label={t("starting")} className="relative" pill />
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
