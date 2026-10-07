"use client";

import { AnimatePresence, m } from "motion/react";
import { useRoomContext } from "@/features/data/room-context";
import { useReached, useSceneShow } from "@/features/room/match-frame";
import { useStage } from "@/features/stage/stage-context";
import { AnswersView } from "./answers-view";
import { DealCard } from "./deal-card";
import { LastChance } from "./last-chance";
import { QuestionHeading, ReplyStep } from "./reply-step";
import { TalkStep } from "./talk-step";
import { useQuestion } from "./use-questions";

const DEAL_BEATS = ["card", "entrance"] as const;

/** The answers to question `n` landing together, under the question. */
function RepliesReveal({ n }: { n: number }) {
  const { view } = useRoomContext();
  const asked = view.imp?.asked[n];
  const bank = useQuestion(asked?.question.id);
  if (!asked?.answers) return null;
  return (
    <div className="flex flex-col items-center gap-8 py-6">
      <QuestionHeading asked={asked} />
      <AnswersView
        question={asked.question}
        bank={bank}
        answers={asked.answers}
      />
    </div>
  );
}

/**
 * The Impostor's match screen: your card dealt, then each question (or the
 * answers landing), the talk and the vote, and a caught impostor's last
 * chance. The vote's result plays over it (ImpostorScenes).
 */
export function ImpostorScreen() {
  const { view } = useRoomContext();
  const { beat } = useStage();
  const deal = useSceneShow("deal", DEAL_BEATS);
  const r = view.reveal;
  const repliesOver = useReached(r?.kind === "replies" ? r.until : null);
  const imp = view.imp;
  if (!imp) return null;
  const key =
    deal && beat?.kind === "card"
      ? "deal"
      : r?.kind === "replies" && !repliesOver
        ? `replies-${r.n}`
        : `${view.phase}-${imp.asked.length}-${imp.round}`;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={key}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.35 } }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
      >
        {deal && beat?.kind === "card" ? (
          <DealCard show={deal} />
        ) : r?.kind === "replies" && !repliesOver ? (
          <RepliesReveal n={r.n} />
        ) : view.phase === "replying" && imp.asked.at(-1) ? (
          <ReplyStep asked={imp.asked.at(-1) ?? imp.asked[0]} />
        ) : view.phase === "talking" ? (
          <TalkStep />
        ) : view.phase === "last_chance" ? (
          <LastChance />
        ) : null}
      </m.div>
    </AnimatePresence>
  );
}
