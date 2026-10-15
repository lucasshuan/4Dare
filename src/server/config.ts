import "server-only";
import { unstable_cache } from "next/cache";
import type { GameKey } from "@/game/games";
import { cleanTunes, tunesFor } from "@/game/tunables";
import { setSiteTunes } from "@/game/tune";
import type { RoomConfig } from "@/game/types";
import { getBackend } from "./backend";
import type { ConfigVersion } from "./backend/admin-types";

/** The cache tag a save clears. */
export const CONFIG_TAG = "game-config";

const newest = unstable_cache(
  async () => getBackend().admin.config(),
  ["game-config"],
  { revalidate: 300, tags: [CONFIG_TAG] },
);

/**
 * The config in force, read (cached) and put in force for this server's reads
 * outside a match: room defaults and limits, which games are open. A stored
 * value the code no longer knows, or out of its range now, is dropped.
 */
export async function loadConfig(): Promise<ConfigVersion> {
  let c: ConfigVersion;
  try {
    c = await newest();
  } catch (e) {
    // the panel's values are a layer over the code: without them, the code's own
    console.warn("[config]", e instanceof Error ? e.message : e);
    c = {
      v: 0,
      values: { tunes: {}, scenes: {} },
      note: null,
      author: null,
      at: 0,
    };
  }
  const tunes = cleanTunes(c.values.tunes);
  setSiteTunes(tunes);
  return { ...c, values: { ...c.values, tunes } };
}

/** The copy a room of `game` takes between matches: its game's values and the shared ones. */
export async function roomConfig(game: GameKey): Promise<RoomConfig> {
  const c = await loadConfig();
  return { v: c.v, tunes: tunesFor(c.values.tunes, game) };
}
