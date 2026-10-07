"use client";

import { Slider as BaseSlider } from "@base-ui/react/slider";
import { Check, RotateCcw } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button, keyClass } from "@/components/ui/button";
import {
  COLORS,
  EMOJI_PALETTES,
  SCALE_MAX,
  WORD_MAX,
} from "@/game/impostor/answers";
import type { BankQuestion, QuestionLabel } from "@/game/impostor/questions";
import type { ImpAnswer, ImpQuestion } from "@/game/impostor/types";
import { cn } from "@/lib/cn";
import { useWords } from "./use-questions";

const spring = { type: "spring", stiffness: 420, damping: 30 } as const;

export interface PadProps {
  question: ImpQuestion;
  /** Its words; null while the bank loads. */
  bank: BankQuestion | null;
  /** The answer given, locking the pad until "Change". */
  mine: ImpAnswer | null;
  /** Before the step starts, or while an answer is on its way. */
  disabled: boolean;
  onAnswer: (a: ImpAnswer) => void;
  onChange: () => void;
}

/** The pad that fits the question: a scale, colours, emoji, options or a word. */
export function AnswerPad(props: PadProps) {
  switch (props.question.kind) {
    case "scale":
      return <ScalePad {...props} />;
    case "color":
      return <ColorPad {...props} />;
    case "emoji":
      return <EmojiPad {...props} />;
    case "pick":
      return <PickPad {...props} />;
    case "word":
      return <WordPad {...props} />;
  }
}

/** "Change": takes the answer back (and the time it cut) to pick again. */
function ChangeButton({
  onChange,
  disabled,
}: {
  onChange: () => void;
  disabled: boolean;
}) {
  const t = useTranslations("impostor.reply");
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onChange}
      disabled={disabled}
    >
      <RotateCcw className="size-4" strokeWidth={2} />
      {t("change")}
    </Button>
  );
}

/** An end of the scale: its emoji over its words. */
function End({
  label,
  align,
}: {
  label: QuestionLabel | null;
  align: "start" | "end";
}) {
  const w = useWords();
  if (!label) return <span className="flex-1" />;
  return (
    <span
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-1 font-semibold text-ink-muted text-sm leading-tight",
        align === "end" ? "items-end text-right" : "items-start text-left",
      )}
    >
      {label.emoji ? (
        <span aria-hidden className="text-2xl leading-none">
          {label.emoji}
        </span>
      ) : null}
      {w.label(label)}
    </span>
  );
}

function ScalePad({ bank, mine, disabled, onAnswer, onChange }: PadProps) {
  const t = useTranslations("impostor.reply");
  const ends = bank?.options && "low" in bank.options ? bank.options : null;
  const answered = mine && "n" in mine ? mine.n : null;
  const [value, setValue] = useState(answered ?? Math.ceil(SCALE_MAX / 2));
  const shown = answered ?? value;
  const locked = answered !== null;
  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-5">
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={shown}
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.8 }}
          transition={spring}
          className="font-display font-extrabold text-[72px] tabular-nums leading-none"
        >
          {shown}
        </m.span>
      </AnimatePresence>
      <div className="flex w-full flex-col gap-2">
        <BaseSlider.Root
          value={shown}
          min={1}
          max={SCALE_MAX}
          step={1}
          disabled={disabled || locked}
          onValueChange={(v) => setValue(Array.isArray(v) ? v[0] : v)}
          className="w-full data-disabled:opacity-60"
        >
          <BaseSlider.Control className="flex w-full touch-none select-none items-center py-4">
            <BaseSlider.Track className="h-3 w-full select-none rounded-pill bg-sunken">
              <BaseSlider.Indicator className="select-none rounded-pill bg-butter" />
              <BaseSlider.Thumb
                aria-label={t("scaleLabel")}
                className="size-9 select-none rounded-pill border-[3px] border-ink bg-surface shadow-pop has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-sky has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-offset-2"
              />
            </BaseSlider.Track>
          </BaseSlider.Control>
        </BaseSlider.Root>
        <div className="flex items-end justify-between gap-6">
          <End label={ends?.low ?? null} align="start" />
          <End label={ends?.high ?? null} align="end" />
        </div>
      </div>
      {locked ? (
        <ChangeButton onChange={onChange} disabled={disabled} />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAnswer({ n: value })}
          className={keyClass("yes", {
            bounce: !disabled,
            className: "min-h-14 px-10 text-lg",
          })}
        >
          <Check className="size-5" strokeWidth={2.5} />
          {t("answer")}
        </button>
      )}
    </div>
  );
}

