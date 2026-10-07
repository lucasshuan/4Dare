"use client";

import { HelpCircle } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { useStepStarted } from "@/features/room/match-frame";
import { MAX_SWAPS } from "@/game/impostor/engine";
import type { ImpAnswer } from "@/game/impostor/types";
import type { ImpAskedView } from "@/game/types";
import { cn } from "@/lib/cn";
import { dontKnowCard, replyCard } from "@/server/actions";
import { AnswerPad } from "./answer-pad";
import { useQuestion, useWords } from "./use-questions";

/** "Round 2", or "Round 1 · question 1 of 2" before the first vote. */
export function useAskedLabel() {
  const t = useTranslations("impostor.reply");
  const { view } = useRoomContext();
  return (a: ImpAskedView) => {
    const all = view.imp?.asked ?? [];
    const ofRound = all.filter((x) => x.round === a.round);
    const index = ofRound.indexOf(a) + 1;
    return ofRound.length > 1 || a.round === 1
      ? t("roundQuestion", {
          round: a.round,
          n: index,
          of: a.round === 1 ? 2 : 1,
        })
      : t("round", { round: a.round });
  };
}

/** The question, big, with its round above it. */
export function QuestionHeading({ asked }: { asked: ImpAskedView }) {
  const bank = useQuestion(asked.question.id);
  const w = useWords();
  const label = useAskedLabel();
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="font-semibold text-[13px] text-ink-muted uppercase tracking-[0.08em]">
        {label(asked)}
      </span>
      <h1
        className={cn(
          "max-w-[720px] text-balance font-bold font-display text-[clamp(28px,4.4vw,48px)] leading-[1.1] tracking-[-0.015em]",
          !bank && "h-[1.1em] w-72 animate-pulse rounded-md bg-sunken",
        )}
      >
        {bank ? w.text(bank) : null}
      </h1>
    </div>
  );
}

/** Who answered so far: everyone still in, the ones who did lit. */
function Answered({ asked }: { asked: ImpAskedView }) {
  const t = useTranslations("impostor.reply");
  const { view, playerById } = useRoomContext();
  const still = view.imp?.playingIds ?? [];
  const done = still.filter((id) => asked.answeredIds.includes(id));
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-medium text-ink-muted text-sm">
        {t("answered", { n: done.length, total: still.length })}
      </span>
      <div className="flex flex-wrap justify-center gap-1.5">
        {still.map((id) => {
          const p = playerById(id);
          if (!p) return null;
          const on = done.includes(id);
          return (
            <m.span
              key={id}
              animate={{ opacity: on ? 1 : 0.35, scale: on ? 1 : 0.9 }}
              className="flex"
            >
              <Avatar avatar={p.avatar} seat={p.colorSlot} size={28} />
            </m.span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * "I don't know this one": swaps everyone's cards, nobody is told who asked.
 * Only before the first answers show, a couple of times a match; a second
 * tap confirms it.
 */
function DontKnow() {
  const t = useTranslations("impostor.reply");
  const { view, code } = useRoomContext();
  const { act, pending } = useRoomAction();
  const [sure, setSure] = useState(false);
  const imp = view.imp;
  const open =
    !!imp &&
    imp.swaps < MAX_SWAPS &&
    imp.asked.every((a) => a.answers === null);
  if (!open) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      {sure ? (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-md bg-surface px-3 py-2 shadow-card">
          <span className="font-medium text-sm">{t("dontKnowSure")}</span>
          <Button
            size="sm"
            variant="primary"
            disabled={pending}
            onClick={async () => {
              await act(() => dontKnowCard(code));
              setSure(false);
            }}
          >
            {t("dontKnowYes")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSure(false)}>
            {t("cancel")}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSure(true)}
          className="inline-flex items-center gap-1.5 font-semibold text-ink-muted text-sm underline-offset-2 hover:text-ink hover:underline"
        >
          <HelpCircle className="size-4" strokeWidth={2} />
          {t("dontKnow")}
        </button>
      )}
    </div>
  );
}

/** Everyone answers the open question for their own card; who is out watches. */
export function ReplyStep({ asked }: { asked: ImpAskedView }) {
  const t = useTranslations("impostor.reply");
  const { view, code, me } = useRoomContext();
  const { act, pending } = useRoomAction();
  const started = useStepStarted();
  const bank = useQuestion(asked.question.id);
  // the answer as just given (null: taken back), until the server's view has it
  const [guess, setGuess] = useState<{ a: ImpAnswer | null } | null>(null);
  const mine = guess ? guess.a : asked.yours;
  const playing = view.imp?.playingIds.includes(me.id) ?? false;
  const answer = async (a: ImpAnswer | null) => {
    setGuess({ a });
    await act(() => replyCard(code, a));
    setGuess(null);
  };
  return (
    <div className="flex flex-col items-center gap-8 py-6 short:gap-5">
      <QuestionHeading asked={asked} />
      <AnimatePresence mode="wait" initial={false}>
        {playing ? (
          <m.div
            key="pad"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col items-center gap-3"
          >
            <span className="font-medium text-ink-muted text-sm">
              {t("forYourCard")}
            </span>
            <AnswerPad
              question={asked.question}
              bank={bank}
              mine={mine}
              disabled={!started || pending}
              onAnswer={answer}
              onChange={() => answer(null)}
            />
          </m.div>
        ) : (
          <m.p
            key="out"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-md bg-surface px-4 py-3 font-medium text-ink-muted shadow-card"
          >
            {t("watching")}
          </m.p>
        )}
      </AnimatePresence>
      <Answered asked={asked} />
      {playing && started ? <DontKnow /> : null}
    </div>
  );
}
