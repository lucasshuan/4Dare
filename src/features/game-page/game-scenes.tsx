"use client";

import { useTranslations } from "next-intl";
import { useGameName } from "@/features/create/game-info";
import type { GameKey } from "@/game/games";
import { ScenePlayer, type Script } from "./scene-player";
import { useImpostorScript } from "./scenes-impostor";
import { useLineupScript } from "./scenes-lineup";
import { useWhoAmIScript } from "./scenes-who-am-i";

const SCRIPTS: Record<GameKey, () => Script> = {
  "who-am-i": useWhoAmIScript,
  impostor: useImpostorScript,
  lineup: useLineupScript,
};

/** The game's match, played out in a pretend room beside its ranking. */
export function GameScenes({
  game,
  className,
}: {
  game: GameKey;
  className?: string;
}) {
  const t = useTranslations("home.gamePage.scenes");
  const gameName = useGameName();
  // one game per page, so the same hook runs on every render
  const script = SCRIPTS[game]();
  return (
    <ScenePlayer
      script={script}
      label={t("label", { game: gameName(game) })}
      className={className}
    />
  );
}
