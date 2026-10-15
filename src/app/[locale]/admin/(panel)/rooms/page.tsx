import type { Metadata } from "next";
import { RoomsScreen } from "@/features/admin/rooms/rooms-screen";
import type { GameKey } from "@/game/games";
import { adminGames } from "@/server/admin/games";
import { adminRooms } from "@/server/admin/rooms";
import { adminOnly } from "@/server/auth/roles";

export const metadata: Metadata = { title: "Salas" };

/** The open rooms. */
export default async function AdminRoomsPage() {
  await adminOnly();
  const [rooms, games] = await Promise.all([adminRooms(), adminGames()]);
  const names = Object.fromEntries(
    games.map((g) => [g.key, g.names.pt]),
  ) as Record<GameKey, string>;
  return <RoomsScreen rooms={rooms} names={names} />;
}
