"use client";

import { Check, Undo2 } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { keyClass } from "@/components/ui/button";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { useStepStarted } from "@/features/room/match-frame";
import type { ImpAskedView, PlayerId, PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";
import { seatColor, seatSoft } from "@/lib/seats";
import { accuse, pointAt } from "@/server/actions";
import { AnswerChip } from "./answers-view";
import { useQuestionBank } from "./use-questions";

const spring = { type: "spring", stiffness: 380, damping: 30 } as const;

/** A player's answers, newest round first: this round's big, the earlier ones small. */
function Answers({
  id,
  asked,
  round,
}: {
  id: PlayerId;
  asked: ImpAskedView[];
  round: number;
}) {
  const bank = useQuestionBank();
  const shown = asked.filter((a) => a.answers);
  const now = shown.filter((a) => a.round === round);
  const before = shown.filter((a) => a.round < round);
  const of = (a: ImpAskedView) =>
    a.answers?.find((x) => x.byId === id)?.answer ?? null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        {now.map((a) => (
          <AnswerChip
            key={a.question.id}
            question={a.question}
            bank={bank?.get(a.question.id) ?? null}
            answer={of(a)}
          />
        ))}
      </div>
      {before.length ? (
        <div className="flex flex-wrap gap-1 opacity-60">
          {before.map((a) => (
            <AnswerChip
              key={a.question.id}
              question={a.question}
              bank={bank?.get(a.question.id) ?? null}
              answer={of(a)}
              className="h-5 min-w-5 text-[11px]"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Faces of who points at (faded) or voted for (ringed) a player. */
function Pointers({ ids, voted }: { ids: PlayerId[]; voted: PlayerId[] }) {
  const { playerById } = useRoomContext();
  if (!ids.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => {
        const p = playerById(id);
        if (!p) return null;
        const firm = voted.includes(id);
        return (
          <m.span
            key={id}
            layout
            initial={{ scale: 0 }}
            animate={{ scale: 1, opacity: firm ? 1 : 0.45 }}
            transition={spring}
            className="flex"
          >
            <Avatar
              avatar={p.avatar}
              seat={firm ? p.colorSlot : null}
              size={20}
            />
          </m.span>
        );
      })}
    </div>
  );
}

function SuspectCard({
  p,
  out,
  pointing,
  voting,
  mine,
  firm,
  canAct,
  onPoint,
}: {
  p: PlayerView;
  out: { impostor: boolean; left: boolean } | null;
  pointing: PlayerId[];
  voting: PlayerId[];
  mine: boolean;
  firm: boolean;
  canAct: boolean;
  onPoint: () => void;
}) {
  const t = useTranslations("impostor.talk");
  const name = useDisplayName();
  const { view } = useRoomContext();
  const imp = view.imp;
  const still = useReducedMotion() ?? false;
  const disabled = !canAct || !!out || p.isYou;
  return (
    <m.li
      layout={!still}
      animate={{ opacity: out ? 0.5 : 1, scale: mine ? 1.02 : 1 }}
      transition={spring}
      className="relative"
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={mine}
        onClick={onPoint}
        className={cn(
          "flex h-full w-full flex-col gap-2 rounded-lg border-[2.5px] bg-surface p-3 text-left shadow-card outline-none transition-[border-color,box-shadow] duration-200 ease-soft focus-visible:ring-2 focus-visible:ring-sky disabled:cursor-default",
          mine ? "border-ink shadow-pop" : "border-transparent",
        )}
        style={mine ? undefined : { borderColor: "transparent" }}
      >
        <span className="flex items-center gap-2.5">
          <Avatar avatar={p.avatar} seat={p.colorSlot} size={40} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-bold">{name(p, p.isYou)}</span>
            {out ? (
              <span
                className={cn(
                  "font-semibold text-xs",
                  out.left
                    ? "text-ink-muted"
                    : out.impostor
                      ? "text-no"
                      : "text-ink-muted",
                )}
              >
                {out.left
                  ? t("left")
                  : out.impostor
                    ? t("wasImpostor")
                    : t("wasNot")}
              </span>
            ) : voting.length ? (
              <span className="font-semibold text-no text-xs">
                {t("votes", { count: voting.length })}
              </span>
            ) : null}
          </span>
        </span>
        <span
          aria-hidden
          className="h-1 w-full rounded-pill"
          style={{
            backgroundColor: out ? "var(--line)" : seatSoft(p.colorSlot),
          }}
        />
        {imp ? <Answers id={p.id} asked={imp.asked} round={imp.round} /> : null}
        <Pointers ids={pointing} voted={voting} />
      </button>
      {firm ? (
        <span
          className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-pill text-white shadow-card"
          style={{ backgroundColor: seatColor(p.colorSlot) }}
        >
          <Check className="size-4" strokeWidth={3} />
        </span>
      ) : null}
    </m.li>
  );
}

/**
 * The talk and the vote: everyone's card with their answers. Tapping a card
 * points at it (free, everyone sees it); confirming the vote counts it and
 * cuts the clock; taking it back gives the time back.
 */
export function TalkStep() {
  const t = useTranslations("impostor.talk");
  const name = useDisplayName();
  const { view, code, me, playerById } = useRoomContext();
  const { act, pending } = useRoomAction();
  const started = useStepStarted();
  const imp = view.imp;
  const v = imp?.vote;
  // the pointing as just tapped, until the server's view has it
  const [guess, setGuess] = useState<{ target: PlayerId | null } | null>(null);
  if (!imp || !v) return null;
  const playing = imp.playingIds.includes(me.id);
  const point = guess ? guess.target : v.yourPoint;
  const voted = v.yourVote;
  const dealt = view.players.filter(
    (p) => imp.playingIds.includes(p.id) || imp.outs.some((o) => o.id === p.id),
  );
  const tap = async (id: PlayerId) => {
    if (voted) return;
    const next = point === id ? null : id;
    setGuess({ target: next });
    await act(() => pointAt(code, next));
    setGuess(null);
  };
  const target = point ? playerById(point) : undefined;
  const votes = v.votes.length;
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-balance font-bold font-display text-[clamp(28px,4vw,44px)] leading-tight tracking-[-0.015em]">
          {t("title", { count: imp.impostors })}
        </h1>
        <p className="font-medium text-ink-muted">
          {t("votesSoFar", { n: votes, total: imp.playingIds.length })}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(200px,240px))] sm:justify-center">
        {dealt.map((p) => {
          const out = imp.outs.find((o) => o.id === p.id) ?? null;
          return (
            <SuspectCard
              key={p.id}
              p={p}
              out={out}
              pointing={v.points
                .filter((x) => x.targetId === p.id)
                .map((x) => x.byId)}
              voting={v.votes
                .filter((x) => x.targetId === p.id)
                .map((x) => x.byId)}
              mine={point === p.id}
              firm={voted === p.id}
              canAct={playing && started && !voted}
              onPoint={() => tap(p.id)}
            />
          );
        })}
      </ul>
      {playing ? (
        <div className="sticky bottom-[calc(1rem+var(--dock))] z-10 flex justify-center">
          {voted ? (
            <button
              type="button"
              disabled={pending || !started}
              onClick={() => act(() => accuse(code, null))}
              className={keyClass("apricot", {
                pressed: true,
                className: "min-h-14 px-7 text-base",
              })}
            >
              <Undo2 className="size-5" strokeWidth={2.25} />
              {t("unvote", { name: name(playerById(voted) ?? me) })}
            </button>
          ) : target ? (
            <button
              type="button"
              disabled={pending || !started}
              onClick={() => act(() => accuse(code, target.id))}
              className={keyClass("no", {
                bounce: true,
                className: "min-h-14 px-8 text-lg",
              })}
            >
              <Check className="size-5" strokeWidth={2.5} />
              {t("confirm", { name: name(target) })}
            </button>
          ) : (
            <span className="rounded-pill bg-surface px-5 py-3 font-medium text-ink-muted text-sm shadow-card">
              {t("tapToPoint")}
            </span>
          )}
        </div>
      ) : (
        <p className="text-center font-medium text-ink-muted">
          {t("watching")}
        </p>
      )}
    </div>
  );
}
