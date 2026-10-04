"use client";

import { ArrowRight, Shuffle } from "lucide-react";
import { AnimatePresence, m, useAnimate, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useWithNames } from "@/components/ui/player-name";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { useSceneShow, useStepStarted } from "@/features/room/match-frame";
import { ColdOpen } from "@/features/stage/cold-open";
import { SCENE_MIN_H } from "@/features/stage/scene-kit";
import { ThemeStage } from "@/features/stage/theme-stage";
import { themeSetEmoji } from "@/game/theme-sets";
import {
  type Lang,
  MAX_THEME,
  type PlayerView,
  type Theme,
} from "@/game/types";
import { cn } from "@/lib/cn";
import { focusIsFree } from "@/lib/focus";
import { dur, ease } from "@/lib/motion";
import { chooseTheme } from "@/server/actions";

/** Ideas on screen at once; "Other ideas" shows the next ones. */
const IDEAS_SHOWN = 4;
const spring = { type: "spring", stiffness: 320, damping: 30 } as const;

type Stage = "typing" | "waiting";
const OPENING_BEATS = ["curtain", "intro", "round"] as const;
const THEME_BEATS = ["theme", "rule"] as const;

/**
 * The host types the theme while the others wait, inside the opening and
 * theme shows: the cold open (or "Round N") first, then the form lands; once
 * the theme is typed, the theme hero ("Chosen by {host}") and, on the room's
 * first match, the rule as a sentence.
 */
export function ThemeScreen() {
  const opening = useSceneShow("opening", OPENING_BEATS);
  const theme = useSceneShow("theme", THEME_BEATS);
  const { view } = useRoomContext();
  if (opening) return <ColdOpen show={opening} />;
  if (theme) return <ThemeStage show={theme} from="typed" />;
  // the theme is in: nothing left to type while the show moves on
  if (view.theme) return null;
  return <Theming />;
}

