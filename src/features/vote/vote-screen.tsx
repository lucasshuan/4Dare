"use client";

import { Check, Crown, Shuffle } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { fireConfetti } from "@/components/ui/confetti";
import { useWithNames } from "@/components/ui/player-name";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { useSceneShow } from "@/features/room/match-frame";
import { ColdOpen } from "@/features/stage/cold-open";
import { ThemeStage } from "@/features/stage/theme-stage";
import { type ThemeSet, themeSetEmoji } from "@/game/theme-sets";
import type { Lang, PlayerView, VoteView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useServerClock } from "@/lib/hooks/use-server-clock";
import { dur, ease } from "@/lib/motion";
import { voteTheme } from "@/server/actions";

/** One colour per option, so a theme keeps its colour through the whole vote. */
const TONES = [
  { card: "bg-butter text-on-butter", bar: "bg-on-butter/25" },
  { card: "bg-sky-soft text-ink", bar: "bg-sky/30" },
  { card: "bg-apricot-soft text-ink", bar: "bg-apricot/30" },
] as const;
/** Cards are dealt like a hand: each starts tilted its own way. */
const TILT = [-7, 0, 7];
const spring = { type: "spring", stiffness: 320, damping: 32 } as const;
/** After a tie stops spinning, the winner glows this long before the others step aside. */
const SPOTLIGHT_MS = 700;

type Stage = "voting" | "spinning" | "spotlight" | "winner";

/**
 * Which tied option the roulette lights up `elapsed` ms into the spin. Steps
 * slow down towards the end and the last one lands on the winner; every
 * screen computes the same thing from the server clock, so all spin together.
 */
function rouletteAt(v: VoteView, elapsed: number, spinMs: number) {
  const chosen = v.chosen ?? 0;
  const tied = v.tied.length ? v.tied : [chosen];
  const steps = tied.length * 4;
  const start =
    (((tied.indexOf(chosen) - steps) % tied.length) + tied.length) %
    tied.length;
  const p = Math.min(1, Math.max(0, elapsed / spinMs));
  // Quadratic spacing: quick at first, then each step takes longer.
  const i = Math.min(steps, Math.floor(Math.sqrt(p) * steps));
  return tied[(start + i) % tied.length];
}

