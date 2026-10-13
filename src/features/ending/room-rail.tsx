"use client";

import { ArrowLeft, Check, ChevronRight, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { type CSSProperties, useRef, useState } from "react";
import { keyClass } from "@/components/ui/button";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { avatarSrc, seatOf } from "@/features/opening/title-kit";
import { setStartAsked } from "@/features/room/start-cover";
import { GAME_SEATS, type GameKey, OPEN_GAMES } from "@/game/games";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";
import { backToLobby, setReady, startGame } from "@/server/actions";
import s from "./end-room.module.css";
import { GameTileArt } from "./game-tiles";

/** Each game's home messages and the shade its tile's caption sits on. */
const TILE: Record<GameKey, { messages: string; shade: string }> = {
  "who-am-i": { messages: "whoAmI", shade: "oklch(0.42 0.14 272)" },
  impostor: { messages: "impostor", shade: "oklch(0.42 0.13 305)" },
  lineup: { messages: "whatFor", shade: "oklch(0.42 0.09 62)" },
};

/**
 * The host's shortcut, where a TV would be: at most two other games (the one
 * just played is the "one more" key), the home's scenes side by side. Hovering
 * names one; a press takes everyone to the lobby with that game.
 */
export function NextGames() {
  const tg = useTranslations("home.games");
  const t = useTranslations("room.end.games");
  const { view, code } = useRoomContext();
  const { act, pending } = useRoomAction();
  const [going, setGoing] = useState<GameKey | null>(null);
  const here = view.players.filter((p) => !p.away).length;
  // in the home's order; a game the room has too many people for is left out
  const offer = OPEN_GAMES.filter(
    (g) => g !== view.settings.game && here <= GAME_SEATS[g].max,
  ).slice(0, 2);
  if (!offer.length) return null;
  const go = async (game: GameKey) => {
    setGoing(game);
    const r = await act(() => backToLobby(code, game));
    if (!r.ok) setGoing(null);
  };
  return (
    <fieldset className={cn(s.next, going && s.going)} aria-label={t("label")}>
      {offer.map((g) => {
        const name = tg(`${TILE[g].messages}.name` as "whoAmI.name");
        return (
          <button
            key={g}
            type="button"
            className={cn(s.tile, going === g && s.pick)}
            style={{ "--shade": TILE[g].shade } as CSSProperties}
            disabled={pending}
            aria-label={t("go", { game: name })}
            onClick={() => void go(g)}
          >
            <span className={s.tileArt}>
              <GameTileArt game={g} />
            </span>
            <span className={s.veil} />
            <span className={s.cap}>
              <span className={s.capGoing}>
                <i />
                {t("going")}
              </span>
              <b className={s.capName}>{name}</b>
              <span className={s.capRow}>
                <span className={s.capPeople}>
                  {tg(`${TILE[g].messages}.players` as "whoAmI.players")}
                </span>
                <span className={s.capGo}>
                  <ChevronRight aria-hidden="true" />
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}

/**
 * Who is ready for the next match, and the two keys: back to the lobby (a
 * colour no other key uses) and "Ready", or for the host, who doesn't confirm,
 * "One more" (the lobby's green start). Someone watching sees who is ready.
 */
export function ReadyPanel() {
  const t = useTranslations("room.end.ready");
  const name = useDisplayName();
  const { view, me, code, watching } = useRoomContext();
  const { act, pending } = useRoomAction();
  // "Ready" flips at once; the server confirms in the background
  const [guess, setGuess] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);
  const host = view.players.find((p) => p.isHost);
  const isHost = !watching && me.isHost;
  const mine = guess ?? me.ready;
  const here = view.players.filter((p) => !p.away);
  const ready = (id: string) =>
    id === host?.id ||
    (id === me.id && !watching ? mine : !!here.find((p) => p.id === id)?.ready);
  // whoever turns ready while the panel is up hops once
  const readyAtFirst = useRef(
    new Set(here.filter((p) => p.ready).map((p) => p.id)),
  );
  const waiting = here.filter((p) => !ready(p.id));
  const meWait = !watching && waiting.some((p) => p.id === me.id);
  const others = waiting.filter((p) => watching || p.id !== me.id);
  const [title, cls] =
    isHost && starting
      ? [t("starting"), s.all]
      : !waiting.length
        ? [
            isHost || !host
              ? t("all")
              : t("waitHost", { name: name(host, host.isYou) }),
            s.all,
          ]
        : meWait && !others.length
          ? [t("onlyYou"), s.nudge]
          : meWait
            ? [t("youAndMore", { n: others.length }), s.nudge]
            : others.length === 1
              ? [t("onlyOne", { name: name(others[0], others[0].isYou) })]
              : [t("more", { n: others.length })];
  const toggle = async () => {
    const next = !mine;
    setGuess(next);
    await act(() => setReady(code, next));
    setGuess(null);
  };
  const again = async () => {
    setStarting(true);
    // the loading screen covers the page at once, as the lobby's start does
    setStartAsked(true);
    const r = await act(() => startGame(code));
    if (!r.ok) {
      setStartAsked(false);
      setStarting(false);
    }
  };
  const enough = here.length >= GAME_SEATS[view.settings.game].min;
  return (
    <div className={s.ready}>
      <div className={s.st}>
        <b className={cn(s.stTitle, cls)} role="status">
          {title}
        </b>
        <span className={s.stCount}>
          {t("count", {
            ready: here.length - waiting.length,
            total: here.length,
          })}
        </span>
      </div>
      <ul className={s.faces}>
        {here.map((p) => {
          const ok = ready(p.id);
          return (
            <li
              key={p.id}
              className={cn(
                s.face,
                !ok && s.wait,
                p.isYou && s.me,
                ok && !readyAtFirst.current.has(p.id) && s.hop,
              )}
              style={{ "--seat": seatOf(p.colorSlot) } as CSSProperties}
              title={name(p, p.isYou)}
            >
              <span
                className={s.av}
                style={{ width: 28, height: 28, background: p.avatar.color }}
              >
                {/* biome-ignore lint/performance/noImgElement: generated svg or a remote picture */}
                <img src={avatarSrc(p.avatar)} alt="" />
              </span>
              {ok ? (
                <span className={s.ok}>
                  <Check size={10} strokeWidth={4} aria-hidden="true" />
                </span>
              ) : null}
              {p.isHost ? (
                <svg className={s.crown} viewBox="0 0 24 16" aria-hidden="true">
                  <path
                    d="M2 14 1 3l6 5 5-7 5 7 6-5-1 11Z"
                    fill="currentColor"
                    stroke="#7a5a12"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </li>
          );
        })}
      </ul>
      {watching ? null : (
        <div className={s.keys}>
          <button
            type="button"
            className={keyClass("grape", { className: s.back })}
            disabled={pending || starting}
            onClick={() => void act(() => backToLobby(code))}
          >
            <ArrowLeft aria-hidden="true" />
            {t("back")}
          </button>
          {isHost ? (
            <button
              type="button"
              className={keyClass("yes", {
                pressed: starting,
                bounce: true,
                className: s.go,
              })}
              aria-pressed={starting}
              disabled={!enough || pending || starting}
              onClick={() => void again()}
            >
              <RotateCcw aria-hidden="true" />
              {t("again")}
            </button>
          ) : (
            <button
              type="button"
              className={keyClass(mine ? "yes" : "apricot", {
                pressed: mine,
                bounce: !mine,
                className: s.go,
              })}
              aria-pressed={mine}
              onClick={() => void toggle()}
            >
              <Check aria-hidden="true" />
              {t("ready")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
