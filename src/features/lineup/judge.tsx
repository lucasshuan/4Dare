"use client";

// The secret vote: the boards one at a time in the deck, opening on yours. A
// tap on the board in the middle pins your face to it: that's your vote, your
// own board included. Nobody sees who voted for whom until the tally, only
// who has voted. The tiebreak is the same deck with only the tied boards, for
// those whose vote went elsewhere.
import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { useStepStarted } from "@/features/room/match-frame";
import type { Lang } from "@/game/types";
import { useDisplayName } from "@/lib/names";
import { onSeat, seatColor } from "@/lib/seats";
import { judgeBoard } from "@/server/actions";
import { BoardView, FitBoard } from "./board";
import { BoardDeck, type DeckItem } from "./deck";
import { useLineup, useLuAction } from "./use-lineup";

export function JudgeScreen() {
  const t = useTranslations("lineup.judge");
  const lang = useLocale() as Lang;
  const name = useDisplayName();
  const { lu, me, code, view, playerById } = useLineup();
  const { run, pending } = useLuAction();
  const started = useStepStarted();
  const tie = view.phase === "tiebreak" ? lu.tie : null;
  const owners = tie
    ? tie.among
    : lu.dealtIds.filter((id) => (lu.hands[id]?.length ?? 0) > 0);
  const voting = tie
    ? tie.voterIds.includes(me.id)
    : lu.dealtIds.includes(me.id) && !me.away;
  const yours = tie ? tie.yours : (lu.vote?.yours ?? null);
  const voted = tie ? tie.votedIds : (lu.vote?.votedIds ?? []);
  const of = tie ? tie.voterIds.length : lu.dealtIds.length;
  const myColor = seatColor(me.colorSlot);

  const items: DeckItem[] = owners.flatMap((id) => {
    const owner = playerById(id);
    const board = lu.boards[id];
    if (!owner || !board) return [];
    const pinned = yours === id;
    return [
      {
        id,
        mark: pinned ? myColor : null,
        slide: (
          <FitBoard>
            <BoardView
              board={board}
              cards={lu.cards}
              tags={lu.tags}
              owner={owner}
              glow={pinned ? myColor : null}
            >
              {null}
            </BoardView>
            {pinned ? (
              <m.span
                initial={{ scale: 2, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 18 }}
                className="absolute -top-[3%] -right-[4%] z-[4] grid size-[13%] place-items-center rounded-pill shadow-[0_8px_14px_rgba(0,0,0,0.32),inset_0_-3px_0_rgba(0,0,0,0.2)]"
                style={{
                  background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${myColor} 55%, #ffffff), ${myColor} 60%)`,
                }}
              >
                <Avatar
                  avatar={me.avatar}
                  size={28}
                  className="size-[70%] ring-2 ring-white"
                />
              </m.span>
            ) : null}
          </FitBoard>
        ),
        cap: (
          <span className="flex max-w-[86vw] flex-wrap items-center justify-center gap-2 text-center">
            <b className="font-bold font-chalk text-[clamp(18px,2.6vw,24px)]">
              {board.name || t("noName")}
            </b>
            <span className="font-semibold text-ink-muted text-sm">
              {owner.isYou ? t("yourTeam") : name(owner, false)}
            </span>
            {pinned ? (
              <span
                className="inline-flex h-6 items-center rounded-pill px-2.5 font-bold text-[12px]"
                style={{ background: myColor, color: onSeat(me.colorSlot) }}
              >
                {t("yourVote")}
              </span>
            ) : null}
          </span>
        ),
      },
    ];
  });
  const start = Math.max(0, owners.indexOf(me.id));

  return (
    <div className="flex w-full flex-col items-center gap-2 [--deck-chrome:330px]">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="font-bold text-[13px] text-ink-muted uppercase tracking-[0.08em]">
          {tie ? t("tieKicker") : t("kicker")}
        </span>
        <h2 className="m-0 max-w-[90vw] text-balance font-display font-extrabold text-[clamp(20px,3.4vw,30px)] leading-tight">
          {tie ? t("tieTitle") : t("title")}
        </h2>
        {lu.mission ? (
          <p className="m-0 max-w-[90vw] text-balance font-semibold text-[14px] text-ink-muted">
            {lu.mission.text[lang]}
          </p>
        ) : null}
      </div>
      <BoardDeck
        items={items}
        start={start}
        onPick={(i) => {
          const id = owners[i];
          if (!voting || !started || !id || id === yours) return;
          void run(() => judgeBoard(code, id));
        }}
      />
      <span className="font-semibold text-ink-muted text-sm">
        {voting
          ? pending
            ? t("sending")
            : yours
              ? t("change")
              : t("tap")
          : t("tieWait")}
        {" · "}
        {t("voted", { n: voted.length, of })}
      </span>
    </div>
  );
}
