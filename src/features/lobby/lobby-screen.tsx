"use client";

import { Popover } from "@base-ui/react/popover";
import {
  Check,
  ChevronLeft,
  DoorOpen,
  Link as LinkIcon,
  Settings,
} from "lucide-react";
import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useRef, useState } from "react";
import { Button, buttonClass, keyClass } from "@/components/ui/button";
import { useWithNames } from "@/components/ui/player-name";
import { RoomQr } from "@/components/ui/room-qr";
import { Screen } from "@/components/ui/screen";
import { SoundToggle } from "@/components/ui/sound-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { usePrefetchCharacterIndex } from "@/features/characters/use-character-index";
import {
  GameField,
  GameThumb,
  useGameName,
} from "@/features/create/game-field";
import { saveSetup } from "@/features/create/last-setup";
import { useLineupCount } from "@/features/create/lineup-catalog";
import { backClass, RoomSetup } from "@/features/create/room-setup";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { GAME_SEATS } from "@/game/games";
import type { Lang } from "@/game/types";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { riseIn } from "@/lib/motion";
import { useDisplayName, useRoomTitle } from "@/lib/names";
import { GAME_PATHS } from "@/lib/routes";
import {
  drawChair,
  kickPlayer,
  leaveRoom,
  setReady,
  sitChair,
  startGame,
  updateSettings,
} from "@/server/actions";
import type { CreateRoomInput } from "@/server/contract";
import { LobbyTabs } from "./lobby-tabs";
import { PastMatches } from "./past-matches";
import {
  AuctionRow,
  GostosRow,
  ImpostorsRow,
  MissionsRow,
  ModeRow,
  RoomTitle,
  SeatsRow,
  ThemeModeRow,
  TimesRow,
  VisibilityRow,
} from "./room-edits";
import { SeatGrid } from "./seat-grid";
import { StartDialog } from "./start-dialog";
import { TvChair } from "./tv-chair";

const titleClass =
  "max-w-[560px] font-bold font-display text-[clamp(32px,4vw,44px)] leading-[1.1] tracking-[-0.015em] [text-wrap:balance] tiny:text-[30px]";

/** The lobby's panels: the invite, the players and the room's settings, each lifted off the backdrop. */
const panelClass = "rounded-lg bg-surface p-6 max-sm:p-4";

/** How askew each tile of the room code sits, in degrees. */
const TILE_TILT = [-3, 2, -1.5, 2.5, -2];

/** Only what the host can change (the server rejects anything else). */
const editable = ({
  game,
  name,
  visibility,
  password,
  seats,
  voteSeconds,
  askSeconds,
  guessSeconds,
  answerSeconds,
  validateSeconds,
  replySeconds,
  talkSeconds,
  lastSeconds,
  lotSeconds,
  tradeSeconds,
  defendSeconds,
  judgeSeconds,
  impostors,
  themeMode,
  offGostos,
  offThemes,
  coins,
  lotsPerSeat,
  rounds,
  interval,
  trades,
  heavy,
  offMissions,
}: CreateRoomInput): CreateRoomInput => ({
  game,
  name,
  visibility,
  password,
  seats,
  voteSeconds,
  askSeconds,
  guessSeconds,
  answerSeconds,
  validateSeconds,
  replySeconds,
  talkSeconds,
  lastSeconds,
  lotSeconds,
  tradeSeconds,
  defendSeconds,
  judgeSeconds,
  impostors,
  themeMode,
  offGostos,
  offThemes,
  coins,
  lotsPerSeat,
  rounds,
  interval,
  trades,
  heavy,
  offMissions,
});

