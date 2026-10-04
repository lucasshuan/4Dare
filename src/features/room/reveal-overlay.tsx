"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AnswerChip } from "@/components/ui/answer-chip";
import { Avatar } from "@/components/ui/avatar";
import { fireConfetti } from "@/components/ui/confetti";
import { useWithNames } from "@/components/ui/player-name";
import { Portrait } from "@/components/ui/portrait";
import { useRoomContext } from "@/features/data/room-context";
import type { AnswerValue, CardView, RevealView } from "@/game/types";
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
 * What just happened, shown to everyone while the next step already runs.
 * It closes by itself, or earlier with its button, a click outside it, or any
 * key (except in the chat); a typed letter goes on into the step's text field.
 */
export function RevealOverlay() {
  const t = useTranslations("common");
  const { view, offset } = useRoomContext();
  const now = useServerClock(offset, 100);
  // Answers and guesses only: the shows play on their own screens.
  const shown = view.reveal;
  const r = shown?.kind === "answers" || shown?.kind === "guess" ? shown : null;
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
        <motion.div
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
          className="fixed inset-0 z-30 flex items-center justify-center bg-scrim p-4"
        >
          <motion.div
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
            {r.kind === "answers" ? (
              <AnswersReveal reveal={r} />
            ) : (
              <GuessReveal reveal={r} />
            )}
            <p className="mt-4 text-center font-medium text-[13px] text-ink-muted max-sm:hidden">
              {t("revealHint")}
            </p>
            <Progress startsAt={r.startsAt} until={r.until} now={now} />
          </motion.div>
        </motion.div>
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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { delay: 0.15, duration: dur.slow, ease: ease.soft },
        }}
        className="flex items-center gap-2 font-medium text-[13px] text-ink-muted"
      >
        {asker ? (
          <Avatar
            avatar={asker.avatar}
            isGuest={asker.isGuest}
            name={asker.name}
            size={28}
          />
        ) : null}
        <span>
          {t("asked", {
            n: reveal.n,
            name: asker ? name(asker, asker.isYou) : "",
          })}
        </span>
      </motion.div>
      <motion.p
        initial="hidden"
        animate="shown"
        variants={{
          shown: { transition: { staggerChildren: 0.03, delayChildren: 0.25 } },
        }}
        className="text-balance font-bold font-display text-[clamp(24px,3.2vw,32px)] leading-tight"
      >
        {words.map((w, i) => (
          <motion.span
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
            className="inline-block whitespace-pre"
          >
            {w}
          </motion.span>
        ))}
      </motion.p>
      <motion.ul
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
            <motion.li
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
                {p ? (
                  <Avatar
                    avatar={p.avatar}
                    isGuest={p.isGuest}
                    name={p.name}
                    size={32}
                  />
                ) : null}
                <span className="min-w-24 flex-1 truncate font-semibold">
                  {p ? name(p, p.isYou) : ""}
                </span>
                <motion.span
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
                </motion.span>
              </div>
              {a.note ? <p className="pl-11 text-ink">“{a.note}”</p> : null}
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}

/** Suspense, then the result: on a hit the card flips over and confetti falls. */
function GuessReveal({
  reveal,
}: {
  reveal: Extract<RevealView, { kind: "guess" }>;
}) {
  const t = useTranslations("turn.reveal");
  const withNames = useWithNames();
  const { playerById } = useRoomContext();
  const guesser = playerById(reveal.byId);
  const hit = reveal.result === "hit";
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setShown(true);
      if (hit) fireConfetti("big");
    }, 800);
    return () => window.clearTimeout(id);
  }, [hit]);

  return (
    <div className="flex flex-col items-center gap-5 pb-2 text-center">
      <span className="font-medium text-[13px] text-ink-muted">
        {withNames((n) =>
          t("guessed", {
            n: reveal.n,
            name: guesser ? n(guesser, guesser.isYou) : "",
          }),
        )}
      </span>
      <motion.p
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: { delay: 0.1, duration: 0.5, ease: ease.soft },
        }}
        className="font-display font-extrabold text-[clamp(32px,5vw,52px)] leading-none"
      >
        “{reveal.guess}”
      </motion.p>

      <FlipCard
        flipped={shown && reveal.card !== null}
        card={reveal.card}
        hit={hit}
      />

      <div className="flex h-12 items-center">
        <AnimatePresence mode="wait">
          {shown ? (
            <motion.span
              key="result"
              initial={{ opacity: 0, scale: hit ? 1.4 : 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { duration: 0.5, ease: ease.soft },
              }}
              className={cn(
                "rounded-pill px-6 py-2 font-bold font-display text-2xl",
                hit ? "bg-yes text-on-yes shadow-card" : "bg-sunken text-ink",
              )}
            >
              {hit
                ? reveal.place
                  ? t(reveal.tied ? "hitTie" : "hitPlace", {
                      place: reveal.place,
                    })
                  : t("hit")
                : t("miss")}
            </motion.span>
          ) : (
            <motion.span
              key="dots"
              exit={{ opacity: 0 }}
              aria-hidden="true"
              className="flex gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="size-3 rounded-pill bg-line-strong"
                  animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1, 0.8] }}
                  transition={{
                    duration: 0.8,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** The guesser's card: "?" on the front, the character on the back. */
function FlipCard({
  flipped,
  card,
  hit,
}: {
  flipped: boolean;
  card: CardView | null;
  hit: boolean;
}) {
  return (
    <div className="w-44 perspective-[1000px] sm:w-52">
      <motion.div
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: dur.reveal, ease: ease.swap }}
        className="relative transform-3d"
      >
        <div className="flex aspect-4/5 items-center justify-center rounded-xl bg-sky-soft font-display font-extrabold text-[96px] text-sky shadow-card backface-hidden">
          ?
        </div>
        <div
          className={cn(
            "absolute inset-0 flex flex-col gap-2 rounded-xl bg-surface p-2 shadow-card backface-hidden rotate-y-180",
            hit && "outline-[3px] outline-yes outline-solid",
          )}
        >
          <Portrait
            src={card?.imageUrl ?? null}
            tone="other"
            className="flex-1"
          />
          <span className="truncate px-1 font-bold font-display text-lg">
            {card?.name}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
