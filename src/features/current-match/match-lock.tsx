"use client";

import { Popover } from "@base-ui/react/popover";
import { ArrowRight, DoorOpen, Lock } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { GameThumb, useGameName } from "@/features/create/game-field";
import {
  useCurrentMatch,
  useLeaveMatch,
} from "@/features/data/use-current-match";
import type { Phase } from "@/game/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import type { CurrentMatch } from "@/server/contract";

/** What the match is doing right now, in three words or so. */
export function usePhaseLabel() {
  const t = useTranslations("common.currentMatch.phase");
  return (phase: Phase) =>
    t(
      phase === "theming" || phase === "voting"
        ? "theme"
        : phase === "picking"
          ? "picking"
          : "playing",
    );
}

/** The match at a glance: the game's picture, its name, what it is doing, and the room code. */
export function MatchChip({ match }: { match: CurrentMatch }) {
  const gameName = useGameName();
  const phase = usePhaseLabel();
  return (
    <div className="flex items-center gap-3 rounded-lg bg-sunken p-2 pr-4 text-left">
      <GameThumb game={match.game} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-bold font-display">
          {gameName(match.game)}
        </span>
        <span className="flex items-center gap-1.5 font-medium text-[13px] text-no">
          <LiveDot />
          {phase(match.phase)}
        </span>
      </div>
      <span className="font-medium font-mono text-ink-muted text-sm tracking-[0.15em]">
        {match.code}
      </span>
    </div>
  );
}

/** A red dot that keeps pulsing: the match goes on without you. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("relative flex size-2 shrink-0", className)}
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
      <span className="relative size-2 rounded-full bg-current" />
    </span>
  );
}

/** "Back to the match", and "Leave the match" behind a quick "sure?". */
export function MatchActions({
  match,
  onLeft,
  className,
}: {
  match: CurrentMatch;
  onLeft?: () => void;
  className?: string;
}) {
  const t = useTranslations("common.currentMatch");
  const { leave, pending } = useLeaveMatch();
  const [sure, setSure] = useState(false);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Link
        href={`/r/${match.code}`}
        className={buttonClass("danger", "md", "group w-full")}
      >
        {t("back")}
        <ArrowRight
          className="transition-transform duration-200 ease-soft group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      </Link>
      <AnimatePresence mode="wait" initial={false}>
        {sure ? (
          <motion.div
            key="sure"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="flex flex-col gap-2 rounded-lg bg-no-soft p-3"
          >
            <p className="font-medium text-sm">{t("leaveSure")}</p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                disabled={pending}
                onClick={async () => {
                  if (await leave(match.code)) onLeft?.();
                }}
              >
                {t("leaveYes")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSure(false)}>
                {t("stay")}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="leave"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <Button
              variant="ghost"
              className="w-full hover:text-no"
              onClick={() => setSure(true)}
            >
              <DoorOpen strokeWidth={1.75} />
              {t("leave")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A padlock that jiggles when it shows up, with red rings rippling out behind it. */
function PulsingLock({ big }: { big?: boolean }) {
  const still = useReducedMotion() ?? false;
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        big ? "size-20" : "size-16",
      )}
    >
      {still
        ? null
        : [0, 1].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute inset-0 rounded-full bg-no"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.7], opacity: [0.35, 0] }}
              transition={{
                duration: 2.2,
                delay: 0.4 + i * 1.1,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeOut",
              }}
            />
          ))}
      <motion.span
        className="relative flex size-full items-center justify-center rounded-full bg-no text-on-no shadow-card"
        initial={{ rotate: 0, scale: 0.6 }}
        animate={
          still
            ? { scale: 1 }
            : { rotate: [0, -14, 12, -8, 5, 0], scale: [0.6, 1.08, 1] }
        }
        transition={{ duration: 0.7, ease: ease.soft }}
      >
        <Lock className={big ? "size-9" : "size-7"} strokeWidth={2} />
      </motion.span>
    </span>
  );
}

