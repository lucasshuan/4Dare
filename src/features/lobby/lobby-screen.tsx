"use client";

import {
  Check,
  Clock,
  Copy,
  Crown,
  Globe,
  Link as LinkIcon,
  Lock,
  Play,
  UsersRound,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { Screen } from "@/components/ui/screen";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Timer } from "@/components/ui/timer";
import { useToast } from "@/components/ui/toast";
import { SettingsFields } from "@/features/create/settings-fields";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { usePrefetchCharacterIndex } from "@/features/pick/use-character-index";
import type { Lang } from "@/game/types";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { riseIn } from "@/lib/motion";
import { formatClock, useDisplayName } from "@/lib/names";
import { WHO_AM_I } from "@/lib/routes";
import {
  leaveRoom,
  setReady,
  startGame,
  updateSettings,
} from "@/server/actions";
import type { CreateRoomInput } from "@/server/contract";

/** Only what the host can change (the server rejects anything else). */
const editable = ({
  visibility,
  seats,
  stepSeconds,
}: CreateRoomInput): CreateRoomInput => ({ visibility, seats, stepSeconds });

export function LobbyScreen() {
  const t = useTranslations("lobby");
  const name = useDisplayName();
  const toast = useToast();
  const router = useRouter();
  const { view, me, offset, code } = useRoomContext();
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
  const hostName = host ? name(host) : "";
  const empty = Math.max(0, view.settings.seats - view.players.length);
  const others = view.players.filter((p) => !p.isHost);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CreateRoomInput>(() =>
    editable(view.settings),
  );
  const { visibility, seats, stepSeconds } = view.settings;

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(done);
    } catch {
      toast(text);
    }
  };

  return (
    <Screen
      left={null}
      right={
        <>
          <LanguageSwitch />
          <ThemeToggle />
        </>
      }
    >
      <div className="flex flex-wrap items-start gap-10 lg:gap-16">
        <section className="flex min-w-0 flex-[1_1_480px] flex-col gap-7 short:gap-5 tiny:gap-4">
          <div className="flex flex-col gap-3">
            <h1 className="max-w-[560px] font-bold font-display text-[clamp(32px,4vw,44px)] leading-[1.1] tracking-[-0.015em] [text-wrap:balance] tiny:text-[30px]">
              {me.isHost ? t("titleHost") : t("titleGuest", { name: hostName })}
            </h1>
            <p className="max-w-[480px] text-ink-muted text-lg tiny:text-base">
              {me.isHost
                ? t("subtitleHost")
                : t("subtitleGuest", { name: hostName })}
            </p>
          </div>

          <div className="flex flex-col gap-4 short:gap-3">
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
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() =>
                  copy(`${window.location.origin}/r/${code}`, t("linkCopied"))
                }
              >
                <LinkIcon strokeWidth={1.75} />
                {t("copyLink")}
              </Button>
              <Button onClick={() => copy(code, t("codeCopied"))}>
                <Copy strokeWidth={1.75} />
                {t("copyCode")}
              </Button>
            </div>
            {/* the link is one click away ("Copy link"), so very short windows skip it */}
            <span className="font-mono text-[13px] text-ink-muted tiny:hidden">
              {typeof window === "undefined"
                ? `/r/${code}`
                : `${window.location.host}/r/${code}`}
            </span>
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
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold text-sm">{t("startsIn")}</span>
            <Timer
              deadline={view.deadline}
              stepStartsAt={view.stepStartsAt}
              offset={offset}
            />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {editing ? (
              <motion.form
                key="edit"
                {...riseIn}
                className="flex flex-col gap-5"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await act(() => updateSettings(code, draft));
                  if (r.ok) {
                    setEditing(false);
                    toast(t("settingsSaved"));
                  }
                }}
              >
                <SettingsFields
                  value={draft}
                  onChange={setDraft}
                  minSeats={view.players.length}
                  hints={false}
                />
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" disabled={pending}>
                    {t("saveSettings")}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    {t("cancel")}
                  </Button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="view"
                {...riseIn}
                className="flex flex-col gap-4"
              >
                <ul className="flex flex-col gap-3">
                  <Setting icon={visibility === "public" ? Globe : Lock}>
                    {t(visibility === "public" ? "public" : "private")}
                  </Setting>
                  <Setting icon={UsersRound}>{t("seats", { seats })}</Setting>
                  <Setting icon={Clock}>
                    {t("stepSeconds", {
                      seconds: stepSeconds,
                      clock: formatClock(stepSeconds),
                    })}
                  </Setting>
                  <Setting icon={Play}>{t("mode")}</Setting>
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
              </motion.div>
            )}
          </AnimatePresence>
          {me.isHost ? (
            <>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!view.canStart || pending}
                onClick={() => act(() => startGame(code))}
              >
                {t("start")}
              </Button>
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
            className="self-center"
            onClick={async () => {
              await leaving.run(() => leaveRoom(code));
              router.push(WHO_AM_I);
            }}
          >
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
