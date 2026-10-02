"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { AnswerChip } from "@/components/ui/answer-chip";
import { Avatar } from "@/components/ui/avatar";
import { CharacterCard } from "@/components/ui/character-card";
import { useRoomContext } from "@/features/data/room-context";
import type { RevealView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useServerClock } from "@/lib/hooks/use-server-clock";
import { dur, ease } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";

/** What just happened, shown to everyone between two steps. */
export function RevealOverlay() {
  const { view, offset } = useRoomContext();
  const now = useServerClock(offset, 100);
  const r = view.reveal;
  const active = r !== null && now < r.until;
  return (
    <AnimatePresence>
      {active && r ? (
        <motion.div
          key={`${r.kind}-${r.n}`}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: dur.base } }}
          exit={{ opacity: 0, transition: { duration: dur.slow } }}
          className="fixed inset-0 z-30 flex items-center justify-center bg-scrim p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { duration: dur.slow, ease: ease.soft },
            }}
            exit={{ opacity: 0, y: -12, transition: { duration: dur.base } }}
            className="relative w-full max-w-[640px] overflow-hidden rounded-xl bg-surface p-6 shadow-pop sm:p-8"
          >
            {r.kind === "answers" ? (
              <AnswersReveal reveal={r} />
            ) : (
              <GuessReveal reveal={r} />
            )}
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

function AnswersReveal({
  reveal,
}: {
  reveal: Extract<RevealView, { kind: "answers" }>;
}) {
  const t = useTranslations("turn.reveal");
  const name = useDisplayName();
  const { playerById } = useRoomContext();
  const asker = playerById(reveal.byId);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 font-medium text-[13px] text-ink-muted">
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
      </div>
      <p className="font-bold font-display text-[clamp(22px,3vw,30px)] leading-tight [text-wrap:balance]">
        {reveal.question}
      </p>
      <motion.ul
        initial="hidden"
        animate="shown"
        variants={{
          shown: { transition: { staggerChildren: 0.45, delayChildren: 0.35 } },
        }}
        className="flex flex-col gap-3"
      >
        {reveal.answers.map((a) => {
          const p = playerById(a.byId);
          return (
            <motion.li
              key={a.byId}
              variants={{
                hidden: { opacity: 0, y: 14, scale: 0.98 },
                shown: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: dur.slow, ease: ease.soft },
                },
              }}
              className="flex flex-col gap-1 rounded-lg bg-canvas p-3"
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
                <span className="min-w-24 font-semibold">
                  {p ? name(p, p.isYou) : ""}
                </span>
                <AnswerChip value={a.value} />
              </div>
              {a.note ? (
                <p className="pl-11 text-ink-muted">“{a.note}”</p>
              ) : null}
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}

function GuessReveal({
  reveal,
}: {
  reveal: Extract<RevealView, { kind: "guess" }>;
}) {
  const t = useTranslations("turn.reveal");
  const name = useDisplayName();
  const { playerById } = useRoomContext();
  const guesser = playerById(reveal.byId);
  const hit = reveal.result === "hit";
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span className="font-medium text-[13px] text-ink-muted">
        {t("guessed", {
          n: reveal.n,
          name: guesser ? name(guesser, guesser.isYou) : "",
        })}
      </span>
      <p className="font-display font-extrabold text-[clamp(32px,5vw,52px)] leading-none">
        “{reveal.guess}”
      </p>
      <motion.span
        initial={{ opacity: 0, scale: 1.3 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: { delay: 0.6, duration: dur.slow, ease: ease.soft },
        }}
        className={cn(
          "rounded-pill px-6 py-2 font-bold font-display text-2xl",
          hit ? "bg-yes text-on-yes" : "bg-sunken text-ink",
        )}
      >
        {hit
          ? reveal.place
            ? t("hitPlace", { place: reveal.place })
            : t("hit")
          : t("miss")}
      </motion.span>
      {reveal.card ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { delay: 0.9, duration: dur.slow, ease: ease.soft },
          }}
          className="w-48"
        >
          <CharacterCard
            card={reveal.card}
            label={guesser ? t("cardOf", { name: name(guesser) }) : ""}
            found={hit}
          />
        </motion.div>
      ) : null}
    </div>
  );
}
