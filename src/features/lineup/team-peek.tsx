"use client";

// Someone's team so far, from their face at the auction table: the photos as
// they came, with what each cost, and the coins they still have.
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/dialog";
import { boardOf } from "@/game/lineup/rules";
import type { PlayerView } from "@/game/types";
import { useDisplayName } from "@/lib/names";
import { BoardView, FitBoard } from "./board";
import { useLineup } from "./use-lineup";

export function TeamPeek({
  player,
  onClose,
}: {
  player: PlayerView | null;
  onClose: () => void;
}) {
  const t = useTranslations("lineup.auction");
  const name = useDisplayName();
  const { lu } = useLineup();
  const hand = player ? (lu.hands[player.id] ?? []) : [];
  return (
    <Modal
      open={player !== null}
      onOpenChange={(open) => (open ? null : onClose())}
      title={player ? t("teamOf", { name: name(player, player.isYou) }) : ""}
      icon={player ? <Avatar avatar={player.avatar} size={28} /> : null}
    >
      {player ? (
        <div className="flex flex-col items-center gap-3 overflow-y-auto p-5">
          <span className="font-mono text-ink-muted">
            {t("has", { coins: lu.coins[player.id] ?? 0 })}
          </span>
          <FitBoard className="max-w-[min(340px,calc((100dvh-220px)*0.6667))]">
            <BoardView
              board={boardOf(undefined, hand)}
              cards={lu.cards}
              tags={lu.tags}
            />
          </FitBoard>
          {hand.length === 0 ? (
            <p className="m-0 text-ink-muted">{t("noTeam")}</p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
