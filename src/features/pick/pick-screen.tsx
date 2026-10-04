"use client";

import { Check, Dices } from "lucide-react";
import { type AnimationSequence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { keyClass } from "@/components/ui/button";
import { useWithNames } from "@/components/ui/player-name";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { useSceneShow, useStepStarted } from "@/features/room/match-frame";
import { PickIntro } from "@/features/stage/pick-intro";
import { beatOf, isShow } from "@/features/stage/stage";
import {
  PHONE,
  type TimelineInfo,
  useStageTimeline,
} from "@/features/stage/use-stage-timeline";
import { PICK_TABLE } from "@/game/show-timing/pick";
import type {
  CardView,
  Lang,
  RoomView,
  ShowKind,
  ShowView,
} from "@/game/types";
import { cn } from "@/lib/cn";
import { focusIsFree } from "@/lib/focus";
import { useAction } from "@/lib/hooks/use-action";
import { useMedia } from "@/lib/hooks/use-media";
import { useClock } from "@/lib/hooks/use-server-clock";
import { dur, type EaseFn, ease, gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import {
  confirmCard,
  randomPick,
  replaceCharacterImage,
} from "@/server/actions";
import type { CharacterDTO } from "@/server/contract";
import { DoneRow } from "./done-row";
import { drawHand, type HandCard, uploadDraftImage } from "./draft-api";
import { DrawFeedback } from "./draw-feedback";
import { type CardContent, PickCard, type PickCardState } from "./pick-card";
import { PickHand, usePickHand } from "./pick-hand";
import { useCharacterIndex } from "./use-character-index";
import { usePickDraft } from "./use-pick-draft";

/** The row layout (spacer, card, actions column); narrower windows stack them. */
const WIDE = "(min-width: 1024px)";
/** How long the picture's flip takes before the "Like this pick?" bubble may show. */
const FLIP_MS = 650;

const toCard = (c: CharacterDTO | HandCard): CardView => ({
  characterId: c.id,
  name: c.name,
  origin: c.origin,
  imageUrl: c.imageUrl,
});

/**
 * The pick step: the draw and "for whom" (PickIntro) while they play, then
 * the table: the title, the card (the form), Confirm and Random beside it,
 * the theme's hand at the bottom edge and, once confirmed, who has finished.
 */
export function PickScreen() {
  const { view } = useRoomContext();
  const lang = useLocale() as Lang;
  const show = useSceneShow("theme", ["draw", "target"]);
  // asked for as the draw starts, so the hand is there when the table lands
  usePickHand(view.theme, lang);
  if (show) return <PickIntro show={show} />;
  if (!view.pick) return null;
  return <PickTable />;
}

/** The show of that kind the view carries (current or still playing before it). */
function showIn(view: RoomView, kind: ShowKind): ShowView | null {
  const r = view.reveal;
  if (!isShow(r)) return null;
  if (r.kind === kind) return r;
  return r.prev?.kind === kind ? r.prev : null;
}

/** Whether server time `at` has passed; re-renders when it does. */
function usePast(at: number | null): boolean {
  const clock = useClock();
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (at === null || clock.frozen) return;
    const wait = (at - clock.now()) / clock.rate;
    if (wait < 0) return;
    const id = window.setTimeout(bump, wait + 15);
    return () => window.clearTimeout(id);
  }, [at, clock]);
  return at !== null && clock.now() >= at;
}

/** The card's width: smaller on short windows, so the hand stays clear of it. */
function useCardWidth(phone: boolean): number {
  const [height, setHeight] = useState(() =>
    typeof window === "undefined" ? 800 : window.innerHeight,
  );
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const scene = height - (phone ? 80 : 76);
  const fit = (scene - 360) / 1.25 + 24;
  return Math.round(Math.max(200, Math.min(phone ? 224 : 270, fit)));
}

/** Whether the server's pick is another character than the card holds. */
function differs(pick: CardView, card: CardContent): boolean {
  switch (card.kind) {
    case "empty":
    case "typing":
      return true;
    case "picked":
      return card.card.characterId !== pick.characterId;
    case "new":
      return card.name.trim() !== pick.name.trim();
  }
}

interface Part {
  els: Element[];
  at: number;
  duration: number;
  ease: EaseFn;
  from: Record<string, number>;
  to: Record<string, number>;
}

