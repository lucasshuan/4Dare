"use client";

import { Check, Copy, Crown, Link as LinkIcon, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { Screen } from "@/components/ui/screen";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Timer } from "@/components/ui/timer";
import { useToast } from "@/components/ui/toast";
import { useRoomContext } from "@/features/data/room-context";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { riseIn } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { leaveRoom, setReady, startGame } from "@/server/actions";

export function LobbyScreen() {
  const t = useTranslations("lobby");
  const name = useDisplayName();
  const toast = useToast();
  const router = useRouter();
  const { view, me, offset, refresh, code } = useRoomContext();
  const { run, pending } = useAction();
  const host = view.players.find((p) => p.isHost);
  const hostName = host ? name(host) : "";
  const empty = Math.max(0, view.settings.seats - view.players.length);

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
      right={
        <>
          <LanguageSwitch compact />
          <ThemeToggle />
        </>
      }
    >
      <div className="flex flex-wrap items-start gap-10 lg:gap-16">
        <section className="flex min-w-0 flex-[1_1_480px] flex-col gap-7">
          <div className="flex flex-col gap-3">
            <h1 className="max-w-[560px] font-bold font-display text-[clamp(32px,4vw,44px)] leading-[1.1] tracking-[-0.015em] [text-wrap:balance]">
              {me.isHost ? t("titleHost") : t("titleGuest", { name: hostName })}
            </h1>
            <p className="max-w-[480px] text-ink-muted text-lg">
              {me.isHost
                ? t("subtitleHost")
                : t("subtitleGuest", { name: hostName })}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <span className="sr-only">
                {t("codeLabel", { code: code.split("").join(" ") })}
              </span>
              {code.split("").map((c, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: always five cells
                  key={i}
                  aria-hidden="true"
                  className="flex h-20 w-14 items-center justify-center rounded-md border border-line bg-surface font-medium font-mono text-[40px] sm:w-16"
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
                {view.players.map((p) => (
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
                ))}
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
          <ul className="flex flex-col gap-2">
            <li>
              {t(view.settings.visibility === "public" ? "public" : "private")}
            </li>
            <li>{t("seats", { seats: view.settings.seats })}</li>
            <li>{t("stepSeconds", { seconds: view.settings.stepSeconds })}</li>
          </ul>
          {me.isHost ? (
            <>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!view.canStart || pending}
                onClick={async () => {
                  if ((await run(() => startGame(code))).ok) await refresh();
                }}
              >
                {t("start")}
              </Button>
              <p className="text-center font-medium text-[13px] text-ink-muted">
                {view.canStart ? t("startHint") : t("needTwo")}
              </p>
            </>
          ) : (
            <Button
              variant={me.ready ? "secondary" : "primary"}
              size="lg"
              className="w-full"
              aria-pressed={me.ready}
              disabled={pending}
              onClick={async () => {
                if ((await run(() => setReady(code, !me.ready))).ok)
                  await refresh();
              }}
            >
              <Check strokeWidth={2} />
              {me.ready ? t("readyDone") : t("imReady")}
            </Button>
          )}
          <Button
            variant="ghost"
            className="self-center"
            onClick={async () => {
              await run(() => leaveRoom(code));
              router.push("/");
            }}
          >
            {t("leave")}
          </Button>
        </aside>
      </div>
    </Screen>
  );
}