function Theming() {
  const t = useTranslations("room.theming");
  const lang = useLocale() as Lang;
  const withNames = useWithNames();
  const { view, me, code } = useRoomContext();
  const { act, pending } = useRoomAction();
  const started = useStepStarted();
  const [text, setText] = useState("");
  const [page, setPage] = useState(0);
  const [card, animateCard] = useAnimate();
  const input = useRef<HTMLInputElement>(null);
  const host = view.players.find((p) => p.isHost) ?? me;
  const stage: Stage = me.isHost ? "typing" : "waiting";

  useEffect(() => {
    // never pull the focus out of the chat
    if (stage === "typing" && focusIsFree()) input.current?.focus();
  }, [stage]);

  const ideas = view.ideas ?? [];
  const pages = Math.max(1, Math.ceil(ideas.length / IDEAS_SHOWN));
  const shown = ideas.slice(
    (page % pages) * IDEAS_SHOWN,
    (page % pages) * IDEAS_SHOWN + IDEAS_SHOWN,
  );
  const takeIdea = (idea: Theme) => {
    setText(idea[lang].slice(0, MAX_THEME));
    input.current?.focus();
    if (card.current)
      void animateCard(
        card.current,
        { scale: [1, 1.025, 1] },
        { duration: 0.35, ease: ease.soft },
      );
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const theme = text.trim();
    if (theme && !pending && started) await act(() => chooseTheme(code, theme));
  };

  const heading =
    stage === "typing"
      ? { kicker: t("hostKicker"), title: t("title"), sub: t("subtitle") }
      : {
          kicker: t("kicker"),
          title: withNames((n) =>
            t("waitingTitle", { name: n(host, host.isYou) }),
          ),
          sub: t("waitingSubtitle"),
        };

  return (
    <div
      className={cn(
        SCENE_MIN_H,
        "mx-auto flex w-full max-w-[880px] flex-col justify-center gap-6 pb-4 sm:gap-8 sm:pb-10 sm:short:gap-6 sm:short:pb-4",
      )}
    >
      <Heading stage={stage} {...heading} />

      <m.form
        ref={card}
        layout
        onSubmit={submit}
        initial={{ opacity: 0, y: 48, rotate: -2, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        transition={{
          ...spring,
          layout: { duration: dur.slow, ease: ease.soft },
        }}
        className={cn(
          "relative flex flex-col rounded-xl bg-butter text-on-butter",
          stage === "typing" &&
            "p-5 focus-within:shadow-[0_0_0_3px_var(--canvas),0_0_0_6px_var(--ink)] sm:p-7",
          stage === "waiting" && "items-center p-8",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {stage === "typing" ? (
            <m.div
              key="typing"
              exit={{ opacity: 0, transition: { duration: dur.fast } }}
              className="flex flex-col gap-3"
            >
              <label
                htmlFor="theme-input"
                className="font-semibold text-xs uppercase tracking-[0.08em] opacity-70"
              >
                {t("label")}
              </label>
              <input
                id="theme-input"
                ref={input}
                value={text}
                maxLength={MAX_THEME}
                autoComplete="off"
                placeholder={t("placeholder")}
                onChange={(e) => setText(e.target.value)}
                className="w-full min-w-0 bg-transparent font-display font-extrabold text-[clamp(30px,4.2vw,52px)] leading-[1.1] tracking-[-0.02em] outline-none placeholder:text-on-butter/30"
                // the card shows the focus ring instead
                style={{ outline: "none" }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={cn(
                    "font-medium font-mono text-sm tabular-nums transition-opacity",
                    text.length >= MAX_THEME - 5 ? "opacity-100" : "opacity-50",
                  )}
                >
                  {text.length}/{MAX_THEME}
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={pending || !started || !text.trim()}
                >
                  {t("submit")}
                  <ArrowRight strokeWidth={2} />
                </Button>
              </div>
            </m.div>
          ) : (
            <m.div
              key="waiting"
              exit={{ opacity: 0, transition: { duration: dur.fast } }}
            >
              <HostAtWork host={host} />
            </m.div>
          )}
        </AnimatePresence>
      </m.form>

      <div className="flex min-h-24 flex-col items-center gap-3">
        <AnimatePresence mode="wait" initial={false}>
          {stage === "typing" && ideas.length ? (
            <m.div
              key="ideas"
              exit={{ opacity: 0, transition: { duration: dur.fast } }}
              className="flex w-full flex-col items-center gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">{t("ideas")}</span>
                {pages > 1 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <m.span
                      aria-hidden
                      className="inline-flex"
                      animate={{ rotate: page * 180 }}
                      transition={{ duration: dur.slow, ease: ease.soft }}
                    >
                      <Shuffle strokeWidth={1.75} />
                    </m.span>
                    {t("moreIdeas")}
                  </Button>
                ) : null}
              </div>
              <ul className="flex flex-wrap justify-center gap-2">
                <AnimatePresence mode="popLayout" initial={false}>
                  {shown.map((idea, i) => (
                    <m.li
                      key={`${page}-${idea.en}`}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { ...spring, delay: i * 0.05 },
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <m.button
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => takeIdea(idea)}
                        className="inline-flex h-9 items-center gap-2 rounded-pill bg-surface px-3.5 font-semibold text-sm shadow-card"
                      >
                        <span aria-hidden>{themeSetEmoji(idea.set)}</span>
                        {idea[lang]}
                      </m.button>
                    </m.li>
                  ))}
                </AnimatePresence>
              </ul>
            </m.div>
          ) : null}
        </AnimatePresence>
        <p className="font-medium text-[13px] text-ink-muted">
          {t("fallback")}
        </p>
      </div>
    </div>
  );
}

function Heading({
  stage,
  kicker,
  title,
  sub,
}: {
  stage: Stage;
  kicker: string;
  title: ReactNode;
  sub: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <m.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: dur.base } }}
        className="inline-flex items-center gap-1.5 rounded-pill bg-sunken px-3 py-1 font-semibold text-ink-muted text-xs uppercase tracking-[0.08em]"
      >
        {kicker}
      </m.span>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={stage}
          initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
          animate={{
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: { duration: dur.slow, ease: ease.soft },
          }}
          exit={{ opacity: 0, transition: { duration: dur.fast } }}
          className="flex flex-col items-center gap-2"
        >
          <h1 className="text-balance font-bold font-display text-[clamp(32px,4.2vw,48px)] leading-[1.05] tracking-[-0.02em]">
            {title}
          </h1>
          {sub ? (
            <p className="max-w-120 text-balance text-ink-muted">{sub}</p>
          ) : null}
        </m.div>
      </AnimatePresence>
    </div>
  );
}

/** The host's avatar, a ring that keeps rippling out and a "typing…" bubble. */
function HostAtWork({ host }: { host: PlayerView }) {
  const still = useReducedMotion() ?? false;
  return (
    <div className="relative my-2">
      {still
        ? null
        : [0, 0.8].map((delay) => (
            <m.span
              key={delay}
              aria-hidden
              className="-inset-1 absolute rounded-full border-2 border-on-butter/40"
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
              transition={{
                duration: 1.6,
                delay,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeOut",
              }}
            />
          ))}
      <Avatar
        avatar={host.avatar}
        isGuest={host.isGuest}
        name={host.name}
        size={64}
        className="relative ring-4 ring-surface/70"
      />
      <m.span
        aria-hidden
        initial={{ opacity: 0, scale: 0.6, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...spring, delay: 0.25 }}
        className="-top-3 -right-10 absolute flex items-center gap-1 rounded-pill rounded-bl-sm bg-surface px-3 py-2.5 shadow-card"
      >
        {[0, 1, 2].map((i) => (
          <m.span
            key={i}
            className="size-1.5 rounded-full bg-ink"
            animate={
              still ? undefined : { y: [0, -4, 0], opacity: [0.35, 1, 0.35] }
            }
            transition={{
              duration: 0.9,
              delay: i * 0.15,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        ))}
      </m.span>
    </div>
  );
}
