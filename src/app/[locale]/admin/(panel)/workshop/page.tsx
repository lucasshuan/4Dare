import type { Metadata } from "next";
import { WorkshopScreen } from "@/features/admin/workshop/workshop-screen";
import type { GameKey } from "@/game/games";
import { adminGames } from "@/server/admin/games";
import { adminWorkshop } from "@/server/admin/workshop";
import { adminPage } from "@/server/auth/roles";

export const metadata: Metadata = { title: "Oficina" };

/** The Workshop, whole: suggestions, people and rules. */
export default async function AdminWorkshopPage() {
  await adminPage();
  const [data, games] = await Promise.all([adminWorkshop(), adminGames()]);
  const names = Object.fromEntries(
    games.map((g) => [g.key, g.names.pt]),
  ) as Record<GameKey, string>;
  return <WorkshopScreen data={data} names={names} />;
}
