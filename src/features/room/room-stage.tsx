"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { useRoomContext } from "@/features/data/room-context";
import { LobbyScreen } from "@/features/lobby/lobby-screen";
import { PickScreen } from "@/features/pick/pick-screen";
import { ResultScreen } from "@/features/result/result-screen";
import { ThemeScreen } from "@/features/theme/theme-screen";
import { TurnScreen } from "@/features/turn/turn-screen";
import { VoteScreen } from "@/features/vote/vote-screen";
import type { ErrorCode, Phase, PlayerStatus, RoomView } from "@/game/types";
import { Link } from "@/i18n/navigation";
import { useServerClock } from "@/lib/hooks/use-server-clock";
import { useTabTitle } from "@/lib/hooks/use-tab-title";
import { dur, ease, riseIn } from "@/lib/motion";
import { useRoomTitle } from "@/lib/names";
import { WHO_AM_I } from "@/lib/routes";
import { playSound } from "@/lib/sound";
import { RevealOverlay } from "./reveal-overlay";

/**
 * Everything a room shows once the player is seated: the screen for the
 * current phase and the reveals over it. Lives inside <RoomProvider>; the
 * stage lab renders it too, with a made-up room and its own clock.
 */
export function RoomStage() {
  return (
    <>
      <PhaseScreens />
      <RevealOverlay />
    </>
  );
}

const TURN_STEPS: Phase[] = ["asking", "answering", "guessing", "validating"];

/** A pop on every step change of a turn: question sent, answered, guess sent, guess answered. */
function useStepSound(phase: Phase) {
  const last = useRef(phase);
  useEffect(() => {
    if (phase !== last.current && TURN_STEPS.includes(last.current))
      playSound("step");
    last.current = phase;
  }, [phase]);
}

/** Fetches every card's picture as soon as the room knows it, so the cards show up with it. */
function usePreloadCards(view: RoomView) {
  const urls = view.players
    .map((p) => p.card?.imageUrl)
    .filter(Boolean)
    .join(" ");
  useEffect(() => {
    for (const url of urls.split(" ")) if (url) new Image().src = url;
  }, [urls]);
}

function PhaseScreens() {
  const { view, offset } = useRoomContext();
  useRoomTab();
  useStepSound(view.phase);
  usePreloadCards(view);
  const now = useServerClock(offset, 250);
  // A hit that ends the match keeps its reveal; the results wait until it is over.
  const revealing = view.reveal !== null && now < view.reveal.until;
  // The theme stays on its screen (the vote's, or the host's) while it is shown to everyone.
  const phase =
    view.phase === "finished" && revealing
      ? "finished-wait"
      : view.reveal?.kind === "theme" && revealing
        ? view.vote
          ? "voting"
          : "theming"
        : view.phase;
  const screen =
    phase === "lobby" ? (
      <LobbyScreen />
    ) : phase === "theming" ? (
      <ThemeScreen />
    ) : phase === "voting" ? (
      <VoteScreen />
    ) : phase === "picking" ? (
      <PickScreen />
    ) : phase === "finished" ? (
      <ResultScreen />
    ) : phase === "closed" ? (
      <RoomProblem code="not_found" />
    ) : phase === "finished-wait" ? null : (
      <TurnScreen />
    );
  const key = ["asking", "answering", "guessing", "validating"].includes(phase)
    ? "turn"
    : phase;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 16 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: dur.slow, ease: ease.soft },
        }}
        exit={{
          opacity: 0,
          transition: { duration: dur.base, ease: ease.soft },
        }}
      >
        {screen}
      </motion.div>
    </AnimatePresence>
  );
}

/** The room can't be shown: gone, full, already playing, or another problem. */
export function RoomProblem({ code }: { code: ErrorCode }) {
  const t = useTranslations("room");
  const known = ["not_found", "room_full", "already_started"].includes(code);
  return (
    <Screen>
      <motion.div {...riseIn} className="flex max-w-lg flex-col gap-6 pt-10">
        <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em]">
          {t(`problem.${known ? code : "other"}.title`)}
        </h1>
        <p className="text-ink-muted text-lg">
          {t(`problem.${known ? code : "other"}.body`)}
        </p>
        <Link
          href={WHO_AM_I}
          className={buttonClass("primary", "lg", "self-start")}
        >
          {t("goHome")}
        </Link>
      </motion.div>
    </Screen>
  );
}

const TAB_PHASE: Partial<Record<Phase, string>> = {
  lobby: "lobby",
  theming: "theming",
  voting: "voting",
  picking: "picking",
  asking: "playing",
  answering: "playing",
  guessing: "playing",
  validating: "playing",
  finished: "finished",
};
/** Statuses that wait on this player: the tab calls them back when they're elsewhere. */
const TAB_ALERT: Partial<Record<PlayerStatus, string>> = {
  theming: "theming",
  voting: "voting",
  picking: "picking",
  asking: "asking",
  answering: "answering",
  guessing: "guessing",
  validating: "validating",
};

/** "0:42 · Lobby · Bia's room · 4Dare", or "0:42 · Your turn! · 4Dare" on the player's move. */
function useRoomTab() {
  const t = useTranslations("meta");
  const roomTitle = useRoomTitle();
  const { view, me, offset } = useRoomContext();
  const phase = TAB_PHASE[view.phase];
  const alert = TAB_ALERT[me.status];
  const title = roomTitle(
    view.settings.name,
    view.players.find((p) => p.isHost),
  );
  useTabTitle(
    phase ? `${t(`tab.${phase}`)} · ${title}` : title,
    alert ? t(`tab.alert.${alert}`) : null,
    {
      deadline: view.deadline,
      stepStartsAt: view.stepStartsAt,
      stepMs: view.stepMs,
      offset,
    },
  );
}
