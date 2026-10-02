"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { AnswerChip } from "@/components/ui/answer-chip";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CharacterCard } from "@/components/ui/character-card";
import { Portrait } from "@/components/ui/portrait";
import { TextArea, TextField } from "@/components/ui/text-field";
import { useRoomContext } from "@/features/data/room-context";
import { GameFrame } from "@/features/room/game-header";
import {
  ANSWERS,
  type AnswerValue,
  MAX_GUESS,
  MAX_NOTE,
  MAX_QUESTION,
  type PlayerView,
} from "@/game/types";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { dur, ease } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import {
  answerQuestion,
  askQuestion,
  giveUp,
  passTurn,
  submitGuess,
  validateGuess,
} from "@/server/actions";
import { HistoryPeek } from "./history-panel";
import { PlayerStrip } from "./player-strip";

type Mode =
  | "ask"
  | "waitAsk"
  | "answer"
  | "waitAnswers"
  | "guess"
  | "waitGuess"
  | "validate"
  | "waitValidate";

function useMode(): Mode {
  const { view, me } = useRoomContext();
  const turn = view.turn;
  const mine = turn?.playerId === me.id;
  switch (view.phase) {
    case "asking":
      return mine ? "ask" : "waitAsk";
    case "answering":
      return me.status === "answering" ? "answer" : "waitAnswers";
    case "guessing":
      return mine ? "guess" : "waitGuess";
    default:
      return turn?.validatorId === me.id ? "validate" : "waitValidate";
  }
}

/** Every step of a turn: asking, answering, guessing, validating, and waiting for others. */
export function TurnScreen() {
  const t = useTranslations("turn");
  const name = useDisplayName();
  const { view, me, playerById } = useRoomContext();
  const mode = useMode();
  const turnPlayer = playerById(view.turn?.playerId) as PlayerView;
  const focusMine =
    mode === "ask" ||
    mode === "guess" ||
    (mode === "waitValidate" && turnPlayer?.isYou);
  const focus = focusMine ? me : turnPlayer;
  if (!focus) return null;
  const picker = playerById(focus.pickedById);
  const meta = focus.isYou
    ? picker
      ? t("card.pickedBy", { name: name(picker) })
      : t("card.pickedSecretly")
    : [
        focus.card?.origin,
        picker
          ? picker.isYou
            ? t("card.youPicked")
            : t("card.pickedBy", { name: name(picker) })
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <GameFrame>
      <div className="flex flex-col gap-6">
        <PlayerStrip players={view.players} />
        <div className="flex flex-wrap items-stretch gap-5 lg:gap-12">
          <div className="w-full lg:w-[368px] lg:flex-none">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={focus.id}
                initial={{ opacity: 0, rotateY: -12, y: 10 }}
                animate={{
                  opacity: 1,
                  rotateY: 0,
                  y: 0,
                  transition: { duration: dur.slow, ease: ease.soft },
                }}
                exit={{
                  opacity: 0,
                  rotateY: 12,
                  transition: { duration: dur.base, ease: ease.soft },
                }}
                className="perspective-[1200px]"
              >
                <CharacterCard
                  className="max-lg:hidden"
                  card={focus.card}
                  hidden={focus.cardHidden}
                  tone={focus.isYou ? "you" : "other"}
                  label={
                    focus.isYou
                      ? t("card.yours")
                      : t("card.theirs", { name: name(focus) })
                  }
                  title={t("card.whoAreYou")}
                  meta={meta || null}
                  found={focus.discoveredAt !== null}
                />
                <FocusRow
                  focus={focus}
                  label={
                    focus.isYou
                      ? t("card.yours")
                      : t("card.theirs", { name: name(focus) })
                  }
                  title={t("card.whoAreYou")}
                  meta={meta || null}
                />
              </motion.div>
            </AnimatePresence>
          </div>
          <section className="flex min-w-0 flex-[1_1_360px] flex-col gap-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${view.phase}-${view.turn?.n}-${mode}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: dur.slow, ease: ease.soft },
                }}
                exit={{ opacity: 0, transition: { duration: dur.fast } }}
                className="flex flex-col gap-5"
              >
                <Step mode={mode} />
              </motion.div>
            </AnimatePresence>
            <HistoryPeek />
          </section>
        </div>
      </div>
    </GameFrame>
  );
}

