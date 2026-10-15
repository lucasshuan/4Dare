import type { Metadata } from "next";
import { MixerScreen } from "@/features/admin/music/mixer-screen";
import { adminGames } from "@/server/admin/games";
import { adminOnly } from "@/server/auth/roles";

export const metadata: Metadata = { title: "Mesa de som" };

/** The sound desk: every take and sound, with their levels and loops. */
export default async function AdminMusicPage() {
  await adminOnly();
  const games = await adminGames();
  return (
    <MixerScreen
      games={
        Object.fromEntries(games.map((g) => [g.key, g.names.pt])) as Record<
          (typeof games)[number]["key"],
          string
        >
      }
    />
  );
}
