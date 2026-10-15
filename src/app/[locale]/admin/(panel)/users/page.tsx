import type { Metadata } from "next";
import { UsersScreen } from "@/features/admin/people/users-screen";
import type { GameKey } from "@/game/games";
import { adminGames } from "@/server/admin/games";
import { adminUsers } from "@/server/admin/people";
import { adminOnly } from "@/server/auth/roles";

export const metadata: Metadata = { title: "Usuários" };

/** The accounts (guests live only in their cookie: they are not here). */
export default async function AdminUsersPage() {
  await adminOnly();
  const [users, games] = await Promise.all([adminUsers(), adminGames()]);
  const names = Object.fromEntries(
    games.map((g) => [g.key, g.names.pt]),
  ) as Record<GameKey, string>;
  return <UsersScreen users={users} names={names} />;
}