/** Phones: the focus card as one compact row, so the action stays on screen. */
function FocusRow({
  focus,
  label,
  title,
  meta,
}: {
  focus: PlayerView;
  label: string;
  title: string;
  meta: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface p-2 shadow-card lg:hidden">
      <span className="w-20 shrink-0">
        {focus.cardHidden ? (
          <span className="flex aspect-4/5 items-center justify-center rounded-md bg-sky-soft font-display font-extrabold text-5xl text-sky">
            ?
          </span>
        ) : (
          <Portrait
            src={focus.card?.imageUrl ?? null}
            tone={focus.isYou ? "you" : "other"}
            className="rounded-md"
          />
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span
          className={cn(
            "self-start rounded-pill px-2.5 py-0.5 font-semibold text-xs",
            focus.isYou ? "bg-sky-soft" : "bg-apricot-soft",
          )}
        >
          {label}
        </span>
        <span className="truncate font-bold font-display text-xl">
          {focus.cardHidden ? title : focus.card?.name}
        </span>
        {meta ? (
          <span className="truncate font-medium text-[13px] text-ink-muted">
            {meta}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function Step({ mode }: { mode: Mode }) {
  switch (mode) {
    case "ask":
      return <Ask />;
    case "answer":
      return <Answer />;
    case "guess":
      return <Guess />;
    case "validate":
      return <Validate />;
    default:
      return <Waiting mode={mode} />;
  }
}

function Heading({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <div className="flex flex-col gap-1">
      {kicker ? (
        <span className="font-medium text-[13px] text-ink-muted">{kicker}</span>
      ) : null}
      <h1 className="font-bold font-display text-[30px] leading-9 tracking-[-0.01em] [text-wrap:balance]">
        {title}
      </h1>
    </div>
  );
}

function Bubble({
  who,
  kicker,
  children,
  you,
}: {
  who?: PlayerView;
  kicker: string;
  children: ReactNode;
  you?: boolean;
}) {
  return (
    <div
      className={
        you
          ? "flex flex-col gap-2 rounded-lg bg-sky-soft p-5"
          : "flex flex-col gap-2 rounded-lg bg-apricot-soft p-5"
      }
    >
      <div className="flex items-center gap-2 font-medium text-[13px]">
        {who ? (
          <Avatar
            avatar={who.avatar}
            isGuest={who.isGuest}
            name={who.name}
            size={28}
          />
        ) : null}
        <span>{kicker}</span>
      </div>
      {children}
    </div>
  );
}

function Ask() {
  const t = useTranslations("turn.ask");
  const { view, code, refresh } = useRoomContext();
  const { run, pending } = useAction();
  const [text, setText] = useState("");
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const others = view.players.filter((p) => !p.isYou && !p.away).length;
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if ((await run(() => askQuestion(code, text))).ok) await refresh();
      }}
    >
      <Heading
        kicker={t("kicker", { n: view.turn?.n ?? 1 })}
        title={t("title")}
      />
      <TextField
        label={t("label")}
        hint={others > 1 ? t("hintMany") : t("hintOne")}
        value={text}
        max={MAX_QUESTION}
        autoFocus
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={pending || !text.trim()}
        >
          {t("send")}
        </Button>
        {confirmGiveUp ? (
          <span className="flex items-center gap-2">
            <span className="font-medium text-ink-muted text-sm">
              {t("giveUpSure")}
            </span>
            <Button
              size="sm"
              disabled={pending}
              onClick={async () => {
                if ((await run(() => giveUp(code))).ok) await refresh();
              }}
            >
              {t("giveUpYes")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmGiveUp(false)}
            >
              {t("giveUpNo")}
            </Button>
          </span>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmGiveUp(true)}>
            {t("giveUp")}
          </Button>
        )}
      </div>
    </form>
  );
}

function Answer() {
  const t = useTranslations("turn.answer");
  const name = useDisplayName();
  const { view, code, refresh, playerById } = useRoomContext();
  const { run, pending } = useAction();
  const [value, setValue] = useState<AnswerValue | null>(null);
  const [note, setNote] = useState("");
  const asker = playerById(view.turn?.playerId);
  const total = view.players.filter((p) => p.id !== asker?.id).length;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value) return;
        if (
          (await run(() => answerQuestion(code, value, note.trim() || null))).ok
        )
          await refresh();
      }}
    >
      <Bubble
        who={asker}
        kicker={t("kicker", {
          n: view.turn?.n ?? 1,
          name: asker ? name(asker) : "",
        })}
      >
        <p className="font-bold font-display text-2xl leading-[30px] [text-wrap:balance]">
          {view.turn?.question}
        </p>
      </Bubble>
      <span className="font-semibold text-sm">{t("yourAnswer")}</span>
      <motion.div
        role="group"
        aria-label={t("yourAnswer")}
        initial="hidden"
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.04 } } }}
        className="grid grid-cols-2 gap-2"
      >
        {ANSWERS.map((a) => (
          <motion.div
            key={a}
            variants={{
              hidden: { opacity: 0, y: 8 },
              shown: { opacity: 1, y: 0 },
            }}
          >
            <AnswerChip
              value={a}
              pressed={value === a}
              onClick={() => setValue(a)}
              className="w-full"
            />
          </motion.div>
        ))}
      </motion.div>
      <TextArea
        label={t("note")}
        value={note}
        max={MAX_NOTE}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending || !value}>
          {t("send")}
        </Button>
        <span className="font-medium text-[13px] text-ink-muted">
          {t("progress", { done: view.turn?.answeredIds.length ?? 0, total })}
        </span>
      </div>
    </form>
  );
}