export function LobbyScreen() {
  const t = useTranslations("lobby");
  const tCreate = useTranslations("home.createRoom");
  const tMatch = useTranslations("common.currentMatch");
  const _name = useDisplayName();
  const roomTitle = useRoomTitle();
  const withNames = useWithNames();
  const toast = useToast();
  const router = useRouter();
  const { view, me, code } = useRoomContext();
  const { act, pending } = useRoomAction();
  const leaving = useAction();
  // "Ready" flips at once; the server confirms in the background.
  const [readyGuess, setReadyGuess] = useState<boolean | null>(null);
  const myReady = readyGuess ?? me.ready;
  const toggleReady = async () => {
    const next = !myReady;
    setReadyGuess(next);
    await act(() => setReady(code, next));
    setReadyGuess(null);
  };
  // Picking comes next: fetch the character index while people gather.
  usePrefetchCharacterIndex(useLocale() as Lang);
  const host = view.players.find((p) => p.isHost);
  const others = view.players.filter((p) => !p.isHost);
  const waiting = others.filter((p) => !p.ready);
  // asks first only when someone has not confirmed yet
  const [confirming, setConfirming] = useState(false);
  const start = () => act(() => startGame(code));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CreateRoomInput>(() =>
    editable(view.settings),
  );
  const { game, name: roomName, seats, themeMode } = view.settings;
  const gameName = useGameName();
  // The host sees every seat the game allows, and their changes show at once;
  // the server confirms in the background (a refusal puts things back).
  const range = GAME_SEATS[game];
  const [seatsGuess, setSeatsGuess] = useState<number | null>(null);
  const [kicking, setKicking] = useState<string[]>([]);
  const inFlight = useRef(0);
  const shownSeats = seatsGuess ?? seats;
  const cards = useLineupCount(view.settings);
  const shownPlayers = view.players
    .filter((p) => !kicking.includes(p.id))
    .map((p) => (p.isYou ? { ...p, ready: myReady } : p));
  const canClose = shownSeats > Math.max(range.min, shownPlayers.length);
  const setSeats = async (n: number) => {
    setSeatsGuess(n);
    inFlight.current += 1;
    await act(() => updateSettings(code, { seats: n as typeof seats }));
    inFlight.current -= 1;
    if (inFlight.current === 0) setSeatsGuess(null);
  };
  const kick = async (id: string) => {
    setKicking((ids) => [...ids, id]);
    await act(() => kickPlayer(code, id));
    setKicking((ids) => ids.filter((x) => x !== id));
  };

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(done);
    } catch {
      toast(text);
    }
  };

  // A new name shows at once; the server confirms in the background.
  const [nameGuess, setNameGuess] = useState<string | null>(null);
  const title = roomTitle(nameGuess ?? roomName, host);
  const rename = async (next: string) => {
    setNameGuess(next);
    await act(() => updateSettings(code, { name: next }));
    setNameGuess(null);
  };
  // after a match the room is not new any more
  const greeting = me.isHost
    ? t(view.round > 0 ? "titleHostAgain" : "titleHost")
    : withNames((n) =>
        t(view.round > 0 ? "titleGuestAgain" : "titleGuest", {
          name: host ? n(host) : "",
        }),
      );

  // The host changes the room here; a new room skips this screen and starts with the last setup.
  if (editing) {
    return (
      <Screen left={<HubBrand />} right={<HubActions />}>
        <m.div {...riseIn}>
          <RoomSetup
            back={
              <button
                type="button"
                onClick={() => setEditing(false)}
                className={backClass}
              >
                <ChevronLeft className="size-4" strokeWidth={2} />
                {tCreate("back")}
              </button>
            }
            title={t("settingsTitle")}
            submit={t("saveSettings")}
            value={draft}
            onChange={setDraft}
            minSeats={view.players.length}
            pending={pending}
            onSubmit={async (v) => {
              const r = await act(() => updateSettings(code, v));
              if (r.ok) {
                setEditing(false);
                saveSetup(v);
                toast(t("settingsSaved"));
              }
            }}
          />
        </m.div>
      </Screen>
    );
  }

  return (
    <Screen bare>
      {/* no top bar here: the lobby is the game's waiting room, with only sound, theme and the way out, top right like a match's "Leave" */}
      <div className="mb-3 flex items-center justify-end gap-2 sm:gap-3">
        <SoundToggle />
        <ThemeToggle />
        <button
          type="button"
          onClick={async () => {
            await leaving.run(() => leaveRoom(code));
            router.push(GAME_PATHS[game]);
          }}
          className={buttonClass(
            "secondary",
            "sm",
            "h-10 max-sm:w-10 max-sm:px-0",
          )}
        >
          <DoorOpen strokeWidth={1.75} />
          <span className="max-sm:sr-only">{tMatch("leaveShort")}</span>
        </button>
      </div>
      {/* on a desktop the lobby fits the window and never scrolls: the lists and the settings scroll inside their panels */}
      <div className="flex flex-wrap items-start gap-6 lg:min-h-0 lg:flex-1 lg:flex-nowrap lg:items-stretch lg:gap-8">
        {/* one width whatever the open tab holds */}
        <section className="flex w-full min-w-0 flex-col gap-5 short:gap-4 lg:min-h-0 lg:max-w-[768px] lg:flex-1">
          {/* the invite: the room's name leads it, the greeting sits close to the code it explains, the QR code to their right (not on phones) */}
          <div className={cn(panelClass, "flex shrink-0 flex-col gap-4")}>
            <RoomTitle
              title={title}
              name={nameGuess ?? roomName}
              editable={me.isHost}
              className={titleClass}
              onRename={rename}
            />
            <div className="flex items-center gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-4 short:gap-3">
                <p className="max-w-[560px] font-semibold text-xl [text-wrap:balance]">
                  {greeting}
                </p>
                {/* desktop: "Copy link" right of the code; phones: under it */}
                <div className="flex flex-col items-start gap-4 short:gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  {/* the code as game tiles, each a little askew */}
                  <div className="flex gap-2">
                    <span className="sr-only">
                      {t("codeLabel", { code: code.split("").join(" ") })}
                    </span>
                    {code.split("").map((c, i) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: always five cells
                        key={i}
                        aria-hidden="true"
                        style={{
                          rotate: `${TILE_TILT[i % TILE_TILT.length]}deg`,
                        }}
                        className="flex h-20 w-14 items-center justify-center rounded-md bg-sunken font-display font-extrabold text-[40px] text-ink shadow-[inset_0_-5px_0_var(--line)] short:h-16 short:text-[34px] sm:w-16 sm:short:w-14"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <Button
                    onClick={() =>
                      copy(
                        `${window.location.origin}/r/${code}`,
                        t("linkCopied"),
                      )
                    }
                  >
                    <LinkIcon strokeWidth={1.75} />
                    {t("copyLink")}
                  </Button>
                </div>
              </div>
              <RoomQr code={code} className="max-sm:hidden" />
            </div>
          </div>
          {/* What for?'s presenter chair, over the lists */}
          {game === "lineup" && view.settings.mode === "host" ? (
            <TvChair
              players={shownPlayers}
              here={shownPlayers.filter((p) => !p.away).length}
              chairId={view.chairId}
              meId={me.id}
              host={me.isHost}
              pending={pending}
              onSeat={(seat) => void act(() => sitChair(code, seat))}
              onDraw={() => void act(() => drawChair(code))}
            />
          ) : null}
          {/* who is here, and the room's past matches: always takes what is left of the window, and scrolls inside */}
          <div className={cn(panelClass, "flex flex-col lg:min-h-0 lg:flex-1")}>
            <LobbyTabs
              label={t("listsLabel")}
              tabs={[
                {
                  key: "players",
                  label: t("players"),
                  count: `${shownPlayers.length}/${shownSeats}`,
                  panel: (
                    <SeatGrid
                      players={shownPlayers}
                      seats={shownSeats}
                      slots={me.isHost ? range.max : shownSeats}
                      host={me.isHost}
                      canClose={canClose}
                      onSeats={setSeats}
                      onKick={kick}
                    />
                  ),
                },
                {
                  key: "matches",
                  label: t("matches"),
                  count: String(view.matches.length),
                  panel: <PastMatches matches={view.matches} />,
                },
              ]}
            />
          </div>
        </section>

        <div className="flex w-full flex-col gap-4 lg:min-h-0 lg:w-[416px] lg:shrink-0">
          {/* the game and the main action, above the room's settings; the host can switch the game there */}
          <div className="flex flex-wrap items-center gap-3">
            {me.isHost ? (
              <GameField
                value={game}
                seated={view.players.length}
                onChange={(next) => {
                  if (next !== game)
                    void act(() => updateSettings(code, { game: next }));
                }}
                className="min-w-0 flex-1 basis-56 pr-4 sm:w-auto"
              />
            ) : (
              <>
                <GameThumb game={game} size="sm" />
                <span className="min-w-20 grow-999 basis-0 font-bold font-display text-lg leading-tight">
                  {gameName(game)}
                </span>
              </>
            )}
            {/* keys like "Create room": the host's starts the match; a guest's stays pressed down once ready */}
            {me.isHost ? (
              <>
                <StartBlocked
                  reason={
                    view.players.length < 2
                      ? t("needPlayers")
                      : cards?.tooFew
                        ? t("needCards")
                        : null
                  }
                >
                  <button
                    type="button"
                    className={keyClass("yes", {
                      bounce: true,
                      className: "min-h-14 w-full px-6 text-lg",
                    })}
                    disabled={!view.canStart || !!cards?.tooFew || pending}
                    onClick={() =>
                      waiting.length ? setConfirming(true) : start()
                    }
                  >
                    {t("start")}
                  </button>
                </StartBlocked>
                <StartDialog
                  open={confirming && view.canStart}
                  onClose={() => setConfirming(false)}
                  waiting={waiting}
                  pending={pending}
                  onStart={start}
                />
              </>
            ) : (
              <button
                type="button"
                className={keyClass(myReady ? "yes" : "apricot", {
                  pressed: myReady,
                  bounce: true,
                  className: "min-h-14 grow px-6 text-lg",
                })}
                aria-pressed={myReady}
                disabled={pending}
                onClick={toggleReady}
              >
                <Check className="size-5 shrink-0" strokeWidth={2.5} />
                {/* the same word either way, so the button keeps its size */}
                {t("readyButton")}
              </button>
            )}
          </div>
          <aside
            className={cn(
              panelClass,
              "flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain",
            )}
          >
            <ul className="flex flex-col gap-3">
              <VisibilityRow
                settings={view.settings}
                editable={me.isHost}
                pending={pending}
                onSave={async (v) =>
                  (await act(() => updateSettings(code, v))).ok
                }
              />
              <SeatsRow
                game={game}
                seats={shownSeats}
                seated={shownPlayers.length}
                editable={me.isHost}
                pending={pending}
                onSave={async (n) => {
                  await setSeats(n);
                  return true;
                }}
              />
              <TimesRow
                settings={view.settings}
                editable={me.isHost}
                pending={pending}
                onSave={async (times) =>
                  (await act(() => updateSettings(code, times))).ok
                }
              />
              <GostosRow
                settings={view.settings}
                editable={me.isHost}
                pending={pending}
                onSave={async (v) =>
                  (await act(() => updateSettings(code, v))).ok
                }
              />
              {game === "impostor" ? (
                <ImpostorsRow
                  value={view.settings.impostors}
                  seats={shownSeats}
                  players={view.players.length}
                  editable={me.isHost}
                  pending={pending}
                  onSave={async (impostors) =>
                    (await act(() => updateSettings(code, { impostors }))).ok
                  }
                />
              ) : null}
              {game === "lineup" ? (
                <>
                  <ModeRow
                    value={view.settings.mode}
                    seats={shownSeats}
                    editable={me.isHost}
                    pending={pending}
                    onSave={async (mode) =>
                      (await act(() => updateSettings(code, { mode }))).ok
                    }
                  />
                  <AuctionRow
                    settings={view.settings}
                    players={shownPlayers.length}
                    editable={me.isHost}
                    pending={pending}
                    onSave={async (v) =>
                      (await act(() => updateSettings(code, v))).ok
                    }
                  />
                  <MissionsRow
                    settings={view.settings}
                    editable={me.isHost}
                    pending={pending}
                    onSave={async (v) =>
                      (await act(() => updateSettings(code, v))).ok
                    }
                  />
                </>
              ) : null}
              {game === "who-am-i" ? (
                <ThemeModeRow
                  value={themeMode}
                  editable={me.isHost}
                  pending={pending}
                  onSave={async (next) =>
                    (await act(() => updateSettings(code, { themeMode: next })))
                      .ok
                  }
                />
              ) : null}
            </ul>
            {me.isHost ? (
              <button
                type="button"
                onClick={() => {
                  setDraft(editable(view.settings));
                  setEditing(true);
                }}
                className="inline-flex items-center gap-1.5 self-start font-semibold text-sky text-sm underline underline-offset-2"
              >
                <Settings className="size-4" strokeWidth={2} />
                {t("editSettings")}
              </button>
            ) : null}
          </aside>
        </div>
      </div>
    </Screen>
  );
}

/**
 * Wraps the host's start key: while the room can't start (short of players,
 * What for?'s gostos leaving too few characters), hovering or tapping it says
 * why. A disabled button takes no pointer events, so the wrapper is the
 * trigger.
 */
function StartBlocked({
  reason,
  children,
}: {
  reason: string | null;
  children: ReactNode;
}) {
  if (!reason) return <div className="shrink-0 max-sm:w-full">{children}</div>;
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={80}
        closeDelay={120}
        nativeButton={false}
        render={<span />}
        aria-label={reason}
        className="shrink-0 rounded-md max-sm:w-full"
      >
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={8} className="z-50">
          <Popover.Popup className="w-max max-w-[min(300px,calc(100vw-2rem))] origin-(--transform-origin) rounded-md bg-surface px-3 py-2 font-medium text-[13px] text-ink-muted leading-snug shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            {reason}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
