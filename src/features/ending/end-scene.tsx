"use client";

import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@/features/data/room-context";
import { useSignIn } from "@/features/home/use-sign-in";
import { seatOf } from "@/features/opening/title-kit";
import { TitleStage } from "@/features/opening/title-scene";
import { RoomControls } from "@/features/room/room-controls";
import { useStage } from "@/features/stage/stage-context";
import type { GameKey } from "@/game/games";
import type { MatchReward } from "@/game/profile/reward";
import type { RoomView } from "@/game/types";
import { useClock } from "@/lib/hooks/use-server-clock";
import { useGameOption } from "@/lib/settings";
import { myMatchReward } from "@/server/actions";
import { END_ACTS } from "./end-kit";
import s from "./end-room.module.css";
import {
  IMPOSTOR_END_BACKDROP,
  IMPOSTOR_END_IMAGES,
  ImpostorEndScene,
} from "./impostor-end";
import {
  LINEUP_END_BACKDROP,
  LINEUP_END_IMAGES,
  LineupEndFonts,
  LineupEndScene,
  preloadLineupEndFonts,
} from "./lineup-end";
import { RewardCard, RewardPill, type RewardWho } from "./reward-card";
import { NextGames, ReadyPanel } from "./room-rail";
import { WHO_END_BACKDROP, WHO_END_IMAGES, WhoEndScene } from "./who-end";

const BACKDROP: Record<GameKey, string> = {
  "who-am-i": WHO_END_BACKDROP,
  impostor: IMPOSTOR_END_BACKDROP,
  lineup: LINEUP_END_BACKDROP,
};

const IMAGES: Record<GameKey, (portrait: boolean) => string[]> = {
  "who-am-i": WHO_END_IMAGES,
  impostor: IMPOSTOR_END_IMAGES,
  lineup: LINEUP_END_IMAGES,
};

const preloads = new Map<string, Promise<void>>();

/**
 * Fetches and decodes the pictures `game`'s end paints (and What for?'s fonts,
 * its chalk unless `chalk` is off), during the match, so its scene doesn't
 * wait on them. Resolves once they are in (a failed one counts).
 */
export function preloadEnd(
  game: GameKey,
  o: { ja: boolean; chalk: boolean },
): Promise<void> {
  const portrait = window.innerWidth < window.innerHeight;
  const key = `${game} ${portrait} ${o.ja} ${o.chalk}`;
  const known = preloads.get(key);
  if (known) return known;
  const all = Promise.allSettled([
    ...IMAGES[game](portrait).map((src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      return img.decode();
    }),
    ...(game === "lineup" ? [preloadLineupEndFonts(o)] : []),
  ]).then(() => undefined);
  preloads.set(key, all);
  return all;
}

/**
 * A match's end, from the moment the room knows it: its game's scene over the
 * whole window on the server clock (built and painted unseen while a last
 * reveal still plays), then the reward card and the room's panels over it.
 * The room stays here until the next match or the lobby.
 */
export function EndScene() {
  const { view } = useRoomContext();
  const { finishedWait } = useStage();
  // with no reveal to wait for, it starts a moment ahead (END_LEAD_MS): built and painted unseen till then
  const started = usePassed(view.stepStartsAt ?? 0);
  if (view.phase !== "finished" || view.stepStartsAt === null) return null;
  return (
    <End
      key={view.stepStartsAt}
      game={view.settings.game}
      startsAt={view.stepStartsAt}
      live={!finishedWait && started}
      lead={!finishedWait && !started}
    />
  );
}

const noCues = () => [];

function End({
  game,
  startsAt,
  live,
  lead,
}: {
  game: GameKey;
  startsAt: number;
  live: boolean;
  /** The moment before it starts, with nothing else on screen: its set's colour covers the window. */
  lead: boolean;
}) {
  const tg = useTranslations("home.games");
  const ja = useLocale() === "ja";
  const chalk = !useGameOption("lineup", "plainLetters");
  const files = useCallback(
    () => preloadEnd(game, { ja, chalk }),
    [game, ja, chalk],
  );
  const name =
    game === "impostor"
      ? tg("impostor.name")
      : game === "lineup"
        ? tg("whatFor.name")
        : tg("whoAmI.name");
  const acts = END_ACTS[game];
  return (
    <>
      <TitleStage
        game={game}
        backdrop={BACKDROP[game]}
        fonts={game === "lineup" ? <LineupEndFonts /> : undefined}
        startsAt={startsAt}
        endsAt={startsAt + acts.pill * 1000}
        cues={noCues}
        label={name}
        live={live}
        rehearse={live ? null : startsAt}
        length={acts.pill * 1000}
        files={files}
      >
        {(portrait, bleed) =>
          game === "impostor" ? (
            <ImpostorEndScene portrait={portrait} bleed={bleed} />
          ) : game === "lineup" ? (
            <LineupEndScene portrait={portrait} bleed={bleed} />
          ) : (
            <WhoEndScene portrait={portrait} bleed={bleed} />
          )
        }
      </TitleStage>
      {lead ? (
        <m.div
          aria-hidden
          className="fixed inset-0 z-30"
          style={{ background: BACKDROP[game] }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.15 } }}
        />
      ) : null}
      {live ? <EndRoom game={game} startsAt={startsAt} /> : null}
    </>
  );
}