function AnswersList({
  answers,
}: {
  answers: { byId: string; value: AnswerValue; note: string | null }[];
}) {
  const name = useDisplayName();
  const { playerById } = useRoomContext();
  return (
    <ul className="flex flex-col gap-2">
      {answers.map((a) => {
        const p = playerById(a.byId);
        return (
          <li key={a.byId} className="flex flex-wrap items-center gap-2">
            {p ? (
              <Avatar
                avatar={p.avatar}
                isGuest={p.isGuest}
                name={p.name}
                size={28}
              />
            ) : null}
            <span className="w-28 truncate font-semibold text-sm">
              {p ? name(p, p.isYou) : ""}
            </span>
            <AnswerChip value={a.value} small />
            {a.note ? <span className="text-sm">“{a.note}”</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function Guess() {
  const t = useTranslations("turn.guess");
  const { view, code, refresh } = useRoomContext();
  const { run, pending } = useAction();
  const [text, setText] = useState("");
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if ((await run(() => submitGuess(code, text))).ok) await refresh();
      }}
    >
      <Bubble you kicker={t("kicker", { n: view.turn?.n ?? 1 })}>
        <p className="text-lg">{view.turn?.question}</p>
        {view.turn?.answers ? (
          <AnswersList answers={view.turn.answers} />
        ) : null}
      </Bubble>
      <Heading title={t("title")} />
      <TextField
        label={t("label")}
        hint={t("hint")}
        value={text}
        max={MAX_GUESS}
        autoFocus
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={pending || !text.trim()}
        >
          {t("send")}
        </Button>
        <Button
          disabled={pending}
          onClick={async () => {
            if ((await run(() => passTurn(code))).ok) await refresh();
          }}
        >
          {t("pass")}
        </Button>
      </div>
    </form>
  );
}

function Validate() {
  const t = useTranslations("turn.validate");
  const name = useDisplayName();
  const { view, code, refresh, playerById } = useRoomContext();
  const { run, pending } = useAction();
  const guesser = playerById(view.turn?.playerId);
  const others = view.players.filter((p) => !p.isYou && p.id !== guesser?.id);
  const decide = async (correct: boolean) => {
    if ((await run(() => validateGuess(code, correct))).ok) await refresh();
  };
  return (
    <div className="flex flex-col gap-5">
      <Bubble
        who={guesser}
        kicker={t("kicker", {
          n: view.turn?.n ?? 1,
          name: guesser ? name(guesser) : "",
        })}
      >
        <p className="font-display font-extrabold text-[clamp(32px,4vw,44px)] leading-tight">
          “{view.turn?.guess}”
        </p>
      </Bubble>
      <Heading title={t("title", { name: guesser ? name(guesser) : "" })} />
      <p className="max-w-[440px] text-ink-muted">
        {others.length
          ? t("bodyMany", { names: others.map((p) => name(p)).join(", ") })
          : t("bodyOne")}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          size="lg"
          disabled={pending}
          onClick={() => decide(true)}
        >
          <Check strokeWidth={2} />
          {t("yes")}
        </Button>
        <Button size="lg" disabled={pending} onClick={() => decide(false)}>
          {t("no")}
        </Button>
      </div>
    </div>
  );
}

function Waiting({ mode }: { mode: Mode }) {
  const t = useTranslations("turn.wait");
  const name = useDisplayName();
  const { view, me, playerById } = useRoomContext();
  const turnPlayer = playerById(view.turn?.playerId);
  const validator = playerById(view.turn?.validatorId);
  const who = turnPlayer ? name(turnPlayer, turnPlayer.isYou) : "";
  const title =
    mode === "waitAsk"
      ? t("ask", { name: who })
      : mode === "waitAnswers"
        ? t("answers")
        : mode === "waitGuess"
          ? t("guess", { name: who })
          : t("validate", {
              name: validator ? name(validator) : "",
              guesser: who,
            });
  const pending = view.players.filter((p) => p.status === "answering");
  return (
    <div className="flex flex-col gap-5">
      <Heading kicker={t("kicker", { n: view.turn?.n ?? 1 })} title={title} />
      {mode === "waitAnswers" && view.turn?.question ? (
        <Bubble
          you={turnPlayer?.isYou}
          who={turnPlayer}
          kicker={t("question", { name: who })}
        >
          <p className="text-lg">{view.turn.question}</p>
          {view.turn.yourAnswer ? (
            <div className="flex items-center gap-2 text-sm">
              <span>{t("youAnswered")}</span>
              <AnswerChip value={view.turn.yourAnswer.value} small />
            </div>
          ) : null}
        </Bubble>
      ) : null}
      {mode === "waitAnswers" && pending.length ? (
        <p className="text-ink-muted">
          {t("stillAnswering", {
            names: pending.map((p) => name(p, p.id === me.id)).join(", "),
          })}
        </p>
      ) : null}
      <motion.div
        aria-hidden="true"
        className="flex gap-2"
        initial="a"
        animate="b"
        variants={{
          b: {
            transition: {
              staggerChildren: 0.18,
              repeat: Number.POSITIVE_INFINITY,
            },
          },
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-2.5 rounded-pill bg-line-strong"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.4,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
