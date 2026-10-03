"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loader";
import { Screen } from "@/components/ui/screen";
import { MatchLockPage } from "@/features/current-match/match-lock";
import { RoomProvider, useRoomContext } from "@/features/data/room-context";
import { useCurrentMatch } from "@/features/data/use-current-match";
import { useRoom } from "@/features/data/use-room";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { LobbyScreen } from "@/features/lobby/lobby-screen";
import { PickScreen } from "@/features/pick/pick-screen";
import { ResultScreen } from "@/features/result/result-screen";
import { ThemeScreen } from "@/features/theme/theme-screen";
import { TurnScreen } from "@/features/turn/turn-screen";
import { VoteScreen } from "@/features/vote/vote-screen";
import type { ErrorCode, Phase, PlayerStatus, RoomView } from "@/game/types";
import { Link, useRouter } from "@/i18n/navigation";
import { useServerClock } from "@/lib/hooks/use-server-clock";
import { useTabTitle } from "@/lib/hooks/use-tab-title";
import { dur, ease, riseIn } from "@/lib/motion";
import { WHO_AM_I } from "@/lib/routes";
import { playSound } from "@/lib/sound";
import { joinRoom, leaveRoom } from "@/server/actions";
import { PasswordDialog } from "./password-dialog";
import { RevealOverlay } from "./reveal-overlay";

/**
 * The room this page just left without closing (a link, the back button),
 * told a moment later: React's dev double mount comes straight back to the same
 * room and calls it off.
 */
let leaving: { code: string; timer: number } | null = null;

/** /r/CODE: joins if needed, then shows the screen for the current phase. */
export function RoomScreen({ code }: { code: string }) {
  const { data, error, refresh, apply } = useRoom(code);
  const te = useTranslations("common.errors");
  const router = useRouter();
  const [joinError, setJoinError] = useState<ErrorCode | null>(null);
  const [askPassword, setAskPassword] = useState(false);
  const triedJoin = useRef(false);

  useEffect(() => {
    if (error !== "not_member" || triedJoin.current) return;
    triedJoin.current = true;
    void joinRoom(code).then((r) => {
      if (r.ok) void refresh();
      else if (r.error === "password_required") setAskPassword(true);
      else setJoinError(r.error);
    });
  }, [error, code, refresh]);

  // Closing the page tells the room; a reload or a dropped connection comes back in time.
  // Leaving it for another page of the site tells it too: a lobby at once (the seat is
  // freed, an empty room closes), a match like a closed page.
  const member = !!data;
  const inLobby = useRef(false);
  inLobby.current = data?.view.phase === "lobby";
  useEffect(() => {
    if (!member) return;
    if (leaving?.code === code) {
      window.clearTimeout(leaving.timer);
      leaving = null;
    }
    const gone = () => navigator.sendBeacon(`/api/rooms/${code}/gone`);
    const back = (e: PageTransitionEvent) => {
      if (e.persisted) void refresh();
    };
    window.addEventListener("pagehide", gone);
    window.addEventListener("pageshow", back);
    return () => {
      window.removeEventListener("pagehide", gone);
      window.removeEventListener("pageshow", back);
      const lobby = inLobby.current;
      leaving = {
        code,
        timer: window.setTimeout(() => {
          leaving = null;
          if (lobby) void leaveRoom(code);
          else gone();
        }, 0),
      };
    };
  }, [member, code, refresh]);

  const problem = joinError ?? (error === "not_found" ? "not_found" : null);
  if (problem === "in_match") return <InMatchElsewhere />;
  if (problem) return <RoomProblem code={problem} />;
  if (askPassword)
    return (
      <>
        <RoomLoading />
        <PasswordDialog
          onCancel={() => router.push(WHO_AM_I)}
          onSubmit={async (password) => {
            const r = await joinRoom(code, password);
            if (r.ok) {
              await refresh();
              setAskPassword(false);
              return null;
            }
            if (r.error === "wrong_password" || r.error === "rate_limited")
              return te(r.error);
            setAskPassword(false);
            setJoinError(r.error);
            return null;
          }}
        />
      </>
    );
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

function RoomLoading() {
  const t = useTranslations("room");
  return (
    <Screen left={null}>
      <PageLoader label={t("loading")} />
    </Screen>
  );
}

/**
 * Another room's link while a match is going: the lock, with the way back or
 * out. Once out (or once that match ends), the page loads again and joins.
 */
function InMatchElsewhere() {
  const tc = useTranslations("common");
  const { match, isLoading } = useCurrentMatch();
  useEffect(() => {
    if (!isLoading && !match) window.location.reload();
  }, [isLoading, match]);
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      {match ? (
        <MatchLockPage match={match} />
      ) : (
        <PageLoader label={tc("loading")} />
      )}
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

/** "0:42 · Lobby · ABCDE · 4Dare", or "0:42 · Your turn! · 4Dare" on the player's move. */
function useRoomTab() {
  const t = useTranslations("meta");
  const { code, view, me, offset } = useRoomContext();
  const phase = TAB_PHASE[view.phase];
  const alert = TAB_ALERT[me.status];
  useTabTitle(
    phase
      ? `${t(`tab.${phase}`)} · ${view.settings.name || code}`
      : t("room.title", { code }),
    alert ? t(`tab.alert.${alert}`) : null,
    {
      deadline: view.deadline,
      stepStartsAt: view.stepStartsAt,
      stepMs: view.stepMs,
      offset,
    },
  );
}
