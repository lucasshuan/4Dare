"use client";

// The stage: one board at a time, in its owner's colour, as they laid it out.
// Each photo pulses in turn while they talk (voice or chat). Everyone else
// reacts: the emoji float up on every screen and count for the crowd's prize,
// not the vote. The owner ends it ("Done talking") whenever they like.
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { keyClass } from "@/components/ui/button";
import { useStepStarted } from "@/features/room/match-frame";
import { LU_CLOCKS, REACT_MAX } from "@/game/lineup/rules";
import { REACTIONS } from "@/game/lineup/types";
import { useDisplayName } from "@/lib/names";
import { subscribeReactions } from "@/lib/realtime";
import { onSeat, seatColor } from "@/lib/seats";
import { useGameOption } from "@/lib/settings";
import { endPresentation } from "@/server/actions";
import { BoardView, FitBoard } from "./board";
import { useLineup, useLuAction } from "./use-lineup";

/** Reactions go out in small batches: one request this often at most. */
const BATCH_MS = 1200;
/** No more than this many emoji in the air at once. */
const MAX_FLYING = 24;

interface Flying {
  id: number;
  emoji: string;
  x: number;
}

export function PresentStage() {
  const t = useTranslations("lineup.stage");
  const name = useDisplayName();
  const { lu, me, code, playerById } = useLineup();
  const { run, pending } = useLuAction();
  const started = useStepStarted();
  const hide = useGameOption("lineup", "hideReactions");
  const ownerId = lu.order[lu.showing];
  const owner = playerById(ownerId);
  const board = ownerId ? lu.boards[ownerId] : undefined;
  const mine = ownerId === me.id;

  // each photo in the spotlight in turn, faster with more of them
  const cards = board?.stickers.map((s) => s.c) ?? [];
  const [hot, setHot] = useState(0);
  useEffect(() => {
    if (cards.length < 2) return;
    const every = Math.min(
      3000,
      Math.max(1200, LU_CLOCKS.present / cards.length),
    );
    const id = window.setInterval(() => setHot((h) => h + 1), every);
    return () => window.clearInterval(id);
  }, [cards.length]);

  // emoji in the air: yours at once, everyone else's as they arrive
  const [flying, setFlying] = useState<Flying[]>([]);
  const seq = useRef(0);
  const fly = useCallback(
    (counts: number[]) => {
      if (hide) return;
      const add: Flying[] = [];
      counts.forEach((n, k) => {
        for (let j = 0; j < Math.min(n, 6); j++)
          add.push({
            id: seq.current++,
            emoji: REACTIONS[k],
            x: 10 + Math.random() * 80,
          });
      });
      if (!add.length) return;
      setFlying((f) => [...f, ...add].slice(-MAX_FLYING));
      window.setTimeout(
        () => setFlying((f) => f.filter((x) => !add.includes(x))),
        1800,
      );
    },
    [hide],
  );
  useEffect(
    () =>
      subscribeReactions(code, (p) => {
        if (p.board === ownerId && Array.isArray(p.counts)) fly(p.counts);
      }),
    [code, ownerId, fly],
  );

  // your taps, counted here and sent in batches
  const batch = useRef<number[]>(REACTIONS.map(() => 0));
  const [sent, setSent] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const flush = useCallback(
    (board: string) => {
      timer.current = undefined;
      const counts = batch.current;
      batch.current = REACTIONS.map(() => 0);
      if (!counts.some(Boolean)) return;
      void fetch(`/api/rooms/${code}/react`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ board, counts }),
        keepalive: true,
      }).catch(() => {});
    },
    [code],
  );
  // a new board starts the allowance over; what was still in the batch goes
  // to the board it was for
  useEffect(() => {
    setSent(0);
    return () => {
      window.clearTimeout(timer.current);
      flush(ownerId);
    };
  }, [flush, ownerId]);
  const left = Math.max(0, Math.min(lu.reactLeft, REACT_MAX - sent));
  const react = (k: number) => {
    if (left <= 0) return;
    setSent((n) => n + 1);
    batch.current[k] += 1;
    fly(REACTIONS.map((_, j) => (j === k ? 1 : 0)));
    timer.current ??= window.setTimeout(() => flush(ownerId), BATCH_MS);
  };

  if (!owner || !board) return null;
  const total = (lu.reactions[ownerId] ?? []).reduce((a, b) => a + b, 0);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between gap-3">
        <m.span
          key={ownerId}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex h-11 items-center gap-2.5 whitespace-nowrap rounded-pill pr-4.5 pl-1.5 font-display font-extrabold text-[clamp(16px,2.4vw,20px)] shadow-card"
          style={{
            background: seatColor(owner.colorSlot),
            color: onSeat(owner.colorSlot),
          }}
        >
          <Avatar avatar={owner.avatar} size={32} />
          {mine ? t("yourTurn") : t("talk", { name: name(owner, false) })}
        </m.span>
        <span className="rounded-pill bg-surface px-3 py-1.5 font-mono text-[13px] text-ink shadow-card">
          {t("board", { n: lu.showing + 1, of: lu.order.length })}
        </span>
      </div>

      <div className="relative w-[min(90vw,calc((100dvh-var(--dock,0px)-280px)*0.6667),440px)] min-w-[220px]">
        <FitBoard>
          <BoardView
            board={board}
            cards={lu.cards}
            tags={lu.tags}
            hot={cards.length ? cards[hot % cards.length] : null}
          />
        </FitBoard>
        {total > 0 ? (
          <span className="absolute -top-3 -right-3 rounded-pill bg-surface px-2.5 py-1 font-mono text-[14px] shadow-card">
            {(lu.reactions[ownerId] ?? []).map((n, k) =>
              n ? (
                <span key={REACTIONS[k]} className="mr-1 last:mr-0">
                  {REACTIONS[k]}
                  {n}
                </span>
              ) : null,
            )}
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-0 overflow-visible">
          <AnimatePresence>
            {flying.map((f) => (
              <m.span
                key={f.id}
                className="absolute bottom-0 text-[clamp(28px,5vw,40px)]"
                style={{ left: `${f.x}%` }}
                initial={{ y: 0, opacity: 0, scale: 0.6 }}
                animate={{ y: -260, opacity: [0, 1, 1, 0], scale: 1.1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.7, ease: "easeOut" }}
              >
                {f.emoji}
              </m.span>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {mine ? (
        <button
          type="button"
          disabled={pending || !started}
          onClick={() => run(() => endPresentation(code))}
          className={keyClass("yes", { className: "h-14 px-8 text-lg" })}
        >
          {t("done")}
        </button>
      ) : lu.dealtIds.includes(me.id) && !me.away ? (
        <div className="flex flex-col items-center gap-1.5">
          <div className="inline-flex gap-2 rounded-pill bg-surface p-2 shadow-pop">
            {REACTIONS.map((emoji, k) => (
              <button
                key={emoji}
                type="button"
                disabled={!started || left <= 0}
                onClick={() => react(k)}
                aria-label={t(`react.${k}`)}
                className="grid size-11 place-items-center rounded-pill bg-sunken text-[23px] transition-transform active:scale-90 disabled:opacity-40 sm:size-13 sm:text-[28px]"
              >
                {emoji}
              </button>
            ))}
          </div>
          <span className="font-semibold text-[12px] text-ink-muted">
            {t("reactLeft", { n: left })}
          </span>
        </div>
      ) : null}
    </div>
  );
}