/** The theme vote, then (while the reveal lasts) the result played out for everyone. */
export function VoteScreen() {
  const t = useTranslations("room.vote");
  const lang = useLocale() as Lang;
  const still = useReducedMotion() ?? false;
  const { view, code, offset, playerById } = useRoomContext();
  const now = useServerClock(offset, 50);
  const { act } = useRoomAction();
  // The click shows at once; the server's answer replaces it.
  const [optimistic, setOptimistic] = useState<number | null>(null);
  const v = view.vote;
  // The theme show, also while the cast already waits behind it.
  const r = view.reveal;
  const reveal =
    r?.kind === "theme"
      ? r
      : r?.kind === "cast" && r.prev?.kind === "theme"
        ? r.prev
        : null;

  const resolved = v?.chosen != null && reveal !== null;
  // The theme show opens with the spin when the vote tied.
  const spin = reveal?.beats.find((b) => b.kind === "tie_spin");
  const spinMs =
    resolved && v && v.tied.length > 1 && !still && spin
      ? spin.until - spin.startsAt
      : 0;
  // A vote that closes during the opening queues the theme show after it:
  // the cards stay as they are until it starts.
  const started = reveal !== null && now >= reveal.startsAt;
  const elapsed = reveal ? Math.max(0, now - reveal.startsAt) : 0;
  const stage: Stage =
    !resolved || !started
      ? "voting"
      : spinMs > 0 && elapsed < spinMs
        ? "spinning"
        : elapsed < spinMs + SPOTLIGHT_MS && !still
          ? "spotlight"
          : "winner";

  const celebrated = useRef(false);
  useEffect(() => {
    if (stage !== "winner" || celebrated.current) return;
    celebrated.current = true;
    fireConfetti();
  }, [stage]);

  if (!v) return null;
  const mine = optimistic ?? v.yourVote;
  const voterIds = new Set(v.votes.map((x) => x.byId));
  const waiting = view.players.filter((p) => !voterIds.has(p.id));
  const lit =
    stage === "spinning"
      ? rouletteAt(v, elapsed, spinMs)
      : stage === "voting"
        ? null
        : v.chosen;
  const shown = v.options
    .map((option, i) => ({ option, i }))
    .filter(({ i }) => stage !== "winner" || i === v.chosen);

  const choose = async (i: number) => {
    // the vote may be over already, its theme show still to come
    if (stage !== "voting" || v.chosen !== null || i === mine) return;
    setOptimistic(i);
    await act(() => voteTheme(code, i));
    setOptimistic(null);
  };

  return (
    <>
      <Scenes />
      <div className="mx-auto flex w-full max-w-[1040px] sm:min-h-[calc(100dvh-8rem)] flex-col justify-center gap-5 short:gap-5 pb-4 sm:gap-8 sm:pb-10 sm:short:pb-4">
        <Heading stage={stage} tie={v.tied.length > 1} />

        <LayoutGroup>
          <motion.div
            layout
            role="group"
            aria-labelledby="vote-title"
            className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4"
          >
            <AnimatePresence mode="popLayout" initial>
              {shown.map(({ option, i }) => (
                <OptionCard
                  key={i}
                  index={i}
                  label={t("option", { n: i + 1 })}
                  set={option.set}
                  theme={option[lang]}
                  voters={v.votes
                    .filter((x) => x.option === i)
                    .map((x) => playerById(x.byId))
                    .filter((p): p is PlayerView => !!p)}
                  total={v.total}
                  mine={mine === i}
                  lit={lit === i}
                  dimmed={lit !== null && lit !== i}
                  stage={stage}
                  still={still}
                  onChoose={() => choose(i)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>

        <Footer
          stage={stage}
          voted={v.votes.length}
          total={v.total}
          waiting={waiting}
          hasVote={mine !== null}
        />
        <output aria-live="polite" className="sr-only">
          {stage === "winner" && v.chosen !== null
            ? t("announce", { theme: v.options[v.chosen][lang] })
            : stage === "spinning"
              ? t("tie")
              : ""}
        </output>
      </div>
    </>
  );
}

function Heading({ stage, tie }: { stage: Stage; tie: boolean }) {
  const t = useTranslations("room.vote");
  const key =
    stage === "voting" ? "voting" : stage === "spinning" ? "tie" : "chosen";
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: dur.base } }}
        className="inline-flex items-center gap-1.5 rounded-pill bg-sunken px-3 py-1 font-semibold text-ink-muted text-xs uppercase tracking-[0.08em]"
      >
        {stage === "spinning" ? (
          <Shuffle className="size-3.5" strokeWidth={2.25} />
        ) : null}
        {t("kicker")}
      </motion.span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
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
          <h1
            id="vote-title"
            className="text-balance font-bold font-display text-[clamp(32px,4.2vw,48px)] leading-[1.05] tracking-[-0.02em]"
          >
            {key === "voting"
              ? t("title")
              : key === "tie"
                ? t("tieTitle")
                : t("chosenTitle")}
          </h1>
          <p className="max-w-120 text-balance text-ink-muted">
            {key === "voting"
              ? t("subtitle")
              : key === "tie"
                ? t("tie")
                : tie
                  ? t("chosenByDraw")
                  : t("chosenByVotes")}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function OptionCard({
  index,
  label,
  set,
  theme,
  voters,
  total,
  mine,
  lit,
  dimmed,
  stage,
  still,
  onChoose,
}: {
  index: number;
  label: string;
  set: ThemeSet | null;
  theme: string;
  voters: PlayerView[];
  total: number;
  mine: boolean;
  lit: boolean;
  dimmed: boolean;
  stage: Stage;
  still: boolean;
  onChoose: () => void;
}) {
  const t = useTranslations("room.vote");
  const tSets = useTranslations("common.themeSets");
  const tone = TONES[index % TONES.length];
  const emoji = themeSetEmoji(set);
  const voting = stage === "voting";
  const winner = stage === "winner";
  const share = total ? voters.length / total : 0;
  return (
    <motion.button
      layout
      type="button"
      aria-pressed={mine}
      aria-disabled={!voting}
      onClick={onChoose}
      initial={
        still
          ? { opacity: 0 }
          : { opacity: 0, y: 64, rotate: TILT[index] ?? 0, scale: 0.9 }
      }
      animate={{
        opacity: dimmed ? 0.35 : 1,
        y: mine && voting ? -6 : 0,
        rotate: 0,
        scale: lit && !winner ? 1.04 : dimmed ? 0.95 : 1,
        filter: dimmed ? "saturate(0.4)" : "saturate(1)",
        transition: {
          ...spring,
          delay: voting && !still ? index * 0.09 : 0,
          opacity: { duration: dur.base },
          filter: { duration: dur.base },
        },
      }}
      exit={{
        opacity: 0,
        scale: 0.9,
        transition: { duration: dur.base, ease: ease.soft },
      }}
      whileHover={voting ? { y: -8, rotate: (index - 1) * 0.8 } : undefined}
      whileTap={voting ? { scale: 0.97 } : undefined}
      className={cn(
        "group relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl p-4 text-left outline-offset-4 sm:min-h-64 sm:p-6 sm:short:min-h-52",
        tone.card,
        voting ? "shadow-card" : "cursor-default",
        winner &&
          "items-stretch sm:min-h-72 sm:max-w-[720px] sm:short:min-h-60",
        (mine || lit) &&
          "shadow-[0_0_0_3px_var(--canvas),0_0_0_6px_var(--ink)]",
      )}
    >
      {/* the light sweeping across the card the roulette is on */}
      <AnimatePresence>
        {lit && stage !== "voting" ? (
          <motion.span
            key="glow"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast }}
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.55),transparent_60%)] dark:bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.12),transparent_60%)]"
          />
        ) : null}
      </AnimatePresence>

      <span className="relative flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold text-xs uppercase tracking-[0.08em]">
          {emoji ? (
            <motion.span
              aria-hidden
              initial={{ scale: 0.4, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...spring, delay: still ? 0 : 0.25 + index * 0.09 }}
              className="text-base leading-none"
            >
              {emoji}
            </motion.span>
          ) : null}
          <span className="truncate opacity-70">
            {winner ? t("chosen") : set ? tSets(set) : label}
          </span>
        </span>
        <AnimatePresence>
          {winner ? (
            <Badge key="crown">
              <Crown className="size-4" strokeWidth={2.25} />
            </Badge>
          ) : mine ? (
            <Badge key="mine" label={t("yourVote")}>
              <Check className="size-4" strokeWidth={2.75} />
            </Badge>
          ) : null}
        </AnimatePresence>
      </span>

      <motion.span
        layout="position"
        className={cn(
          "relative mt-2 mb-3 flex flex-1 sm:mt-3 sm:mb-4 items-center text-balance font-display font-extrabold tracking-[-0.02em]",
          winner
            ? "text-[clamp(40px,5.6vw,72px)] leading-[1.05]"
            : theme.length > 18
              ? "text-[26px] leading-[1.1] sm:text-[clamp(24px,2.4vw,32px)] sm:leading-[1.1]"
              : "text-[30px] leading-[1.08] sm:text-[clamp(30px,3vw,40px)] sm:leading-[1.08]",
        )}
      >
        {theme}
      </motion.span>

      <span className="relative flex min-h-8 items-center justify-between gap-3">
        <span className="-space-x-2 flex">
          <AnimatePresence initial={false}>
            {voters.map((p) => (
              <motion.span
                key={p.id}
                layoutId={`voter-${p.id}`}
                initial={{ opacity: 0, scale: 0.4, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={spring}
                className="rounded-pill"
              >
                <Avatar
                  avatar={p.avatar}
                  isGuest={p.isGuest}
                  name={p.name}
                  size={32}
                  className="ring-2 ring-surface/80"
                />
              </motion.span>
            ))}
          </AnimatePresence>
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={voters.length}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: dur.base, ease: ease.soft }}
            className="font-semibold text-sm tabular-nums"
          >
            {t("votes", { count: voters.length })}
          </motion.span>
        </AnimatePresence>
      </span>

      {/* share of the room behind this theme */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 bottom-0 h-1.5",
          tone.bar,
          "opacity-40",
        )}
      />
      <motion.span
        aria-hidden
        initial={false}
        animate={{ scaleX: share }}
        transition={spring}
        className={cn(
          "absolute bottom-0 left-0 h-1.5 w-full origin-left",
          index === 0 ? "bg-on-butter" : index === 1 ? "bg-sky" : "bg-apricot",
        )}
      />
    </motion.button>
  );
}

