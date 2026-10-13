"use client";

import { Check, EyeOff, LoaderCircle } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Loader } from "@/components/ui/loader";
import { useRoomContext } from "@/features/data/room-context";
import { useStage } from "@/features/stage/stage-context";
import { cn } from "@/lib/cn";
import { useClock } from "@/lib/hooks/use-server-clock";
import { ease } from "@/lib/motion";

// The loading screen of a match's start: from the host's press (on their page
// at once, on the others' as the start reaches them) until the title scene
// plays. Behind it the ready check runs: every page loads and rehearses the
// scene, and the match begins for all of them together.

let asked = false;
const listeners = new Set<() => void>();

/** The host pressed start and the server has not answered yet: their page covers at once. */
export function setStartAsked(on: boolean) {
  if (asked === on) return;
  asked = on;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Whether the start's loading screen is up: the press, the ready check, then the curtain before the title scene. */
export function useStartCovered(): boolean {
  const pressed = useSyncExternalStore(
    subscribe,
    () => asked,
    () => false,
  );
  const { view } = useRoomContext();
  const { show, beat } = useStage();
  const checking = view.phase === "lobby" && !!view.starting;
  // the press holds until the room shows the start waiting (or under way):
  // let go sooner, the lobby would come back for a moment in between
  const reached = checking || view.phase !== "lobby";
  useEffect(() => {
    if (reached) setStartAsked(false);
  }, [reached]);
  // the match is on, a moment ahead: the lobby leaves under it until the title plays
  const ahead =
    show?.kind === "opening" &&
    !!show.title &&
    (beat === null || beat.kind === "curtain");
  return pressed || checking || ahead;
}

/** How long Who am I?'s stage takes to open over the loading screen (its iris, with a margin; ms). */
const IRIS_MS = 650;

/**
 * Whether the lobby's backdrop stays behind the start: under the loading
 * screen, and under Who am I?'s title while its stage opens in a circle over it.
 */
export function useStartBackdrop(): boolean {
  const covered = useStartCovered();
  const { view } = useRoomContext();
  const { show, beat } = useStage();
  const clock = useClock();
  const iris =
    view.settings.game === "who-am-i" &&
    show?.kind === "opening" &&
    beat?.kind === "title"
      ? beat.startsAt + IRIS_MS
      : null;
  const [opened, setOpened] = useState<number | null>(null);
  useEffect(() => {
    if (iris === null) return;
    const id = window.setTimeout(
      () => setOpened(iris),
      Math.max(0, iris - clock.now()),
    );
    return () => window.clearTimeout(id);
  }, [iris, clock]);
  return covered || (iris !== null && opened !== iris);
}

/**
 * The start's loading screen: the room entrance's shuffling hand, over the
 * lobby's backdrop and under the title scene, which covers it as it comes in
 * (Who am I?'s stage opens over it in a circle).
 */
export function StartCover() {
  const covered = useStartBackdrop();
  const t = useTranslations("room");
  return (
    <AnimatePresence>
      {covered ? (
        <m.div
          key="start-cover"
          data-start-cover
          className="pointer-events-none fixed inset-0 z-25 flex items-center justify-center overflow-hidden pb-6"
          initial={{ opacity: 0 }}
          // as the lobby's last panel goes (three panels 70 ms apart, 0.3 s each: globals.css, .lobby-leave)
          animate={{ opacity: 1, transition: { duration: 0.25, delay: 0.42 } }}
          exit={{ opacity: 0, transition: { duration: 0.3, ease: ease.soft } }}
        >
          <div className="relative flex flex-col items-center gap-5">
            <Loader label={t("starting")} className="relative" pill />
            <StartPeople />
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * Under the loading screen's hand, while the ready check runs: every player's
 * face, ready, still loading, or in another tab. A page out of sight isn't
 * waited on (it lands where the match is once it shows again), and the line
 * under the faces says so. It comes in a moment late: a quick start never
 * shows it.
 */
function StartPeople() {
  const t = useTranslations("room");
  const { view } = useRoomContext();
  const w = view.phase === "lobby" ? view.starting : null;
  if (!w) return null;
  const people = view.players
    .filter((p) => !p.away)
    .map((p) => ({
      p,
      state: w.ready.includes(p.id)
        ? ("ready" as const)
        : p.hidden
          ? ("hidden" as const)
          : ("loading" as const),
    }));
  const away = people.filter((x) => x.state === "hidden").map((x) => x.p.name);
  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay: 0.9, duration: 0.35, ease: ease.soft },
      }}
      className="flex max-w-[min(560px,calc(100vw-2rem))] flex-col items-center gap-3"
    >
      <ul
        aria-label={t("startPeople.label")}
        className="flex flex-wrap justify-center gap-2.5"
      >
        {people.map(({ p, state }) => (
          <li
            key={p.id}
            aria-label={t(`startPeople.${state}`, { name: p.name })}
            className="relative"
          >
            <Avatar
              avatar={p.avatar}
              size={40}
              seat={p.colorSlot}
              className={cn(
                "transition-[opacity,filter] duration-300 ease-soft",
                state === "loading" && "opacity-60",
                state === "hidden" && "opacity-45 grayscale",
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                "absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-pill shadow-[0_0_0_2px_var(--color-surface)] transition-colors duration-300",
                state === "ready"
                  ? "bg-yes text-on-yes"
                  : state === "hidden"
                    ? "bg-sunken text-ink-muted"
                    : "bg-surface text-ink-muted",
              )}
            >
              {state === "ready" ? (
                <Check className="size-3" strokeWidth={3} />
              ) : state === "hidden" ? (
                <EyeOff className="size-3" strokeWidth={2.5} />
              ) : (
                <LoaderCircle
                  className="size-3 animate-spin motion-reduce:animate-none"
                  strokeWidth={2.5}
                />
              )}
            </span>
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {away.length ? (
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="m-0 rounded-pill bg-surface px-4 py-1.5 text-center font-medium text-[13px] text-ink-muted shadow-[0_6px_24px_#00000012]"
          >
            {t("startHidden", { names: away.join(", ") })}
          </m.p>
        ) : null}
      </AnimatePresence>
    </m.div>
  );
}