/** The table's entrance (spec B §5.1); reduced: the same times, 0.2 s fades. */
function buildEntrance(
  scope: HTMLElement,
  { reduced }: TimelineInfo,
): AnimationSequence {
  const all = (name: string) =>
    Array.from(scope.querySelectorAll(`[data-t="${name}"]`));
  const wide = window.matchMedia(WIDE).matches;
  const s = (ms: number) => ms / 1000;
  const parts: Part[] = [
    {
      els: all("title"),
      at: s(PICK_TABLE.title),
      duration: 0.4,
      ease: gs.p1Out,
      from: { opacity: 0, y: 10 },
      to: { opacity: 1, y: 0 },
    },
    {
      els: all("card"),
      at: s(PICK_TABLE.card),
      duration: 0.7,
      ease: gs.backOut(1.6),
      from: { opacity: 0, scale: 0.8, rotate: -5, y: 30 },
      to: { opacity: 1, scale: 1, rotate: 0, y: 0 },
    },
    ...all("hand").map((el, i) => ({
      els: [el],
      at: s(PICK_TABLE.hand + i * PICK_TABLE.handStagger),
      duration: 0.6,
      ease: gs.backOut(1.4),
      from: { opacity: 0, y: 160 },
      to: { opacity: 1, y: 0 },
    })),
    {
      els: all("actions"),
      at: s(PICK_TABLE.actions),
      duration: 0.5,
      ease: gs.p1Out,
      from: { opacity: 0, x: wide ? 20 : 0 },
      to: { opacity: 1, x: 0 },
    },
    {
      els: all("label"),
      at: s(PICK_TABLE.label),
      duration: 0.4,
      ease: gs.p1Out,
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
  ];
  const sequence: AnimationSequence = [];
  for (const part of parts) {
    if (!part.els.length) continue;
    const keyframes: Record<string, number[]> = {};
    for (const key of Object.keys(part.to))
      keyframes[key] =
        reduced && key !== "opacity"
          ? [part.to[key], part.to[key]]
          : [part.from[key], part.to[key]];
    sequence.push([
      part.els,
      keyframes,
      reduced
        ? { at: part.at, duration: 0.2 }
        : { at: part.at, duration: part.duration, ease: part.ease },
    ]);
  }
  return sequence;
}

const fadeOut = (scope: HTMLElement): AnimationSequence => [
  [scope, { opacity: [1, 0] }, { at: 0, duration: PICK_TABLE.fadeOut / 1000 }],
];

function PickTable() {
  const t = useTranslations("pickCard");
  const tPick = useTranslations("room.pick");
  const tErrors = useTranslations("common.errors");
  const lang = useLocale() as Lang;
  const withNames = useWithNames();
  const displayName = useDisplayName();
  const { view, code, playerById } = useRoomContext();
  const pick = view.pick as NonNullable<RoomView["pick"]>;
  const target = playerById(pick.targetId);
  const phone = useMedia(PHONE);
  const wide = useMedia(WIDE);
  const width = useCardWidth(phone);
  const started = useStepStarted();
  const index = useCharacterIndex(lang, !pick.confirmed);
  const items = index.data ?? (index.isError ? [] : undefined);
  const typedTheme = view.theme?.set === null;

  // the card, as the player left it
  const [content, setContent] = useState<CardContent>({ kind: "empty" });
  const [focused, setFocused] = useState(false);
  const [libraryUploads, setLibraryUploads] = useState(0);
  const [autoFocus] = useState(
    () => !window.matchMedia(PHONE).matches && focusIsFree(),
  );

  // Out of time: the deadline passed while the card was still open. The view
  // that follows (the server's TIMEOUT) confirms every card, so remember
  // whether this one was confirmed before it.
  const seen = useRef({ deadline: null as number | null, open: false });
  if (view.phase === "picking" && view.deadline !== null)
    seen.current.deadline = view.deadline;
  const pastDeadline = usePast(seen.current.deadline);
  const confirmedEarly = useRef(false);
  if (pick.confirmed && !pastDeadline) confirmedEarly.current = true;
  if (!pick.confirmed && !pastDeadline) seen.current.open = true;
  const timeUp = pastDeadline && seen.current.open && !confirmedEarly.current;
  const state: PickCardState = timeUp
    ? "timeUp"
    : pick.confirmed
      ? "confirmed"
      : "editing";
  const editing = state === "editing";

  const draft = usePickDraft({
    code,
    pick,
    content,
    setContent,
    focused,
    deadline: seen.current.deadline,
    items,
    active: editing && view.phase === "picking",
  });

  // Random: a draw still on its way no longer applies once the card changes
  const { run, pending: rolling } = useAction();
  const { act, pending: confirming } = useRoomAction();
  const rollId = useRef(0);
  const [rolls, setRolls] = useState(0);
  const [noHistory, setNoHistory] = useState(false);
  const change = useCallback(
    (next: CardContent) => {
      if (!editing) return; // a late upload or crop after the card froze
      rollId.current++;
      setContent(next);
    },
    [editing],
  );
  const drawnId =
    content.kind === "picked" && content.via === "random"
      ? content.card.characterId
      : null;
  const roll = async () => {
    const id = ++rollId.current;
    setRolls((n) => n + 1);
    draft.drawing();
    const r = await run(() => randomPick(code, drawnId ?? undefined));
    // the server saved the draw as the draft, even when the card moved on
    const kept = id === rollId.current;
    draft.drawn(
      r.ok
        ? { characterId: r.data.id, name: r.data.name, imageUrl: null }
        : null,
      kept,
    );
    if (!kept) return;
    if (r.ok)
      setContent({ kind: "picked", card: toCard(r.data), via: "random" });
    else if (r.error === "not_enough_picks") setNoHistory(true);
  };
  // the "Like this pick?" bubble waits for the picture's flip
  const [settled, setSettled] = useState<string | null>(null);
  useEffect(() => {
    if (!drawnId) return;
    const id = window.setTimeout(() => setSettled(drawnId), FLIP_MS);
    return () => window.clearTimeout(id);
  }, [drawnId]);

  const uploading =
    (content.kind === "new" && content.uploading) || libraryUploads > 0;
  const busy = !editing || !started || rolling || confirming || uploading;
  const filled =
    content.kind === "picked" ||
    content.kind === "new" ||
    (content.kind === "typing" && content.text.trim() !== "");

  const confirm = async () => {
    const card =
      content.kind === "picked"
        ? { characterId: content.card.characterId }
        : content.kind === "typing" && content.preview
          ? { characterId: content.preview[0] }
          : content.kind === "typing"
            ? { name: content.text.trim() }
            : content.kind === "new"
              ? { name: content.name.trim() }
              : null;
    if (!card) return;
    rollId.current++;
    draft.pause(true);
    // a new name's picture comes from the stored draft: make sure it is there
    if ("name" in card) await draft.flush();
    const r = await act(() => confirmCard(code, card));
    // accepted: the card was in before the clock ran out, even if the answer came after
    if (r.ok) confirmedEarly.current = true;
    else draft.pause(false);
  };

  const onLibraryImage = async (characterId: string, image: Blob) => {
    setLibraryUploads((n) => n + 1);
    try {
      const form = new FormData();
      form.set("id", characterId);
      form.set("image", image, "picture.webp");
      const r = await replaceCharacterImage(form);
      if (!r.ok) throw new Error(r.error);
    } finally {
      setLibraryUploads((n) => n - 1);
    }
  };

  // What the card shows. Once the server has the pick, a card left empty
  // (the clock drew one) flips to it, and a half-typed name shows the
  // character it became. Out of time, a card changed after its last save
  // shows the saved draft the server picked; anything else stays as the
  // player left it.
  const shown: CardContent =
    pick.character &&
    (content.kind === "empty" ||
      content.kind === "typing" ||
      (timeUp && differs(pick.character, content)))
      ? {
          kind: "picked",
          card: pick.character,
          via: content.kind === "empty" && timeUp ? "random" : "restore",
        }
      : content;

  // the hand: 5 of the theme's 8, drawn for this viewer and this match
  const hand = usePickHand(view.theme, lang);
  const cards = useMemo(
    () => drawHand(hand.data ?? [], `${view.youId}:${view.round}`),
    [hand.data, view.youId, view.round],
  );

  // the entrance plays from the pick entrance beat; joined later, it is done
  const entranceAt = beatOf(showIn(view, "theme"), "entrance")?.startsAt ?? 0;
  const scope = useStageTimeline<HTMLDivElement>({
    startsAt: entranceAt,
    build: buildEntrance,
    deps: [cards.length, wide, typedTheme],
  });
  // the cast's first beat holds the table, then it fades
  const picked = beatOf(showIn(view, "cast"), "picked");
  const root = useStageTimeline<HTMLDivElement>({
    startsAt: picked ? picked.until - PICK_TABLE.fadeOut : null,
    build: fadeOut,
    deps: [],
  });

  if (!target) return null;
  const targetName = withNames((n) => t("cardTitle", { name: n(target) }));

  return (
    <div ref={root} className="relative">
      <div
        ref={scope}
        style={{ "--pick-w": `${width}px` } as CSSProperties}
        className="flex flex-col items-center gap-4 sm:gap-[22px] sm:pt-1"
      >
        <h1
          data-t="title"
          style={{ opacity: 0, transform: "translateY(10px)" }}
          className="max-w-full text-balance text-center font-bold font-display text-[21px] tracking-[-0.015em] sm:text-[28px]"
        >
          {targetName}
        </h1>

        <div className="flex flex-col items-center gap-3.5 lg:flex-row lg:gap-10">
          <div aria-hidden className="hidden w-[210px] lg:block" />
          <div
            data-t="card"
            style={{
              opacity: 0,
              transform: "translateY(30px) scale(0.8) rotate(-5deg)",
            }}
            // over the actions: the picture's tray hangs over them
            className="relative z-10"
          >
            <PickCard
              value={shown}
              onChange={change}
              lang={lang}
              targetName={displayName(target, false)}
              state={state}
              stamp={timeUp}
              onNewImage={(image) => uploadDraftImage(code, image)}
              onLibraryImage={onLibraryImage}
              autoFocus={autoFocus}
              onFocusChange={setFocused}
              className="w-[var(--pick-w)] sm:w-[var(--pick-w)]"
            />
            {drawnId ? (
              <DrawFeedback
                key={`feedback-${drawnId}`}
                code={code}
                characterId={drawnId}
                show={editing && settled === drawnId && !busy}
                onDislike={roll}
              />
            ) : null}
          </div>

          <m.div
            initial={false}
            animate={{ opacity: editing ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className={cn("lg:w-[210px]", !editing && "pointer-events-none")}
          >
            <div
              data-t="actions"
              style={{
                opacity: 0,
                transform: wide ? "translateX(20px)" : undefined,
              }}
              className="flex flex-col items-center gap-2.5 lg:items-start lg:gap-3.5"
            >
              <div className="flex flex-wrap items-center justify-center gap-2.5 lg:flex-col lg:items-start lg:gap-3.5">
                <button
                  type="button"
                  disabled={busy || !filled}
                  onClick={confirm}
                  className={keyClass("yes", {
                    className:
                      "h-14 px-[22px] text-[19px] sm:h-16 sm:px-[30px] sm:text-[21px] [&_svg]:size-[22px]",
                  })}
                >
                  <Check strokeWidth={2.5} aria-hidden />
                  {t("confirmCard")}
                </button>
                {/* a theme the host typed has no past picks to draw from */}
                {typedTheme ? null : (
                  <button
                    type="button"
                    disabled={busy || noHistory}
                    title={tPick("randomHint")}
                    onClick={roll}
                    className="mb-1.5 inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-pill border-[1.5px] border-line-strong bg-surface px-[18px] font-semibold text-[15px] text-ink transition-[translate,opacity] duration-150 ease-soft hover:-translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[18px]"
                  >
                    <m.span
                      aria-hidden
                      className="inline-flex"
                      animate={{ rotate: rolls * 360 }}
                      transition={{ duration: dur.slow, ease: ease.soft }}
                    >
                      <Dices strokeWidth={1.75} />
                    </m.span>
                    {drawnId ? tPick("randomAgain") : tPick("random")}
                  </button>
                )}
              </div>
              {noHistory && !typedTheme ? (
                <p className="max-w-[240px] text-balance text-center font-medium text-[13px] text-ink-muted lg:max-w-[200px] lg:text-left">
                  {tErrors("not_enough_picks")}
                </p>
              ) : null}
              <small className="hidden max-w-[190px] gap-1.5 font-semibold text-[13px] text-ink-muted leading-[1.4] lg:flex">
                <span aria-hidden>⏱</span>
                <span>{t("rule")}</span>
              </small>
            </div>
          </m.div>
        </div>

        <PickHand
          cards={cards}
          theme={view.theme?.[lang] ?? ""}
          phone={phone}
          open={editing}
          timeUp={timeUp}
          onPick={(card) =>
            change({ kind: "picked", card: toCard(card), via: "hand" })
          }
        />
        <DoneRow
          players={view.players}
          confirmedIds={pick.confirmedIds}
          show={state === "confirmed"}
        />
      </div>
    </div>
  );
}