function Badge({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.4, rotate: -30 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.4 }}
      transition={spring}
      className="inline-flex items-center gap-1 rounded-pill bg-ink py-1 pr-2.5 pl-1.5 font-semibold text-on-ink text-xs"
    >
      {children}
      {label ? <span>{label}</span> : null}
    </motion.span>
  );
}

function Footer({
  stage,
  voted,
  total,
  waiting,
  hasVote,
}: {
  stage: Stage;
  voted: number;
  total: number;
  waiting: PlayerView[];
  hasVote: boolean;
}) {
  const t = useTranslations("room.vote");
  const withNames = useWithNames();
  if (stage !== "voting") return <div className="min-h-12" />;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: dur.base, delay: 0.35 },
      }}
      className="flex min-h-12 flex-col items-center gap-1 text-center"
    >
      <span className="flex items-center gap-3">
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <motion.span
              // biome-ignore lint/suspicious/noArrayIndexKey: one dot per seat
              key={i}
              animate={{
                scale: i < voted ? 1 : 0.7,
                opacity: i < voted ? 1 : 0.35,
              }}
              transition={spring}
              className="size-2.5 rounded-full bg-ink"
            />
          ))}
        </span>
        <span className="font-semibold text-sm">
          {t("progress", { done: voted, total })}
        </span>
      </span>
      <span className="font-medium text-[13px] text-ink-muted">
        {waiting.length
          ? withNames((n) =>
              t("waitingFor", {
                names: waiting.map((p) => n(p, p.isYou)).join(", "),
              }),
            )
          : t("allVoted")}
        {hasVote && waiting.length ? ` · ${t("change")}` : ""}
      </span>
    </motion.div>
  );
}

/** The scenes that play over this screen: the opening, then the theme hero and the rule. */
function Scenes() {
  const opening = useSceneShow("opening", ["curtain", "intro", "round"]);
  const theme = useSceneShow("theme", ["theme", "rule"]);
  return (
    <>
      {opening ? <ColdOpen show={opening} /> : null}
      {theme ? <ThemeStage show={theme} from="vote" /> : null}
    </>
  );
}
