"use client";

// Channel 2 in the booth: every board being made, live, like security
// cameras. Boards are saved quietly, so the presenter reads the room a bit
// more often while they watch.
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useDisplayName } from "@/lib/names";
import { BoardView, FitBoard } from "../board";
import { useLineup } from "../use-lineup";

const EVERY_MS = 3000;

export function CamGrid() {
  const t = useTranslations("lineup.host.cams");
  const name = useDisplayName();
  const { lu, players, refresh } = useLineup();
  useEffect(() => {
    const id = window.setInterval(() => void refresh(), EVERY_MS);
    return () => window.clearInterval(id);
  }, [refresh]);
  return (
    <section aria-label={t("title")} className="flex w-full flex-col gap-3">
      <div className="grid w-full max-w-[1000px] grid-cols-2 gap-3 self-center sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
        {players.map((p, k) => {
          const board = lu.boards[p.id];
          return (
            <figure
              key={p.id}
              className="m-0 flex flex-col gap-1.5 rounded-[14px] bg-[#16302a] p-2 text-chalk shadow-card"
            >
              <figcaption className="flex items-center justify-between font-bold font-mono text-[11px]">
                <span>{t("cam", { n: k + 1 })}</span>
                <span className="inline-flex items-center gap-1">
                  <i className="block size-2 animate-pulse rounded-pill bg-wax" />
                  {t("rec")}
                </span>
              </figcaption>
              {board ? (
                <FitBoard>
                  <BoardView board={board} cards={lu.cards} tags={lu.tags} />
                </FitBoard>
              ) : (
                <div className="grid aspect-[2/3] place-items-center text-center text-[12px] opacity-70">
                  {t("empty")}
                </div>
              )}
              <span className="truncate text-center font-semibold text-[12px]">
                {name(p, false)}
              </span>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
