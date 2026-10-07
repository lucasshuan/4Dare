"use client";

import { AnimatePresence, m, type Variants } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { RoomChat } from "@/features/chat/room-chat";
import { useRoomContext } from "@/features/data/room-context";
import { ImpostorScenes } from "@/features/impostor/impostor-scenes";
import { ImpostorScreen } from "@/features/impostor/impostor-screen";
import { LobbyScreen } from "@/features/lobby/lobby-screen";
import { PickScreen } from "@/features/pick/pick-screen";
import { ResultScreen } from "@/features/result/result-screen";
import { isGuessScene, isShow, type StageScreen } from "@/features/stage/stage";
import { StageBackdrop } from "@/features/stage/stage-backdrop";
import { StageProvider, useStage } from "@/features/stage/stage-context";
import { ThemeScreen } from "@/features/theme/theme-screen";
import { GuessScene } from "@/features/turn/guess-scene";
import { TurnScreen } from "@/features/turn/turn-screen";
import { VoteScreen } from "@/features/vote/vote-screen";
import type { ErrorCode, Phase, RoomView } from "@/game/types";
import { Link } from "@/i18n/navigation";
import { useTabTitle } from "@/lib/hooks/use-tab-title";
import { dur, ease, riseIn } from "@/lib/motion";
import { useRoomTitle } from "@/lib/names";
import { GAMES } from "@/lib/routes";
import { playSound } from "@/lib/sound";
import { FoundFeedback } from "./found-feedback";
import {
  isAwaited,
  MatchFrame,
  useReached,
  useStepStarted,
} from "./match-frame";
import { RevealOverlay } from "./reveal-overlay";
import { stepCall } from "./step-call";

/**
 * Everything a room shows once the player is seated (plan 1.2): one backdrop
 * for the whole room, the area on screen (lobby, match, result), the reveals
 * and a guess's scene over it, and the chat. The match frame stays mounted across the match's
 * screens. Lives inside <RoomProvider>; the stage lab renders it too, with a
 * made-up room and its own clock.
 */
export function RoomStage() {
  return (
    <StageProvider>
      <RoomBackdrop />
      <Areas />
      <RevealOverlay />
      <GuessScene />
      <ImpostorScenes />
      <FoundFeedback />
      <Chat />
    </StageProvider>
  );
}

/** The room-level backdrop: crossfades from step to step across every screen. */
function RoomBackdrop() {
  const { look } = useStage();
  const { view } = useRoomContext();
  return <StageBackdrop look={look} set={view.theme?.set ?? null} />;
}

/** The chat: lobby, match and result (never on a closed room). */
function Chat() {
  const { area } = useStage();
  return area === "closed" ? null : <RoomChat />;
}

/**
 * A pop when a turn step that waits on this player starts (stepCall): their
 * question, their answer, their guess, the check of a guess on their pick.
 * Never for a step they only watch.
 */
function useStepSound() {
  const { view, me } = useRoomContext();
  const started = useStepStarted();
  const call = stepCall(me.status, view.stepStartsAt, started);
  const last = useRef(call);
  useEffect(() => {
    if (call !== null && call !== last.current) playSound("step");
    last.current = call;
  }, [call]);
}

/** A pluck when someone joins the room or comes back to it, another when someone leaves. */
function usePresenceSound(view: RoomView) {
  const here = view.players
    .filter((p) => !p.away)
    .map((p) => p.id)
    .sort()
    .join(" ");
  const last = useRef(here);
  useEffect(() => {
    const before = new Set(last.current.split(" ").filter(Boolean));
    const now = new Set(here.split(" ").filter(Boolean));
    last.current = here;
    if ([...now].some((id) => !before.has(id))) playSound("join");
    else if ([...before].some((id) => !now.has(id))) playSound("leave");
  }, [here]);
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

/**
 * The lobby rises in and, when the match starts, leaves (its top bar slides
 * up, its content fades and shrinks: Screen's `leave` variants).
 */
const LOBBY: Variants = {
  enter: { opacity: 0, y: 16 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: dur.slow, ease: ease.soft },
  },
  leave: { opacity: 1, transition: { duration: 0.45 } },
};
const RISE = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: dur.slow, ease: ease.soft },
  },
  exit: { opacity: 0, transition: { duration: dur.base, ease: ease.soft } },
};

function Areas() {
  const { view } = useRoomContext();
  const { area, screen, finishedWait } = useStage();
  useRoomTab();
  useStepSound();
  usePresenceSound(view);
  usePreloadCards(view);
  return (
    <AnimatePresence mode="wait">
      {area === "lobby" ? (
        <m.div
          key="lobby"
          variants={LOBBY}
          initial="enter"
          animate="shown"
          exit="leave"
        >
          <LobbyScreen />
        </m.div>
      ) : area === "match" ? (
        <MatchFrame key="match">
          {/* the screens swap under the header with a short crossfade */}
          <AnimatePresence mode="wait">
            <m.div
              key={screen ?? "none"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.2 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <MatchScreen screen={screen} />
            </m.div>
          </AnimatePresence>
        </MatchFrame>
      ) : area === "result" ? (
        // a hit that ends the match keeps its reveal; the results wait until it is over
        <m.div key={finishedWait ? "result-wait" : "result"} {...RISE}>
          {finishedWait ? null : <ResultScreen />}
        </m.div>
      ) : (
        <m.div key="closed" {...RISE}>
          <RoomProblem code="not_found" />
        </m.div>
      )}
    </AnimatePresence>
  );
}

function MatchScreen({ screen }: { screen: StageScreen | null }) {
  switch (screen) {
    case "theming":
      return <ThemeScreen />;
    case "vote":
      return <VoteScreen />;
    case "pick":
      return <PickScreen />;
    case "turn":
      return <TurnScreen />;
    case "imp":
      return <ImpostorScreen />;
    default:
      return null;
  }
}

/** The room can't be shown: gone, full, already playing, or another problem. */
export function RoomProblem({ code }: { code: ErrorCode }) {
  const t = useTranslations("room");
  const known = [
    "not_found",
    "room_full",
    "already_started",
    "kicked",
  ].includes(code);
  return (
    <Screen>
      <m.div {...riseIn} className="flex max-w-lg flex-col gap-6 pt-10">
        <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em]">
          {t(`problem.${known ? code : "other"}.title`)}
        </h1>
        <p className="text-ink-muted text-lg">
          {t(`problem.${known ? code : "other"}.body`)}
        </p>
        <Link
          href={GAMES}
          className={buttonClass("primary", "lg", "self-start")}
        >
          {t("goHome")}
        </Link>
      </m.div>
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
  replying: "playing",
  talking: "playing",
  last_chance: "playing",
  finished: "finished",
};
/**
 * "0:42 · Lobby · Bia's room · 4Dare", or "0:42 · Your turn! · 4Dare" on the
 * player's move. While a show holds the step, the call waits for the step.
 */
function useRoomTab() {
  const t = useTranslations("meta");
  const roomTitle = useRoomTitle();
  const { view, me, offset } = useRoomContext();
  const started = useReached(view.stepStartsAt);
  const held =
    (isShow(view.reveal) || isGuessScene(view.reveal)) &&
    view.stepStartsAt !== null &&
    !started;
  const phase = TAB_PHASE[view.phase];
  const alert = held || !isAwaited(me.status) ? null : me.status;
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