/** A grid of options answered with one tap; once answered only the chosen one stays lit. */
function TapGrid({
  count,
  mine,
  disabled,
  onAnswer,
  onChange,
  columns,
  render,
  label,
}: PadProps & {
  count: number;
  columns: string;
  render: (i: number, on: boolean) => React.ReactNode;
  label: (i: number) => string;
}) {
  const chosen = mine && "n" in mine ? mine.n : null;
  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-4">
      <div className={cn("grid w-full gap-2", columns)}>
        {Array.from({ length: count }, (_, i) => {
          const on = chosen === i;
          return (
            <m.button
              // biome-ignore lint/suspicious/noArrayIndexKey: options are by index
              key={i}
              type="button"
              aria-pressed={on}
              aria-label={label(i)}
              disabled={disabled || (chosen !== null && !on)}
              onClick={() => (on ? undefined : onAnswer({ n: i }))}
              whileTap={{ scale: 0.92 }}
              animate={{
                opacity: chosen === null || on ? 1 : 0.3,
                scale: on ? 1.06 : 1,
              }}
              transition={spring}
              className="relative flex items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sky disabled:cursor-default"
            >
              {render(i, on)}
            </m.button>
          );
        })}
      </div>
      {chosen !== null ? (
        <ChangeButton onChange={onChange} disabled={disabled} />
      ) : null}
    </div>
  );
}

function ColorPad(props: PadProps) {
  const t = useTranslations("impostor.colors");
  return (
    <TapGrid
      {...props}
      count={COLORS.length}
      columns="grid-cols-4 sm:grid-cols-6"
      label={(i) => t(COLORS[i].key)}
      render={(i, on) => (
        <span
          className={cn(
            "aspect-square w-full rounded-md shadow-card ring-ink transition-[box-shadow] duration-200",
            on && "ring-4 ring-offset-2 ring-offset-surface",
          )}
          style={{ backgroundColor: COLORS[i].hex }}
        />
      )}
    />
  );
}

function EmojiPad(props: PadProps) {
  const palette =
    props.bank?.options && "palette" in props.bank.options
      ? EMOJI_PALETTES[props.bank.options.palette]
      : EMOJI_PALETTES.general;
  return (
    <TapGrid
      {...props}
      count={palette.length}
      columns="grid-cols-4 sm:grid-cols-6"
      label={(i) => palette[i]}
      render={(i, on) => (
        <span
          className={cn(
            "flex aspect-square w-full items-center justify-center rounded-md bg-surface text-[clamp(28px,6vw,40px)] shadow-card",
            on && "outline-[3px] outline-ink outline-solid",
          )}
        >
          {palette[i]}
        </span>
      )}
    />
  );
}

function PickPad(props: PadProps) {
  const w = useWords();
  const choices =
    props.bank?.options && "choices" in props.bank.options
      ? props.bank.options.choices
      : [];
  return (
    <TapGrid
      {...props}
      count={props.question.choices}
      columns="grid-cols-2"
      label={(i) => (choices[i] ? w.label(choices[i]) : String(i + 1))}
      render={(i, on) => (
        <span
          className={cn(
            "flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg bg-surface px-3 py-4 font-bold font-display text-lg leading-tight shadow-card sm:min-h-36 sm:text-xl",
            on && "bg-ink text-on-ink",
          )}
        >
          {choices[i]?.emoji ? (
            <span aria-hidden className="text-[40px] leading-none">
              {choices[i].emoji}
            </span>
          ) : null}
          {choices[i] ? w.label(choices[i]) : null}
        </span>
      )}
    />
  );
}

function WordPad({ mine, disabled, onAnswer, onChange }: PadProps) {
  const t = useTranslations("impostor.reply");
  const [word, setWord] = useState("");
  const said = mine && "word" in mine ? mine.word : null;
  if (said !== null)
    return (
      <div className="flex flex-col items-center gap-4">
        <span className="rounded-lg bg-surface px-6 py-4 font-bold font-display text-3xl shadow-card">
          {said}
        </span>
        <ChangeButton
          onChange={() => {
            setWord(said);
            onChange();
          }}
          disabled={disabled}
        />
      </div>
    );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const w = word.trim();
    if (w) onAnswer({ word: w });
  };
  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-[460px] flex-col items-center gap-3"
    >
      <input
        value={word}
        maxLength={WORD_MAX}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        aria-label={t("wordLabel")}
        placeholder={t("wordPlaceholder")}
        onChange={(e) => setWord(e.target.value)}
        className="h-16 w-full rounded-lg border-[1.5px] border-line-strong bg-surface px-5 text-center font-bold font-display text-2xl outline-none transition-colors placeholder:font-sans placeholder:font-medium placeholder:text-base placeholder:text-ink-muted focus:border-sky"
      />
      <span className="text-[13px] text-ink-muted">{t("wordRule")}</span>
      <button
        type="submit"
        disabled={disabled || !word.trim()}
        className={keyClass("yes", {
          bounce: !disabled && !!word.trim(),
          className: "min-h-14 px-10 text-lg",
        })}
      >
        <Check className="size-5" strokeWidth={2.5} />
        {t("answer")}
      </button>
    </form>
  );
}
