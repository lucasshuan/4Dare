"use client";

import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Loader } from "@/components/ui/loader";
import { useRoomContext } from "@/features/data/room-context";
import { useStage } from "@/features/stage/stage-context";
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
  // the match is on, a moment ahead: the lobby leaves under it until the title plays
  const ahead =
    show?.kind === "opening" &&
    !!show.title &&
    (beat === null || beat.kind === "curtain");
  return pressed || checking || ahead;
}

/** The start's loading screen: the room entrance's shuffling hand, over the lobby's backdrop. */
export function StartCover() {
  const covered = useStartCovered();
  const t = useTranslations("room");
  return (
    <AnimatePresence>
      {covered ? (
        <m.div
          key="start-cover"
          data-start-cover
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden pb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.25 } }}
          exit={{ opacity: 0, transition: { duration: 0.3, ease: ease.soft } }}
        >
          <Loader label={t("starting")} className="relative" pill />
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
