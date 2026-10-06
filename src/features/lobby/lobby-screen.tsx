"use client";

import { Popover } from "@base-ui/react/popover";
import {
  Check,
  ChevronLeft,
  Clock,
  type Globe,
  Link as LinkIcon,
  PenLine,
  Settings,
  UsersRound,
  Vote,
} from "lucide-react";
import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useRef, useState } from "react";
import { Button, keyClass } from "@/components/ui/button";
import { useWithNames } from "@/components/ui/player-name";
import { RoomQr } from "@/components/ui/room-qr";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import {
  GameField,
  GameThumb,
  useGameName,
} from "@/features/create/game-field";
import { saveSetup } from "@/features/create/last-setup";
import { backClass, RoomSetup } from "@/features/create/room-setup";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { usePrefetchCharacterIndex } from "@/features/pick/use-character-index";
import { GAME_SEATS } from "@/game/games";
import { THEME_SET_KEYS } from "@/game/theme-sets";
import { type Lang, STEP_TIMES } from "@/game/types";
import { useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/hooks/use-action";
import { riseIn } from "@/lib/motion";
import { formatClock, useDisplayName, useRoomTitle } from "@/lib/names";
import { GAME_PATHS } from "@/lib/routes";
import {
  kickPlayer,
  leaveRoom,
  setReady,
  startGame,
  updateSettings,
} from "@/server/actions";
import type { CreateRoomInput } from "@/server/contract";
import { LobbyTabs } from "./lobby-tabs";
import { PastMatches } from "./past-matches";
import { RoomTitle, VisibilityRow } from "./room-edits";
import { SeatGrid } from "./seat-grid";
import { StartDialog } from "./start-dialog";

const titleClass =
  "max-w-[560px] font-bold font-display text-[clamp(32px,4vw,44px)] leading-[1.1] tracking-[-0.015em] [text-wrap:balance] tiny:text-[30px]";

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
  themeMode,
  themeSets,
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
  themeMode,
  themeSets,
});

