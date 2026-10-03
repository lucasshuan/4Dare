"use client";

import {
  Check,
  ChevronLeft,
  Clock,
  Crown,
  DoorOpen,
  Globe,
  Link as LinkIcon,
  Lock,
  PenLine,
  UsersRound,
  Vote,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useWithNames } from "@/components/ui/player-name";
import { RoomQr } from "@/components/ui/room-qr";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { GameThumb, useGameName } from "@/features/create/game-field";
import { saveSetup } from "@/features/create/last-setup";
import { backClass, RoomSetup } from "@/features/create/room-setup";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { usePrefetchCharacterIndex } from "@/features/pick/use-character-index";
import { THEME_SET_KEYS } from "@/game/theme-sets";
import { type Lang, STEP_TIMES } from "@/game/types";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { riseIn } from "@/lib/motion";
import { formatClock, useDisplayName } from "@/lib/names";
import { GAME_PATHS } from "@/lib/routes";
import {
  leaveRoom,
  setReady,
  startGame,
  updateSettings,
} from "@/server/actions";
import type { CreateRoomInput } from "@/server/contract";
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
  const tRooms = useTranslations("home.rooms");
  const name = useDisplayName();
  const withNames = useWithNames();
  const toast = useToast();
  const router = useRouter();
  const { view, me, code } = useRoomContext();
  const { act, pending } = useRoomAction();
  const leaving = useAction();
  // "I'm ready" flips at once; the server confirms in the background.
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
  const empty = Math.max(0, view.settings.seats - view.players.length);
  const others = view.players.filter((p) => !p.isHost);
  const waiting = others.filter((p) => !p.ready);
  // asks first only when someone has not confirmed yet
  const [confirming, setConfirming] = useState(false);
  const start = () => act(() => startGame(code));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CreateRoomInput>(() =>
    editable(view.settings),
  );
  const {
    game,
    name: roomName,
    visibility,
    seats,
    themeMode,
    themeSets,
  } = view.settings;
  const gameName = useGameName();

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(done);
    } catch {
      toast(text);
    }
  };

  // a room without a name goes by its host's, like in the room list
  const title =
    roomName || (host ? tRooms("roomOf", { name: name(host) }) : "");
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
        <motion.div {...riseIn}>
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
        </motion.div>
      </Screen>
    );
  }

  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <div className="flex flex-wrap items-start gap-10 lg:gap-16">
        <section className="flex min-w-0 flex-[1_1_480px] flex-col gap-7 short:gap-5 tiny:gap-4">
          <div className="flex flex-col gap-3">
            {/* the room leads with its name; the greeting drops to a line under it */}
            <h1 className={cn(titleClass, "wrap-break-word")}>{title}</h1>
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

          <div className="flex flex-col gap-4">
            <h2 className="font-semibold text-xl">
              {t("players", {
                count: view.players.length,
                seats: view.settings.seats,
              })}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AnimatePresence initial={false}>
                {view.players.map((player) => {
                  const p = player.isYou
                    ? { ...player, ready: myReady }
                    : player;
                  return (
                    <motion.li
                      key={p.id}
                      layout
                      {...riseIn}
                      className="flex items-center gap-3 rounded-md bg-surface p-3"
                    >
                      <Avatar
                        avatar={p.avatar}
                        isGuest={p.isGuest}
                        name={p.name}
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold">
                          {name(p, p.isYou)}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-[13px] text-ink-muted">
                          {p.isHost ? (
                            <Crown className="size-3.5" strokeWidth={1.75} />
                          ) : null}
                          {p.isHost
                            ? t("host")
                            : p.ready
                              ? t("ready")
                              : t("notReady")}
                        </span>
                      </div>
                      {p.isHost ? null : (
                        <span
                          role="img"
                          aria-label={p.ready ? t("ready") : t("notReady")}
                          className={cn(
                            "ml-auto flex size-7 shrink-0 items-center justify-center rounded-pill transition-colors duration-300",
                            p.ready
                              ? "bg-yes-soft text-yes"
                              : "bg-no-soft text-no",
                          )}
                        >
                          {p.ready ? (
                            <Check className="size-4" strokeWidth={2.25} />
                          ) : (
                            <X className="size-4" strokeWidth={2.25} />
                          )}
                        </span>
                      )}
                    </motion.li>
                  );
                })}
                {Array.from({ length: empty }, (_, i) => (
                  <motion.li
                    // biome-ignore lint/suspicious/noArrayIndexKey: empty seats have no identity
                    key={`empty-${i}`}
                    layout
                    {...riseIn}
                    className="flex items-center gap-3 rounded-md border-[1.5px] border-line border-dashed p-3 text-ink-muted"
                  >
                    <span className="flex size-11 items-center justify-center rounded-pill border-[1.5px] border-line-strong border-dashed font-bold font-display">
                      ?
                    </span>
                    <span className="font-medium">{t("emptySeat")}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </section>

        <aside className="flex w-full flex-col gap-5 rounded-lg bg-surface p-6 lg:max-w-[416px] lg:flex-[1_1_360px]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <GameThumb game={game} size="sm" />
              <span className="font-bold font-display text-lg">
                {gameName(game)}
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              <Setting icon={visibility === "public" ? Globe : Lock}>
                {t(visibility === "public" ? "public" : "private")}
                {/* the host shares the password; nobody else gets it */}
                {visibility === "private" && view.settings.password ? (
                  <span className="ml-1.5 rounded-sm bg-sunken px-1.5 py-0.5 font-mono text-[13px]">
                    {view.settings.password}
                  </span>
                ) : null}
              </Setting>
              <Setting icon={UsersRound}>{t("seats", { seats })}</Setting>
              <Setting icon={Clock}>
                <span className="sr-only">{t("timesLabel")}: </span>
                {/* a turn's steps in order, each with its clock */}
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
                className="self-start font-semibold text-sky text-sm underline underline-offset-2"
              >
                {t("editSettings")}
              </button>
            ) : null}
          </div>
          {me.isHost ? (
            <>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!view.canStart || pending}
                onClick={() => (waiting.length ? setConfirming(true) : start())}
              >
                {t("start")}
              </Button>
              <StartDialog
                open={confirming && view.canStart}
                onClose={() => setConfirming(false)}
                waiting={waiting}
                pending={pending}
                onStart={start}
              />
              <p className="text-center font-medium text-[13px] text-ink-muted">
                {view.canStart
                  ? t("startHint", {
                      ready: others.filter((p) => p.ready).length,
                      others: others.length,
                    })
                  : t("needTwo")}
              </p>
            </>
          ) : (
            <Button
              variant={myReady ? "secondary" : "primary"}
              size="lg"
              className="w-full"
              aria-pressed={myReady}
              disabled={pending}
              onClick={toggleReady}
            >
              <Check strokeWidth={2} />
              {myReady ? t("readyDone") : t("imReady")}
            </Button>
          )}
          <Button
            variant="ghost"
            className="self-center text-no hover:bg-no-soft hover:text-no"
            onClick={async () => {
              await leaving.run(() => leaveRoom(code));
              router.push(GAME_PATHS[game]);
            }}
          >
            <DoorOpen strokeWidth={1.75} />
            {t("leave")}
          </Button>
        </aside>
      </div>
    </Screen>
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
