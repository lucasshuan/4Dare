"use client";

// The Boards tab: a player's latest What for? boards, each as it stood at
// the vote, with its mission, what it cost and how it did. Read when the tab
// opens; drawn with the game's own board, in chalk unless "Plain letters".
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { BoardView, FitBoard } from "@/features/lineup/board";
import type { LuKeptBoard } from "@/game/lineup/record";
import type { LuBoard, LuCard, LuTag } from "@/game/lineup/types";
import { useGameOption } from "@/lib/settings";
import type { ProfileBoard } from "@/server/contract";

const ChalkFont = dynamic(() => import("@/features/lineup/chalk-font"));
const ChalkFontJa = dynamic(() => import("@/features/lineup/chalk-font-ja"));

/** A kept board in the shapes the game's board draws. */
function drawable(kept: LuKeptBoard) {
  const board: LuBoard = { name: kept.name, stickers: [], texts: kept.texts };
  const cards: Record<number, LuCard> = {};
  const tags: Record<number, LuTag> = {};
  kept.cards.forEach((c, i) => {
    board.stickers.push({ c: i, x: c.x, y: c.y, w: c.w, r: c.r });
    cards[i] = {
      id: c.id,
      name: c.name,
      origin: null,
      imageUrl: c.imageUrl,
      ...(c.emoji ? { emoji: c.emoji } : {}),
      ...(c.tint ? { tint: c.tint } : {}),
    };
    tags[i] = { by: null, price: c.price };
  });
  return { board, cards, tags };
}

function KeptBoard({ item }: { item: ProfileBoard }) {
  const t = useTranslations("profile.boards");
  const format = useFormatter();
  const { board, cards, tags } = useMemo(
    () => drawable(item.board),
    [item.board],
  );
  return (
    <li className="flex min-w-0 flex-col gap-2.5">
      <div className="relative">
        <FitBoard>
          <BoardView board={board} cards={cards} tags={tags} />
        </FitBoard>
        {item.won ? (
          <span className="absolute -top-2 -right-1 rotate-6 rounded-pill bg-butter px-2.5 py-1 font-bold text-[12px] text-ink shadow-card">
            🏆 {t("won")}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 px-1">
        {item.mission ? (
          <p className="m-0 line-clamp-2 font-semibold text-[13px] leading-snug">
            {item.mission}
          </p>
        ) : null}
        <p className="m-0 text-[12px] text-ink-muted">
          {t("line", { coins: item.spent, votes: item.votes })}
          {item.crowd ? ` · 😂 ${t("crowd")}` : ""}
          {" · "}
          {format.dateTime(item.at, { day: "numeric", month: "short" })}
        </p>
      </div>
    </li>
  );
}

export function BoardsPanel({ handle }: { handle: string }) {
  const t = useTranslations("profile.boards");
  const lang = useLocale();
  const plain = useGameOption("lineup", "plainLetters");
  const { data, isPending, isError } = useQuery({
    queryKey: ["profile-boards", handle, lang],
    queryFn: async () => {
      const res = await fetch(
        `/api/profiles/${encodeURIComponent(handle)}/boards?lang=${lang}`,
      );
      if (!res.ok) throw new Error(`boards: ${res.status}`);
      return ((await res.json()) as { boards: ProfileBoard[] }).boards;
    },
    staleTime: 60_000,
  });
  return (
    <div className="flex flex-col gap-4">
      {plain ? null : lang === "ja" ? <ChalkFontJa /> : <ChalkFont />}
      {isPending ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
          {[0, 1, 2].map((k) => (
            <li
              key={k}
              className="aspect-[2/3] animate-pulse rounded-lg bg-sunken"
            />
          ))}
        </ul>
      ) : isError || !data?.length ? (
        <p className="py-8 text-center text-ink-muted text-sm">{t("empty")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
          {data.map((b) => (
            <KeptBoard key={`${b.matchId}-${b.round}`} item={b} />
          ))}
        </ul>
      )}
    </div>
  );
}
