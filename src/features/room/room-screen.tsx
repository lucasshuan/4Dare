"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { RoomProvider, useRoomContext } from "@/features/data/room-context";
import { useRoom } from "@/features/data/use-room";
import { LobbyScreen } from "@/features/lobby/lobby-screen";
import { PickScreen } from "@/features/pick/pick-screen";
import { ResultScreen } from "@/features/result/result-screen";
import { ThemeScreen } from "@/features/theme/theme-screen";
import { TurnScreen } from "@/features/turn/turn-screen";
import { VoteScreen } from "@/features/vote/vote-screen";
import type { ErrorCode, Phase, PlayerStatus } from "@/game/types";
import { Link } from "@/i18n/navigation";
import { useServerClock } from "@/lib/hooks/use-server-clock";
import { useTabTitle } from "@/lib/hooks/use-tab-title";
import { dur, ease, riseIn } from "@/lib/motion";
import { WHO_AM_I } from "@/lib/routes";
import { joinRoom } from "@/server/actions";
import { RevealOverlay } from "./reveal-overlay";

/** /r/CODE: joins if needed, then shows the screen for the current phase. */
export function RoomScreen({ code }: { code: string }) {
  const { data, error, refresh, apply } = useRoom(code);
  const [joinError, setJoinError] = useState<ErrorCode | null>(null);
  const triedJoin = useRef(false);

  useEffect(() => {
    if (error !== "not_member" || triedJoin.current) return;
    triedJoin.current = true;
    void joinRoom(code).then((r) => {
      if (r.ok) void refresh();
      else setJoinError(r.error);
    });
  }, [error, code, refresh]);

  const problem = joinError ?? (error === "not_found" ? "not_found" : null);
  if (problem) return <RoomProblem code={problem} />;
  if (!data) return <RoomLoading />;
  return (
    <RoomProvider
      code={code}
      view={data.view}
      offset={data.offset}
      refresh={refresh}
      apply={apply}
    >
      <PhaseScreens />
      <RevealOverlay />
    </RoomProvider>
  );
}

function PhaseScreens() {
  const { view, offset } = useRoomContext();
  useRoomTab();
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

function RoomLoading() {
  return (
    <Screen left={null}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: dur.base } }}
        className="flex flex-col gap-4 pt-10"
      >
        <div className="h-12 w-2/3 animate-pulse rounded-md bg-sunken" />
        <div className="h-6 w-1/2 animate-pulse rounded-md bg-sunken" />
      </motion.div>
    </Screen>
  );
}

function RoomProblem({ code }: { code: ErrorCode }) {
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

/** "0:42 · Lobby · ABCDE · Ludodare", or "0:42 · Your turn! · Ludodare" on the player's move. */
function useRoomTab() {
  const t = useTranslations("meta");
  const { code, view, me, offset } = useRoomContext();
  const phase = TAB_PHASE[view.phase];
  const alert = TAB_ALERT[me.status];
  useTabTitle(
    phase ? `${t(`tab.${phase}`)} · ${code}` : t("room.title", { code }),
    alert ? t(`tab.alert.${alert}`) : null,
    { deadline: view.deadline, stepStartsAt: view.stepStartsAt, offset },
  );
}
