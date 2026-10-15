import type { Metadata } from "next";
import { LabScreen } from "@/features/admin/lab/lab-screen";
import type { LabScene } from "@/features/lab/scene";
import type { GameKey } from "@/game/games";
import { adminGames } from "@/server/admin/games";
import { labRooms, labScene, labScenes } from "@/server/admin/lab";
import { adminOnly } from "@/server/auth/roles";

export const metadata: Metadata = { title: "Laboratório" };

/** The lab: a match with bots on the real engine, at any moment, from any seat. */
export default async function AdminLabPage({
  searchParams,
}: PageProps<"/[locale]/admin/lab">) {
  await adminOnly();
  const { scene, room } = await searchParams;
  const id = typeof scene === "string" ? scene : null;
  const [games, rooms, scenes, stored] = await Promise.all([
    adminGames(),
    labRooms(),
    labScenes(),
    id ? labScene(id) : null,
  ]);
  const names = Object.fromEntries(
    games.map((g) => [g.key, g.names.pt]),
  ) as Record<GameKey, string>;
  return (
    <LabScreen
      key={stored?.id ?? "new"}
      names={names}
      rooms={rooms
        .filter((r) => r.players.length > 0)
        .map((r) => ({
          code: r.code,
          game: r.game,
          phase: r.phase,
          players: r.players.length,
        }))}
      scenes={scenes}
      room={typeof room === "string" ? room : null}
      initial={
        stored ? { ...(stored.params as LabScene), id: stored.id } : null
      }
    />
  );
}
