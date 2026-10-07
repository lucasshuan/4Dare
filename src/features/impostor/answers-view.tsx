"use client";

import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { useRoomContext } from "@/features/data/room-context";
import { COLORS, EMOJI_PALETTES, SCALE_MAX } from "@/game/impostor/answers";
import type { BankQuestion } from "@/game/impostor/questions";
import type { ImpAnswer, ImpQuestion } from "@/game/impostor/types";
import type { PlayerId } from "@/game/types";
import { cn } from "@/lib/cn";
import { gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { useWords } from "./use-questions";

const palette = (bank: BankQuestion | null) =>
  bank?.options && "palette" in bank.options
    ? EMOJI_PALETTES[bank.options.palette]
    : EMOJI_PALETTES.general;

/** One answer as a short piece of text, for chips and screen readers. */
export function useAnswerText() {
  const t = useTranslations("impostor.colors");
  const w = useWords();
  return (q: ImpQuestion, bank: BankQuestion | null, a: ImpAnswer) => {
    if ("word" in a) return a.word;
    switch (q.kind) {
      case "scale":
        return String(a.n);
      case "color":
        return t(COLORS[a.n]?.key ?? "black");
      case "emoji":
        return palette(bank)[a.n] ?? "";
      case "pick": {
        const c =
          bank?.options && "choices" in bank.options
            ? bank.options.choices[a.n]
            : null;
        return c ? w.label(c) : String(a.n + 1);
      }
      default:
        return "";
    }
  };
}

/** One answer drawn small: a number, a swatch, an emoji, an option or a word. */
export function AnswerChip({
  question,
  bank,
  answer,
  className,
}: {
  question: ImpQuestion;
  bank: BankQuestion | null;
  answer: ImpAnswer | null;
  className?: string;
}) {
  const text = useAnswerText();
  const base =
    "inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-sm px-1.5 font-bold text-[13px] leading-none";
  if (!answer)
    return (
      <span className={cn(base, "bg-sunken text-ink-muted", className)}>–</span>
    );
  if (question.kind === "color" && "n" in answer)
    return (
      <span
        title={text(question, bank, answer)}
        className={cn(
          base,
          "w-7 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]",
          className,
        )}
        style={{ backgroundColor: COLORS[answer.n]?.hex }}
      />
    );
  if (question.kind === "pick" && "n" in answer) {
    const c =
      bank?.options && "choices" in bank.options
        ? bank.options.choices[answer.n]
        : null;
    return (
      <span className={cn(base, "max-w-36 bg-sunken text-ink", className)}>
        {c?.emoji ? <span aria-hidden>{c.emoji}</span> : null}
        <span className="truncate">{text(question, bank, answer)}</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        base,
        "max-w-36 bg-sunken text-ink",
        question.kind === "emoji" && "text-lg",
        className,
      )}
    >
      <span className="truncate">{text(question, bank, answer)}</span>
    </span>
  );
}

interface Landed {
  byId: PlayerId;
  answer: ImpAnswer;
}

/** A face that drops into place, in the player's colour. */
function Face({ id, delay }: { id: PlayerId; delay: number }) {
  const { playerById } = useRoomContext();
  const name = useDisplayName();
  const still = useReducedMotion() ?? false;
  const p = playerById(id);
  if (!p) return null;
  return (
    <m.span
      title={name(p, p.isYou)}
      initial={still ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.6 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.45, ease: gs.backOut(1.6) }}
      className="flex"
    >
      <Avatar avatar={p.avatar} seat={p.colorSlot} size={36} />
    </m.span>
  );
}

/**
 * Everyone's answers to one question, landing together: faces on the scale
 * at their number, colours and emoji over their names, the options split
 * into sides, words on cards.
 */
