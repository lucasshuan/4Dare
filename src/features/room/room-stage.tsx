"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, m, type Variants } from "motion/react";
import dynamic from "next/dynamic";
import { type Messages, useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { RoomChat } from "@/features/chat/room-chat";
import { useRoomContext } from "@/features/data/room-context";
import { useWatchersCache, watchersKey } from "@/features/data/use-watchers";
import { EndScene, preloadEnd } from "@/features/ending/end-scene";
import { ImpostorScenes } from "@/features/impostor/impostor-scenes";
import { ImpostorScreen } from "@/features/impostor/impostor-screen";
import { LobbyScreen } from "@/features/lobby/lobby-screen";
import {
  OpeningMusic,
  OpeningScene,
  preloadTitle,
  useReadyCheck,
} from "@/features/opening/title-scene";
import { isGuessScene, isShow, type StageScreen } from "@/features/stage/stage";
import { StageBackdrop } from "@/features/stage/stage-backdrop";
import { StageProvider, useStage } from "@/features/stage/stage-context";
import { VoteScreen } from "@/features/vote/vote-screen";
import { FoundFeedback } from "@/features/who-am-i/found-feedback";
import { PickScreen } from "@/features/who-am-i/pick/pick-screen";
import { RevealOverlay } from "@/features/who-am-i/reveal-overlay";
import { ThemeScreen } from "@/features/who-am-i/theme-screen";
import { GuessScene } from "@/features/who-am-i/turn/guess-scene";
import { TurnScreen } from "@/features/who-am-i/turn/turn-screen";
import { GAME_KEYS } from "@/game/games";
import { trackFor } from "@/game/music-tunes";
import type { ErrorCode, Phase, RoomView } from "@/game/types";
import { Link } from "@/i18n/navigation";
import { useTabTitle } from "@/lib/hooks/use-tab-title";
import { dur, ease, riseIn } from "@/lib/motion";
import { preloadMusic, useMusic, useMusicMuffle } from "@/lib/music";
import { useRoomTitle } from "@/lib/names";
import { GAMES } from "@/lib/routes";
import { useGameOption } from "@/lib/settings";
import { playSound } from "@/lib/sound";
import {
  isAwaited,
  MatchFrame,
  useReached,
  useStepStarted,
} from "./match-frame";
import { EntranceLobbyBackdrop } from "./room-entrance";
import { StartCover, useStartBackdrop, useStartCovered } from "./start-cover";
import { stepCall } from "./step-call";
import { useShownReport } from "./use-shown";

/** What for?'s screens come with its match: no other room loads them. */
const loadLineup = () => import("@/features/lineup/lineup-screen");
const LineupScreen = dynamic(() => loadLineup().then((m) => m.LineupScreen));

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
      <OpeningScene />
      <Ending />
      <StartCover />
      <OpeningMusic />
      <RevealOverlay />
      <GuessScene />
      <ImpostorScenes />
      <FoundFeedback />
      <Chat />
    </StageProvider>
  );
}