/** Whether the server clock has passed `at` (ms), re-rendering once when it does. */
function usePassed(at: number): boolean {
  const clock = useClock();
  const [passed, setPassed] = useState(() => clock.now() >= at);
  useEffect(() => {
    const wait = (at - clock.now()) / (clock.rate || 1);
    setPassed(wait <= 0);
    if (wait <= 0 || clock.frozen) return;
    const id = window.setTimeout(() => setPassed(true), wait);
    return () => window.clearTimeout(id);
  }, [at, clock]);
  return clock.frozen ? clock.now() >= at : passed;
}

/** The line under the player's name on the card: their side, their round, their votes. */
function useSub(view: RoomView): string {
  const t = useTranslations("room.end.sub");
  const id = view.youId;
  if (view.imp?.end)
    return view.imp.end.impostorIds.includes(id) ? t("impostor") : t("crew");
  if (view.lu) {
    if (view.lu.presenterId === id) return t("presenter");
    const votes = view.lu.results.reduce((n, r) => n + (r.votes[id] ?? 0), 0);
    return t("votes", { n: votes });
  }
  const me = view.players.find((p) => p.isYou);
  return me?.discoveredAt
    ? t("found", { n: me.discoveredAt })
    : me?.gaveUp
      ? t("gaveUp")
      : t("notFound");
}

/**
 * Over the scene, in screen pixels: the reward card coming in once the
 * climax made room for it and folding into the pill, and above it the room's
 * column (the host's shortcut to another game, who is ready). Someone who
 * didn't play gets no card.
 */
function EndRoom({ game, startsAt }: { game: GameKey; startsAt: number }) {
  const { view, code, watching } = useRoomContext();
  const acts = END_ACTS[game];
  const atCard = usePassed(startsAt + acts.card * 1000);
  const atPill = usePassed(startsAt + acts.pill * 1000);
  const sub = useSub(view);
  const { signIn, pending: signingIn } = useSignIn({ stay: true });
  const { data: reward } = useQuery({
    queryKey: ["match-reward", code, startsAt],
    enabled: !watching,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<MatchReward | null> => {
      const r = await myMatchReward(code);
      return r.ok ? r.data : null;
    },
  });
  // the card shows its entrance only to someone here before the pill; reopened from the pill, it stays until pressed
  const sawCard = useRef(false);
  const [open, setOpen] = useState(false);
  const me = view.players.find((p) => p.isYou);
  const who: RewardWho | null = me
    ? { name: me.name, avatar: me.avatar, seat: seatOf(me.colorSlot), sub }
    : null;
  const card = !!reward && !!who && atCard && (!atPill || open);
  if (card && !atPill) sawCard.current = true;
  const leaving = !!reward && atPill && !open && sawCard.current;
  const pill = !!reward && !!who && atPill && !open;
  return (
    <div className={s.room}>
      <RoomControls className={s.controls} />
      {reward && who && (card || leaving) ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: reopened, the card folds again on a press; its pill's key is the keyboard's way
        // biome-ignore lint/a11y/useKeyWithClickEvents: as above
        <div onClick={open ? () => setOpen(false) : undefined}>
          <RewardCard
            reward={reward}
            who={who}
            leaving={leaving}
            onSignIn={(p) => void signIn(p)}
            signingIn={signingIn}
          />
        </div>
      ) : null}
      {pill && reward && who ? (
        <RewardPill
          reward={reward}
          who={who}
          late={leaving}
          onOpen={() => setOpen(true)}
          onSignIn={() => void signIn("discord")}
        />
      ) : null}
      {atPill ? (
        <div className={`${s.rail} ${pill ? s.abovePill : ""}`}>
          {!watching && view.players.find((p) => p.isYou)?.isHost ? (
            <NextGames />
          ) : null}
          <ReadyPanel />
        </div>
      ) : null}
    </div>
  );
}
