import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameScreen } from "@/features/admin/games/game-screen";
import { isGameKey } from "@/game/games";
import { adminBanks, adminGames } from "@/server/admin/games";
import { adminPage } from "@/server/auth/roles";

export const metadata: Metadata = { title: "Jogo" };

/** A game's page: summary, music, clocks, room defaults, content and XP. */
export default async function AdminGamePage({
  params,
}: PageProps<"/[locale]/admin/games/[game]">) {
  await adminPage();
  const { game: key } = await params;
  if (!isGameKey(key)) notFound();
  const [games, banks] = await Promise.all([adminGames(), adminBanks()]);
  const game = games.find((g) => g.key === key);
  if (!game) notFound();
  return <GameScreen game={game} games={games} banks={banks} />;
}