/** A match's end over the whole window; it fades out as the room goes back to the lobby or into the next match. */
function Ending() {
  const { view } = useRoomContext();
  return (
    <AnimatePresence>
      {view.phase === "finished" ? (
        <m.div
          key="end"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          <EndScene />
        </m.div>
      ) : null}
    </AnimatePresence>
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

/** How long, in the lobby, a seat given up waits for the watchers' list to say its player only got up to watch. */
const STAND_GRACE_MS = 2000;

const ids = (joined: string) => new Set(joined.split(" ").filter(Boolean));

/**
 * A pluck when someone joins the room or comes back to it, another when
 * someone leaves. Getting up to watch or taking a seat is neither: the
 * watchers' list (People's read of it, in the lobby) tells who only moved.
 * A seat taken by someone on that list is silent; a seat given up waits a
 * moment for the list to show its player among the watchers. The viewer's
 * own move needs no list: they were watching, or `view.watching` says so.
 */
function usePresenceSound(code: string, view: RoomView) {
  const client = useQueryClient();
  const { phase, youId, watching: youWatch } = view;
  const here = view.players
    .filter((p) => !p.away)
    .map((p) => p.id)
    .sort()
    .join(" ");
  const data = useWatchersCache(code);
  const watching = (data?.watchers ?? [])
    .map((w) => w.id)
    .sort()
    .join(" ");
  // the list now and as it was: the seats may change before or after it does
  const lists = useRef({ now: new Set<string>(), before: new Set<string>() });
  useEffect(() => {
    lists.current = { now: ids(watching), before: lists.current.now };
  }, [watching]);
  const last = useRef(here);
  const timers = useRef(new Set<number>());
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) window.clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    const before = ids(last.current);
    const now = ids(here);
    last.current = here;
    const watched = (id: string) =>
      lists.current.now.has(id) || lists.current.before.has(id);
    const joined = [...now].some(
      (id) => !before.has(id) && id !== youId && !watched(id),
    );
    if (joined) playSound("join");
    const left = [...before].filter(
      (id) => !now.has(id) && !(id === youId && youWatch),
    );
    if (left.length === 0) return;
    if (phase !== "lobby") {
      if (!joined) playSound("leave");
      return;
    }
    // the list's read lands a moment after the seats change: read it now and wait
    void client.invalidateQueries({ queryKey: watchersKey(code) });
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      const seated = ids(last.current);
      if (left.some((id) => !seated.has(id) && !lists.current.now.has(id)))
        playSound("leave");
    }, STAND_GRACE_MS);
    timers.current.add(timer);
  }, [here, phase, youId, youWatch, code, client]);
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
  const { code, view } = useRoomContext();
  const { area, screen } = useStage();
  useRoomTab();
  useStepSound();
  usePresenceSound(code, view);
  useMusicMuffle(area === "lobby");
  // Impostor and Lineup rooms play their own take instead of the stage,
  // lobby (muffled) to results; picking the game in the lobby crossfades at the
  // same point in the song, and the takes are fetched on entering the room so the
  // swap starts at once. A match's start cuts the lobby's music and its title
  // scene plays the take again from the top (OpeningMusic). Lineup's
  // presenter hears the booth's radio take (lineup-screen.tsx).
  // which take plays when is the panel's (music-tunes.ts), as the room's copy has it
  const lineup = view.settings.game === "lineup";
  const roomTrack = trackFor(view.settings.game, "room");
  useEffect(() => {
    for (const g of GAME_KEYS) {
      const t = trackFor(g, "room");
      if (t) preloadMusic(t);
    }
  }, []);
  useMusic(roomTrack ?? undefined, 1);
  // the game's title scene, fetched while the lobby fills so the match starts on the dot
  const game = view.settings.game;
  const ja = useLocale() === "ja";
  const chalk = !useGameOption("lineup", "plainLetters");
  useEffect(() => {
    if (area === "lobby") void preloadTitle(game, { ja, chalk });
  }, [area, game, ja, chalk]);
  // a start's ready check: every page loads and rehearses it behind the loading screen
  useReadyCheck();
  useShownReport();
  const covered = useStartCovered();
  const backdrop = useStartBackdrop();
  // the end's pictures, fetched while the match plays
  useEffect(() => {
    if (area === "match") void preloadEnd(game, { ja, chalk });
  }, [area, game, ja, chalk]);
  // the host's "one more" from a match's end goes straight to the loading screen: no lobby in between
  const [fromEnd, setFromEnd] = useState(false);
  useEffect(() => {
    if (area === "result") setFromEnd(true);
    else if (!covered) setFromEnd(false);
  }, [area, covered]);
  usePreloadCards(view);
  // a What for? room fetches its screens while the lobby fills
  useEffect(() => {
    if (lineup) void loadLineup();
  }, [lineup]);
  return (
    <>
      {/* the lobby's coloured backdrop, its flares in time with the music */}
      <EntranceLobbyBackdrop
        game={area === "lobby" || backdrop ? view.settings.game : null}
      />
      <AnimatePresence mode="wait">
        {area === "lobby" ? (
          <m.div
            key="lobby"
            variants={LOBBY}
            initial="enter"
            animate="shown"
            exit="leave"
          >
            {/* the start's loading screen takes its place, over the same backdrop: the panels leave one after the other (globals.css), the controls stay */}
            <div inert={covered} data-leaving={covered || undefined}>
              {covered && fromEnd ? null : <LobbyScreen />}
            </div>
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
        ) : area === "result" ? null : (
          <m.div key="closed" {...RISE}>
            <RoomProblem code="not_found" />
          </m.div>
        )}
      </AnimatePresence>
    </>
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
    case "lu":
      return <LineupScreen />;
    default:
      return null;
  }
}

/** The problems with words of their own; any other shows "other". */
const PROBLEMS = [
  "not_found",
  "room_full",
  "already_started",
  "kicked",
  "banned",
] as const satisfies readonly ErrorCode[];
const isKnownProblem = (code: ErrorCode): code is (typeof PROBLEMS)[number] =>
  (PROBLEMS as readonly ErrorCode[]).includes(code);

/** The room can't be shown: gone, full, already playing, or another problem. */
export function RoomProblem({ code }: { code: ErrorCode }) {
  const t = useTranslations("room");
  const problem = isKnownProblem(code) ? code : "other";
  return (
    <Screen>
      <m.div {...riseIn} className="flex max-w-lg flex-col gap-6 pt-10">
        <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em]">
          {t(`problem.${problem}.title`)}
        </h1>
        <p className="text-ink-muted text-lg">{t(`problem.${problem}.body`)}</p>
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

const TAB_PHASE: Partial<
  Record<Phase, Exclude<keyof Messages["meta"]["tab"], "alert">>
> = {
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
  bidding: "playing",
  halftime: "playing",
  trading: "playing",
  defending: "playing",
  presenting: "playing",
  judging: "playing",
  tiebreak: "playing",
  scoring: "playing",
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
