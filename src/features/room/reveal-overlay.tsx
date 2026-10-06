"use client";

import { X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AnswerChip } from "@/components/ui/answer-chip";
import { Avatar } from "@/components/ui/avatar";
import { useRoomContext } from "@/features/data/room-context";
import { GAME_AREA } from "@/features/stage/scene-kit";
import type { AnswerValue, RevealView } from "@/game/types";
import { cn } from "@/lib/cn";
import { insideChat } from "@/lib/focus";
import { useServerClock } from "@/lib/hooks/use-server-clock";
import { dur, ease } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";

/** Keys that never close the reveal on their own. */
const MODIFIERS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock"]);
/** Where a typed key lands once the reveal is gone: the step's text field. */
const FIELD =
  "main textarea:not([disabled]), main input:not([type]):not([disabled]), main input[type=text]:not([disabled])";

/**
 * A question's answers, shown to everyone while the guessing step already
 * runs. It closes by itself, or earlier with its button, a click outside it,
 * or any key (except in the chat); a typed letter goes on into the step's
 * text field. A guess's result has its own scene (GuessScene).
 */
export function RevealOverlay() {
  const t = useTranslations("common");
  const { view, offset } = useRoomContext();
  const now = useServerClock(offset, 100);
  // Answers only: the shows and a guess's scene play on their own.
  const r = view.reveal?.kind === "answers" ? view.reveal : null;
  const id = r ? `${r.kind}-${r.n}` : null;
  const [closed, setClosed] = useState<string | null>(null);
  const active = r !== null && now < r.until && closed !== id;
  useEffect(() => {
    if (!active || !id) return;
    const onKey = (e: KeyboardEvent) => {
      // typing in the chat leaves the reveal up
      if (MODIFIERS.has(e.key) || insideChat(e.target)) return;
      setClosed(id);
      // Nothing focused: the letter goes to the step's field, as if the reveal were never there.
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const focused = document.activeElement;
        if (!focused || focused === document.body)
          document.querySelector<HTMLElement>(FIELD)?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, id]);
  return (
    <AnimatePresence>
      {active && r ? (
        <m.div
          key={id}
          role="status"
          aria-live="polite"
          onClick={(e) => {
            if (e.target === e.currentTarget) setClosed(id);
          }}
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{
            opacity: 1,
            backdropFilter: "blur(6px)",
            transition: { duration: dur.slow },
          }}
          exit={{
            opacity: 0,
            backdropFilter: "blur(0px)",
            transition: { duration: dur.slow, ease: ease.soft },
          }}
          className={cn(
            GAME_AREA,
            "z-30 flex items-center justify-center bg-scrim p-4",
          )}
        >
          <m.div
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { duration: 0.6, ease: ease.soft },
            }}
            exit={{
              opacity: 0,
              y: -24,
              scale: 0.98,
              transition: { duration: dur.base, ease: ease.soft },
            }}
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-160 overflow-y-auto rounded-xl bg-surface p-6 shadow-pop sm:p-8"
          >
            <button
              type="button"
              aria-label={t("close")}
              onClick={() => setClosed(id)}
              className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-pill text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
            >
              <X className="size-5" strokeWidth={2} />
            </button>
            <AnswersReveal reveal={r} />
            <p className="mt-4 text-center font-medium text-[13px] text-ink-muted max-sm:hidden">
              {t("revealHint")}
            </p>
            <Progress startsAt={r.startsAt} until={r.until} now={now} />
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function Progress({
  startsAt,
  until,
  now,
}: {
  startsAt: number;
  until: number;
  now: number;
}) {
  const left = Math.max(0, Math.min(1, (until - now) / (until - startsAt)));
  return (
    <span className="absolute inset-x-0 bottom-0 h-1 bg-sunken">
      <span
        className="block h-full origin-left bg-sky transition-transform duration-100 ease-linear"
        style={{ transform: `scaleX(${left})` }}
      />
    </span>
  );
}

const ROW_TINT: Record<AnswerValue, string> = {
  yes: "bg-yes-soft",
  probably_yes: "bg-yes-soft",
  unknown: "bg-sunken",
  probably_no: "bg-no-soft",
  no: "bg-no-soft",
  irrelevant: "bg-sunken",
};

/** The question, then each player's answer arriving one by one, slow enough to read. */
function AnswersReveal({
  reveal,
}: {
  reveal: Extract<RevealView, { kind: "answers" }>;
}) {
  const t = useTranslations("turn.reveal");
  const name = useDisplayName();
  const { playerById } = useRoomContext();
  const asker = playerById(reveal.byId);
  const words = reveal.question.split(/(\s+)/);
  return (
    <div className="flex flex-col gap-5 pb-2">
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { delay: 0.15, duration: dur.slow, ease: ease.soft },
        }}
        className="flex items-center gap-2 font-medium text-[13px] text-ink-muted"
      >
        {asker ? <Avatar avatar={asker.avatar} size={28} /> : null}
        <span>
          {t("asked", {
            n: reveal.n,
            name: asker ? name(asker, asker.isYou) : "",
          })}
        </span>
      </m.div>
      <m.p
        initial="hidden"
        animate="shown"
        variants={{
          shown: { transition: { staggerChildren: 0.03, delayChildren: 0.25 } },
        }}
        className="text-balance font-bold font-display text-[clamp(24px,3.2vw,32px)] leading-tight"
      >
        {words.map((w, i) =>
          // spaces stay plain text, so a line never starts with one
          /^\s+$/.test(w) ? (
            " "
          ) : (
            <m.span
              // biome-ignore lint/suspicious/noArrayIndexKey: words of a fixed sentence
              key={i}
              variants={{
                hidden: { opacity: 0, y: 10 },
                shown: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, ease: ease.soft },
                },
              }}
              className="inline-block max-w-full wrap-anywhere"
            >
              {w}
            </m.span>
          ),
        )}
      </m.p>
      <m.ul
        initial="hidden"
        animate="shown"
        variants={{
          shown: { transition: { staggerChildren: 0.5, delayChildren: 0.75 } },
        }}
        className="flex flex-col gap-3"
      >
        {reveal.answers.map((a) => {
          const p = playerById(a.byId);
          return (
            <m.li
              key={a.byId}
              variants={{
                hidden: { opacity: 0, y: 22, scale: 0.96 },
                shown: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.55, ease: ease.soft },
                },
              }}
              className={cn(
                "flex flex-col gap-1.5 rounded-lg p-3 sm:p-4",
                ROW_TINT[a.value],
              )}
            >
              <div className="flex flex-wrap items-center gap-3">
                {p ? <Avatar avatar={p.avatar} size={32} /> : null}
                <span className="min-w-24 flex-1 truncate font-semibold">
                  {p ? name(p, p.isYou) : ""}
                </span>
                <m.span
                  variants={{
                    hidden: { opacity: 0, x: 16, scale: 0.9 },
                    shown: {
                      opacity: 1,
                      x: 0,
                      scale: 1,
                      transition: {
                        delay: 0.18,
                        duration: 0.45,
                        ease: ease.soft,
                      },
                    },
                  }}
                >
                  <AnswerChip
                    value={a.value}
                    pressed={a.value === "yes" || a.value === "no"}
                  />
                </m.span>
              </div>
              {a.note ? (
                <p className="whitespace-pre-line pl-11 text-ink wrap-anywhere">
                  “{a.note}”
                </p>
              ) : null}
            </m.li>
          );
        })}
      </m.ul>
    </div>
  );
}

/** Suspense, then the result: on a hit the card flips over and confetti falls. */