export function LobbyScreen() {
  const t = useTranslations("lobby");
  const tCreate = useTranslations("home.createRoom");
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
  const { game, name: roomName, seats, themeMode, themeSets } = view.settings;
  const gameName = useGameName();
  // The host sees every seat the game allows, and their changes show at once;
  // the server confirms in the background (a refusal puts things back).
  const range = GAME_SEATS[game];
  const [seatsGuess, setSeatsGuess] = useState<number | null>(null);
  const [kicking, setKicking] = useState<string[]>([]);
  const inFlight = useRef(0);
  const shownSeats = seatsGuess ?? seats;
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
    <Screen left={<HubBrand />} right={<HubActions />}>
      <div className="flex flex-wrap items-start gap-10 lg:gap-16">
        <section className="flex min-w-0 flex-[1_1_480px] flex-col gap-7 short:gap-5 tiny:gap-4">
          {/* the greeting sits close to the code it explains */}
          <div className="flex flex-col gap-4 short:gap-3">
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={async () => {
                  await leaving.run(() => leaveRoom(code));
                  router.push(GAME_PATHS[game]);
                }}
                className={backClass}
              >
                <ChevronLeft className="size-4" strokeWidth={2} />
                {t("leave")}
              </button>
              {/* the room leads with its name; the greeting drops to a line under it */}
              <RoomTitle
                title={title}
                name={nameGuess ?? roomName}
                editable={me.isHost}
                className={titleClass}
                onRename={rename}
              />
              {/* the QR code sits right of the greeting and the description (not on phones) */}
              <div className="flex items-center gap-6">
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <p className="max-w-[560px] font-semibold text-xl [text-wrap:balance]">
                    {greeting}
                  </p>
                  <p className="max-w-[480px] text-ink-muted text-lg tiny:text-base">
                    {me.isHost
                      ? t(view.round > 0 ? "subtitleHostAgain" : "subtitleHost")
                      : withNames((n) =>
                          t("subtitleGuest", { name: host ? n(host) : "" }),
                        )}
                  </p>
                </div>
                <RoomQr code={code} className="max-sm:hidden" />
              </div>
            </div>

            {/* desktop: "Copy link" right of the code; phones: under it */}
            <div className="flex flex-col items-start gap-4 short:gap-3 sm:flex-row sm:items-center">
              <div className="flex gap-2">
                <span className="sr-only">
                  {t("codeLabel", { code: code.split("").join(" ") })}
                </span>
                {code.split("").map((c, i) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: always five cells
                    key={i}
                    aria-hidden="true"
                    className="flex h-20 w-14 items-center justify-center rounded-md border border-line bg-surface font-medium font-mono text-[40px] short:h-16 short:text-[34px] sm:w-16 sm:short:w-14"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <Button
                onClick={() =>
                  copy(`${window.location.origin}/r/${code}`, t("linkCopied"))
                }
              >
                <LinkIcon strokeWidth={1.75} />
                {t("copyLink")}
              </Button>
            </div>
          </div>
          {/* who is here, and the room's past matches */}
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
        </section>

        <div className="flex w-full flex-col gap-4 lg:max-w-[416px] lg:flex-[1_1_360px]">
          {/* the game and the main action, above the room's settings; the host can switch the game there */}
          <div className="flex flex-wrap items-center gap-3">
            {me.isHost ? (
              <GameField
                value={game}
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
                <NeedsPlayers show={view.players.length < 2}>
                  <button
                    type="button"
                    className={keyClass("yes", {
                      bounce: true,
                      className: "min-h-14 w-full px-6 text-lg",
                    })}
                    disabled={!view.canStart || pending}
                    onClick={() =>
                      waiting.length ? setConfirming(true) : start()
                    }
                  >
                    {t("start")}
                  </button>
                </NeedsPlayers>
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
          <aside className="flex flex-col gap-4 rounded-lg bg-surface p-6">
            <ul className="flex flex-col gap-3">
              <VisibilityRow
                settings={view.settings}
                editable={me.isHost}
                pending={pending}
                onSave={async (v) =>
                  (await act(() => updateSettings(code, v))).ok
                }
              />
              <Setting icon={UsersRound}>
                {t("seats", { seats: shownSeats })}
              </Setting>
              <Setting icon={Clock}>
                <span className="sr-only">{t("timesLabel")}: </span>
                {/* the match's steps in order, each with its clock */}
                <span className="flex flex-wrap gap-1.5">
                  {STEP_TIMES.map((step) => (
                    <span
                      key={step}
                      className="inline-flex items-baseline gap-1.5 rounded-sm bg-sunken px-2 py-0.5 text-sm"
                    >
                      {t(`times.${step}`)}
                      <span className="font-medium font-mono text-[13px] tabular-nums">
                        {formatClock(view.settings[step])}
                      </span>
                    </span>
                  ))}
                </span>
              </Setting>
              <Setting icon={themeMode === "host" ? PenLine : Vote}>
                {themeMode === "host"
                  ? t("themeHost")
                  : themeSets.length === THEME_SET_KEYS.length
                    ? t("themeVoteAll")
                    : t("themeVote", {
                        on: themeSets.length,
                        total: THEME_SET_KEYS.length,
                      })}
              </Setting>
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
 * Wraps the host's start key: while the room is short of players, hovering
 * or tapping it says why it is off. A disabled button takes no pointer
 * events, so the wrapper is the trigger.
 */
function NeedsPlayers({
  show,
  children,
}: {
  show: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("lobby");
  if (!show) return <div className="shrink-0 max-sm:w-full">{children}</div>;
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={80}
        closeDelay={120}
        nativeButton={false}
        render={<span />}
        aria-label={t("needPlayers")}
        className="shrink-0 rounded-md max-sm:w-full"
      >
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={8} className="z-50">
          <Popover.Popup className="w-max max-w-[min(300px,calc(100vw-2rem))] origin-(--transform-origin) rounded-md bg-surface px-3 py-2 font-medium text-[13px] text-ink-muted leading-snug shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            {t("needPlayers")}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Setting({
  icon: Icon,
  children,
}: {
  icon: typeof Globe;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <Icon className="size-5 shrink-0 text-ink-muted" strokeWidth={1.75} />
      <span>{children}</span>
    </li>
  );
}
