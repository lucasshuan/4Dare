"use client";

import { Check } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, type ReactNode, useState } from "react";
import { AnswerChip } from "@/components/ui/answer-chip";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CharacterCard } from "@/components/ui/character-card";
import { useWithNames } from "@/components/ui/player-name";
import { Portrait } from "@/components/ui/portrait";
import { TextArea, TextField } from "@/components/ui/text-field";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { useSceneShow, useStepStarted } from "@/features/room/match-frame";
import { CastScene } from "@/features/stage/cast-scene";
import { beatOf } from "@/features/stage/stage";
import { useStage } from "@/features/stage/stage-context";
import { PHONE, useStageTimeline } from "@/features/stage/use-stage-timeline";
import {
  endsWithQuestionMark,
  questionMark,
  withoutQuestionMark,
  withQuestionMark,
} from "@/game/question";
import {
  type AnswerValue,
  type Lang,
  MAX_GUESS,
  MAX_NOTE,
  MAX_QUESTION,
  type PlayerView,
} from "@/game/types";
import { cn } from "@/lib/cn";
import { focusIsFree } from "@/lib/focus";
import { dur, ease, gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import {
  answerQuestion,
  askQuestion,
  passTurn,
  submitGuess,
  validateGuess,
} from "@/server/actions";
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

/**
 * The answers by colour: yes, no, then the grey ones. Phones get one colour
 * per row; wider screens one per column (the grid fills column by column).
 */
const ANSWER_GRID: AnswerValue[] = [
  "yes",
  "probably_yes",
  "no",
  "probably_no",
  "unknown",
  "irrelevant",
];

/** Text parts joined by " · ", skipping the empty ones; null when none is left. */
function joinDot(parts: ReactNode[]): ReactNode {
  const kept = parts.filter(Boolean);
  if (!kept.length) return null;
  return kept.map((part, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: fixed parts of one line
    <Fragment key={i}>
      {i > 0 ? " · " : null}
      {part}
    </Fragment>
  ));
}

/** Every step of a turn: asking, answering, guessing, validating, and waiting for others. */
export function TurnScreen() {
  const t = useTranslations("turn");
  const withNames = useWithNames();
  const { view, me, playerById } = useRoomContext();
  const mode = useMode();
  const { beat } = useStage();
  // the cast plays here: the table alone while it runs, then the strip and body come in under its exit
  const cast = useSceneShow("cast", ["received", "order", "entrance"]);
  const tableOnly = cast !== null && beat?.kind !== "entrance";
  // kept after the cast leaves the view, so the entrance is never cut at its end
  const entranceAt = beatOf(cast, "entrance")?.startsAt ?? null;
  const [enterAt, setEnterAt] = useState(entranceAt);
  if (entranceAt !== null && entranceAt !== enterAt) setEnterAt(entranceAt);
  const turnPlayer = playerById(view.turn?.playerId) as PlayerView;
  const focusMine =
    mode === "ask" ||
    mode === "guess" ||
    (mode === "waitValidate" && turnPlayer?.isYou);
  const focus = focusMine ? me : turnPlayer;
  if (!focus) return null;
  const picker = playerById(focus.pickedById);
  const pickedBy = picker
    ? withNames((n) => t("card.pickedBy", { name: n(picker) }))
    : null;
  const meta = focus.isYou
    ? pickedBy
    : joinDot([
        focus.card?.origin,
        picker?.isYou ? t("card.youPicked") : pickedBy,
      ]);
  const label = focus.isYou
    ? t("card.yours")
    : withNames((n) => t("card.theirs", { name: n(focus) }));

  return (
    // small muted text sits on the seat's wash here: a touch darker (lighter in dark) keeps it at 4.5:1
    <div
      className={cn(
        "relative flex flex-col gap-6 short:gap-4 [&_.text-ink-muted]:text-[color:color-mix(in_oklab,var(--ink-muted)_80%,var(--ink))]",
        // the scene is laid over the screen: keep its height while it plays
        cast && "min-h-[calc(100dvh-9rem-var(--dock,0px))]",
      )}
    >
      {cast ? <CastScene show={cast} /> : null}
      {tableOnly ? null : (
        <>
          <PlayerStrip
            players={view.players}
            enter={enterAt === null ? undefined : { at: enterAt }}
          />
          <Rise at={enterAt}>
            {/* the card's width follows the window height, so the whole screen fits */}
            <div className="w-full lg:w-[clamp(232px,calc((100dvh_-_330px)_*_0.66),368px)] lg:flex-none">
              <AnimatePresence mode="wait" initial={false}>
                <m.div
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
                    label={label}
                    title={t("card.whoAreYou")}
                    meta={meta}
                    found={focus.discoveredAt !== null}
                  />
                  <FocusRow
                    focus={focus}
                    label={label}
                    title={t("card.whoAreYou")}
                    meta={meta}
                  />
                </m.div>
              </AnimatePresence>
            </div>
            <section className="flex min-w-0 flex-[1_1_360px] flex-col gap-5 short:gap-3">
              <AnimatePresence mode="wait">
                <m.div
                  key={`${view.phase}-${view.turn?.n}-${mode}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { duration: dur.slow, ease: ease.soft },
                  }}
                  exit={{ opacity: 0, transition: { duration: dur.fast } }}
                  className="flex flex-col gap-5 short:gap-3"
                >
                  <Step mode={mode} />
                </m.div>
              </AnimatePresence>
            </section>
          </Rise>
        </>
      )}
    </div>
  );
}

/** Body rise after the cast: from 0.4 s into its entrance beat (server ms `at`). */
const RISE = { delay: 0.4, y: 24, duration: 0.6 } as const;

/**
 * The turn body (your card and the step) rising in after the cast, on the
 * server clock; without `at` (no cast seen) it is just there.
 */
function Rise({ at, children }: { at: number | null; children: ReactNode }) {
  const ref = useStageTimeline<HTMLDivElement>({
    startsAt: at,
    deps: [at],
    build: (el, { reduced }) =>
      at === null
        ? []
        : reduced
          ? [[el, { opacity: [0, 1] }, { at: RISE.delay, duration: 0.2 }]]
          : [
              [
                el,
                { opacity: [0, 1], y: [RISE.y, 0] },
                { at: RISE.delay, duration: RISE.duration, ease: gs.p3Out },
              ],
            ],
  });
  return (
    <div
      ref={ref}
      className="flex flex-wrap items-stretch gap-5 lg:gap-12"
      style={
        at === null
          ? undefined
          : { opacity: 0, transform: `translateY(${RISE.y}px)` }
      }
    >
      {children}
    </div>
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
  label: ReactNode;
  title: string;
  meta: ReactNode;
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

function Heading({ kicker, title }: { kicker?: string; title: ReactNode }) {
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
          ? "flex flex-col gap-2 rounded-lg bg-sky-soft p-5 short:p-4"
          : "flex flex-col gap-2 rounded-lg bg-apricot-soft p-5 short:p-4"
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
  const mark = questionMark(useLocale() as Lang);
  const { view, code } = useRoomContext();
  const { act, pending } = useRoomAction();
  // As typed. The field shows the final mark as a suffix, hidden only while the
  // text already ends with one; leaving the field or sending swaps it for the suffix.
  const [text, setText] = useState("");
  // the field takes the focus unless the player is typing in the chat
  // not on phones: a field focused by itself would raise the keyboard and hide the chat bar
  const [autoFocus] = useState(
    () => !window.matchMedia(PHONE).matches && focusIsFree(),
  );
  // nothing goes out before the step starts (the cast still plays)
  const started = useStepStarted();
  const typedMark = endsWithQuestionMark(text.trimEnd());
  const others = view.players.filter((p) => !p.isYou && !p.away).length;
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        await act(() => askQuestion(code, withQuestionMark(text, mark)));
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
        suffix={mark}
        suffixHidden={typedMark}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => setText((t) => withoutQuestionMark(t.trimEnd()))}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={
            pending || !started || !withoutQuestionMark(text.trim()).trim()
          }
        >
          {t("send")}
        </Button>
      </div>
    </form>
  );
}

function Answer() {
  const t = useTranslations("turn.answer");
  const name = useDisplayName();
  const { view, code, playerById } = useRoomContext();
  const { act, pending } = useRoomAction();
  const [value, setValue] = useState<AnswerValue | null>(null);
  const [note, setNote] = useState("");
  const asker = playerById(view.turn?.playerId);
  const total = view.players.filter((p) => p.id !== asker?.id).length;
  return (
    <form
      className="flex flex-col gap-4 short:gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value) return;
        await act(() => answerQuestion(code, value, note.trim() || null));
      }}
    >
      <Bubble
        who={asker}
        kicker={t("kicker", {
          n: view.turn?.n ?? 1,
          name: asker ? name(asker) : "",
        })}
      >
        <p className="font-bold font-display text-2xl leading-[30px] [text-wrap:balance] tiny:text-xl tiny:leading-7">
          {view.turn?.question}
        </p>
      </Bubble>
      {/* the group below is labelled anyway; on very short windows the visible label goes */}
      <span className="font-semibold text-sm tiny:sr-only">
        {t("yourAnswer")}
      </span>
      <m.div
        role="group"
        aria-label={t("yourAnswer")}
        initial="hidden"
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.04 } } }}
        className="grid grid-cols-2 gap-2 sm:grid-flow-col sm:grid-cols-3 sm:grid-rows-2"
      >
        {ANSWER_GRID.map((a) => (
          <m.div
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
              // phones: a little smaller, so "Probably yes" stays on one line
              className="w-full whitespace-nowrap max-sm:gap-1.5 max-sm:px-3 max-sm:text-sm max-[380px]:px-2.5 max-[380px]:text-[13px]"
            />
          </m.div>
        ))}
      </m.div>
      <TextArea
        label={t("note")}
        value={note}
        max={MAX_NOTE}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={pending || !value}
          className="tiny:h-11"
        >
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
  const { view, code } = useRoomContext();
  const { act, pending } = useRoomAction();
  const [text, setText] = useState("");
  // typed under the answers reveal, sent once the step starts
  // not on phones: a field focused by itself would raise the keyboard and hide the chat bar
  const [autoFocus] = useState(
    () => !window.matchMedia(PHONE).matches && focusIsFree(),
  );
  const started = useStepStarted();
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!started) return;
        await act(() => submitGuess(code, text));
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
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={pending || !started || !text.trim()}
        >
          {t("send")}
        </Button>
        <Button
          disabled={pending}
          onClick={async () => {
            await act(() => passTurn(code));
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
  const withNames = useWithNames();
  const { view, code, playerById } = useRoomContext();
  const { act, pending } = useRoomAction();
  const guesser = playerById(view.turn?.playerId);
  const others = view.players.filter((p) => !p.isYou && p.id !== guesser?.id);
  const decide = async (correct: boolean) => {
    await act(() => validateGuess(code, correct));
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
      <Heading
        title={
          guesser
            ? withNames((n) => t("title", { name: n(guesser) }))
            : t("title", { name: "" })
        }
      />
      <p className="max-w-[440px] text-ink-muted">
        {others.length
          ? withNames((n) =>
              t("bodyMany", { names: others.map((p) => n(p)).join(", ") }),
            )
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
  const withNames = useWithNames();
  const { view, me, playerById } = useRoomContext();
  const turnPlayer = playerById(view.turn?.playerId);
  const validator = playerById(view.turn?.validatorId);
  const who = turnPlayer ? name(turnPlayer, turnPlayer.isYou) : "";
  const title = withNames((n) => {
    const whoTag = turnPlayer ? n(turnPlayer, turnPlayer.isYou) : "";
    return mode === "waitAsk"
      ? t("ask", { name: whoTag })
      : mode === "waitAnswers"
        ? t("answers")
        : mode === "waitGuess"
          ? t("guess", { name: whoTag })
          : t("validate", {
              name: validator ? n(validator) : "",
              guesser: whoTag,
            });
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
          {withNames((n) =>
            t("stillAnswering", {
              names: pending.map((p) => n(p, p.id === me.id)).join(", "),
            }),
          )}
        </p>
      ) : null}
      <m.div
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
          <m.span
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
      </m.div>
    </div>
  );
}