/** "You're in a match": why joining and creating are off, and the way back or out. */
export function MatchLockCard({
  match,
  big,
  className,
}: {
  match: CurrentMatch;
  big?: boolean;
  className?: string;
}) {
  const t = useTranslations("common.currentMatch");
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.36, ease: ease.soft }}
      className={cn(
        "flex w-full flex-col items-center gap-5 rounded-xl border-[1.5px] border-no/40 bg-surface text-center shadow-pop",
        big ? "max-w-md p-8" : "max-w-sm p-6",
        className,
      )}
    >
      <PulsingLock big={big} />
      <div className="flex flex-col gap-1.5">
        <h2
          className={cn(
            "font-bold font-display tracking-[-0.01em]",
            big ? "text-3xl" : "text-2xl",
          )}
        >
          {t("lockTitle")}
        </h2>
        <p className="text-ink-muted">{t("lockText")}</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <MatchChip match={match} />
        <MatchActions match={match} />
      </div>
    </motion.div>
  );
}

/** Red caution stripes behind a locked area. */
const STRIPES =
  "bg-[repeating-linear-gradient(-45deg,var(--no-soft)_0_14px,transparent_14px_28px)]";

/**
 * Joining and creating rooms, switched off while you are in a match: the area
 * stays in sight, faded behind caution stripes, under the lock card.
 */
export function MatchGate({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { match } = useCurrentMatch();
  return (
    <div className="relative">
      <div
        inert={match ? true : undefined}
        aria-hidden={match ? true : undefined}
        className={cn(
          "transition-[filter,opacity] duration-500 ease-soft",
          className,
          match &&
            "pointer-events-none select-none opacity-35 blur-[2px] grayscale",
        )}
      >
        {children}
      </div>
      <AnimatePresence>
        {match ? (
          <motion.div
            key="lock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "absolute inset-0 z-10 flex min-h-[420px] items-center justify-center rounded-xl p-4",
              STRIPES,
            )}
          >
            <MatchLockCard match={match} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * The full-page version, for screens that only create or join (the create
 * screen, someone else's room link). Shows `children` when there is no match.
 */
export function MatchLockPage({
  match,
  children,
}: {
  match: CurrentMatch | null;
  children?: ReactNode;
}) {
  if (!match) return <>{children}</>;
  return (
    <div
      className={cn(
        "flex min-h-[min(70dvh,640px)] items-center justify-center rounded-xl p-4 sm:p-8",
        STRIPES,
      )}
    >
      <MatchLockCard match={match} big />
    </div>
  );
}

/** Next to the logo: the match you are in, in red. Opens the way back or out. */
export function CurrentMatchBadge() {
  const t = useTranslations("common.currentMatch");
  const { match } = useCurrentMatch();
  const [open, setOpen] = useState(false);
  return (
    <AnimatePresence>
      {match ? (
        <motion.div
          key="badge"
          initial={{ opacity: 0, scale: 0.85, x: -6 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.3, ease: ease.soft }}
          className="shrink-0"
        >
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger
              aria-label={`${t("badge")} · ${match.code}`}
              className="inline-flex h-10 items-center gap-2 rounded-pill bg-no px-3.5 font-semibold text-on-no text-sm shadow-card transition-[transform,filter] duration-150 ease-soft hover:brightness-110 active:scale-[0.97] max-sm:size-9 max-sm:justify-center max-sm:px-0"
            >
              <LiveDot />
              <span className="max-sm:sr-only">{t("badge")}</span>
              <span className="font-mono text-[13px] tracking-[0.12em] opacity-80 max-md:hidden">
                {match.code}
              </span>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner sideOffset={8} align="start" className="z-50">
                <Popover.Popup className="flex w-[min(320px,calc(100vw-2rem))] origin-[var(--transform-origin)] flex-col gap-3 rounded-xl bg-surface p-4 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
                  <Popover.Title className="font-semibold">
                    {t("badge")}
                  </Popover.Title>
                  <MatchChip match={match} />
                  <MatchActions match={match} onLeft={() => setOpen(false)} />
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