export function AnswersView({
  question,
  bank,
  answers,
}: {
  question: ImpQuestion;
  bank: BankQuestion | null;
  answers: Landed[];
}) {
  const { playerById } = useRoomContext();
  const name = useDisplayName();
  const w = useWords();
  const text = useAnswerText();
  const t = useTranslations("impostor.reveal");
  const still = useReducedMotion() ?? false;
  if (!answers.length)
    return <p className="text-center text-ink-muted">{t("nobody")}</p>;
  if (question.kind === "scale") {
    const ends = bank?.options && "low" in bank.options ? bank.options : null;
    return (
      <div className="flex w-full max-w-[720px] flex-col gap-3">
        <div className="grid grid-cols-10 items-end gap-1">
          {Array.from({ length: SCALE_MAX }, (_, i) => {
            const at = answers.filter(
              (a) => "n" in a.answer && a.answer.n === i + 1,
            );
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: one column per number
                key={i}
                className="flex min-h-36 flex-col-reverse items-center gap-1"
              >
                {at.slice(0, 4).map((a, n) => (
                  <Face key={a.byId} id={a.byId} delay={0.15 * n + i * 0.03} />
                ))}
                {at.length > 4 ? (
                  <span className="font-bold text-ink-muted text-xs">
                    +{at.length - 4}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-10 gap-1 border-line-strong border-t-2 pt-1.5">
          {Array.from({ length: SCALE_MAX }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: one label per number
              key={i}
              className="text-center font-bold text-ink-muted tabular-nums"
            >
              {i + 1}
            </span>
          ))}
        </div>
        <div className="flex justify-between gap-4 font-semibold text-ink-muted text-sm">
          <span>
            {ends?.low.emoji} {ends ? w.label(ends.low) : null}
          </span>
          <span className="text-right">
            {ends ? w.label(ends.high) : null} {ends?.high.emoji}
          </span>
        </div>
      </div>
    );
  }
  if (question.kind === "pick") {
    const choices =
      bank?.options && "choices" in bank.options ? bank.options.choices : [];
    return (
      <div className={cn("grid w-full max-w-[760px] gap-3", "grid-cols-2")}>
        {Array.from({ length: question.choices }, (_, i) => {
          const side = answers.filter(
            (a) => "n" in a.answer && a.answer.n === i,
          );
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: one side per option
              key={i}
              className="flex min-h-40 flex-col items-center gap-3 rounded-lg bg-surface/70 p-4 shadow-card"
            >
              <span className="flex flex-col items-center gap-1 font-bold font-display text-lg leading-tight">
                {choices[i]?.emoji ? (
                  <span aria-hidden className="text-4xl leading-none">
                    {choices[i].emoji}
                  </span>
                ) : null}
                {choices[i] ? w.label(choices[i]) : null}
              </span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {side.map((a, n) => (
                  <Face key={a.byId} id={a.byId} delay={0.1 * n} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  // colours, emoji and words: one tile per player, turning over one by one
  return (
    <ul className="flex w-full max-w-[880px] flex-wrap justify-center gap-3">
      {answers.map((a, n) => {
        const p = playerById(a.byId);
        if (!p) return null;
        const label = text(question, bank, a.answer);
        return (
          <m.li
            key={a.byId}
            initial={still ? { opacity: 0 } : { opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            transition={{ delay: 0.12 * n, duration: 0.4, ease: gs.p3Out }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg bg-surface p-2.5 shadow-card",
              question.kind === "word"
                ? "w-[calc(50%-6px)] sm:w-40"
                : "w-[calc(33.333%-8px)] sm:w-32",
            )}
          >
            {question.kind === "color" && "n" in a.answer ? (
              <span
                title={label}
                className="aspect-square w-full rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                style={{ backgroundColor: COLORS[a.answer.n]?.hex }}
              >
                <span className="sr-only">{label}</span>
              </span>
            ) : question.kind === "emoji" && "n" in a.answer ? (
              <span className="flex aspect-square w-full items-center justify-center rounded-md bg-sunken text-5xl">
                {palette(bank)[a.answer.n]}
              </span>
            ) : (
              <span className="flex min-h-20 w-full items-center justify-center rounded-md bg-sunken px-2 text-center font-bold font-display text-lg leading-tight [overflow-wrap:anywhere]">
                {label}
              </span>
            )}
            <span className="flex max-w-full items-center gap-1.5 font-semibold text-[13px]">
              <Avatar avatar={p.avatar} seat={p.colorSlot} size={20} />
              <span className="truncate">{name(p, p.isYou)}</span>
            </span>
          </m.li>
        );
      })}
    </ul>
  );
}
