import type { Metadata } from "next";
import { GamesScreen } from "@/features/admin/games/games-screen";
import { configState } from "@/server/admin/config";
import { adminGames } from "@/server/admin/games";
import { adminOnly } from "@/server/auth/roles";
import { getBackend } from "@/server/backend";

export const metadata: Metadata = { title: "Jogos" };

/** Every game, and the versions of the panel's values. */
export default async function AdminGamesPage() {
  await adminOnly();
  const [games, { versions }] = await Promise.all([
    adminGames(),
    configState(),
  ]);
  const ids = [
    ...new Set(versions.flatMap((v) => (v.author ? [v.author] : []))),
  ];
  const people = await getBackend().profiles.byIds(ids);
  const authors = Object.fromEntries(
    people.map((p) => [p.id, p.name ?? `@${p.handle}`]),
  );
  return <GamesScreen games={games} versions={versions} authors={authors} />;
}
