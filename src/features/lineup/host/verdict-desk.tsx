"use client";

// The presenter's verdict: the boards in the deck, a tap pins one, then why
// (8 to 100 characters). The pick is kept as a draft as it changes, so if
// time runs out the board they had stands.
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { keyClass } from "@/components/ui/button";
import { useStepStarted } from "@/features/room/match-frame";
import { WHY } from "@/game/lineup/rules";
import type { Lang } from "@/game/types";
import { useDisplayName } from "@/lib/names";
import { giveVerdict } from "@/server/actions";
import { BoardView, FitBoard } from "../board";
import { BoardDeck, type DeckItem } from "../deck";
import { useLineup, useLuAction } from "../use-lineup";

export function VerdictDesk() {
  const t = useTranslations("lineup.host.verdict");
  const tj = useTranslations("lineup.judge");
  const lang = useLocale() as Lang;
  const name = useDisplayName();
  const { lu, code, playerById } = useLineup();
  const { run, pending } = useLuAction();
  const started = useStepStarted();
  const [pick, setPick] = useState<string | null>(lu.verdict?.for ?? null);
  const [why, setWhy] = useState(lu.verdict?.why ?? "");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const owners = lu.dealtIds.filter((id) => (lu.hands[id]?.length ?? 0) > 0);
  const draft = (ownerId: string, text: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => void giveVerdict(code, ownerId, text, false),
      600,
    );
  };
  const items: DeckItem[] = owners.flatMap((id) => {
    const owner = playerById(id);
    const board = lu.boards[id];
    if (!owner || !board) return [];
    return [
      {
        id,
        mark: pick === id ? "var(--butter)" : null,
        slide: (
          <FitBoard>
            <BoardView
              board={board}
              cards={lu.cards}
              tags={lu.tags}
              owner={owner}
              glow={pick === id ? "var(--butter)" : null}
            />
          </FitBoard>
        ),
        cap: (
          <span className="flex flex-wrap items-center justify-center gap-2 text-center">
            <b className="font-bold font-chalk text-[clamp(18px,2.6vw,24px)]">
              {board.name || tj("noName")}
            </b>
            <span className="font-semibold text-ink-muted text-sm">
              {name(owner, false)}
            </span>
            {pick === id ? (
              <span className="inline-flex h-6 items-center rounded-pill bg-butter px-2.5 font-bold text-[12px] text-on-butter">
                {t("pinned")}
              </span>
            ) : null}
          </span>
        ),
      },
    ];
  });
  const n = [...why.trim()].length;
  return (
    <div className="flex w-full flex-col items-center gap-3 [--deck-chrome:460px]">
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="m-0 font-display font-extrabold text-[clamp(22px,3.6vw,32px)] leading-tight">
          {t("title")}
        </h2>
        {lu.mission ? (
          <p className="m-0 max-w-[90vw] text-balance font-semibold text-[14px] text-ink-muted">
            {lu.mission.text[lang]}
          </p>
        ) : null}
      </div>
      <BoardDeck
        items={items}
        start={Math.max(0, pick ? owners.indexOf(pick) : 0)}
        onPick={(i) => {
          const id = owners[i];
          if (!id || !started) return;
          setPick(id);
          draft(id, why);
        }}
      />
      <span className="font-semibold text-ink-muted text-sm">{t("hint")}</span>
      <div className="flex w-full max-w-[560px] flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="sr-only">{t("why")}</span>
          <textarea
            value={why}
            rows={2}
            maxLength={WHY.max}
            placeholder={t("whyPlaceholder")}
            onChange={(e) => {
              setWhy(e.target.value);
              if (pick) draft(pick, e.target.value);
            }}
            className="w-full resize-none rounded-[16px] border-[1.5px] border-line-strong bg-surface px-4 py-3 font-semibold outline-none focus:border-ink"
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-muted">
            {n < WHY.min ? t("min") : `${n}/${WHY.max}`}
          </span>
          <button
            type="button"
            disabled={!pick || n < WHY.min || pending || !started}
            onClick={() => {
              window.clearTimeout(timer.current);
              if (pick) void run(() => giveVerdict(code, pick, why, true));
            }}
            className={keyClass("yes", { className: "h-12 px-6 text-base" })}
          >
            {t("give")}
          </button>
        </div>
      </div>
    </div>
  );
}
