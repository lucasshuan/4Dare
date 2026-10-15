import "server-only";
import { getTranslations } from "next-intl/server";
import { GAME_KEYS, GAME_SEATS, type GameKey } from "@/game/games";
import { GameError, LANGS, type Lang, type Localized } from "@/game/types";
import { adminOnly } from "@/server/auth/roles";
import { getBackend } from "../backend";
import type { BankKind, Banks } from "../backend/admin-types";
import { overview } from "./overview";

/** Each game's messages under home.games (as GAME_INFO in features/create/game-info.tsx). */
const MESSAGES = {
  "who-am-i": "whoAmI",
  impostor: "impostor",
  lineup: "whatFor",
} as const satisfies Record<GameKey, string>;

/** A game as the panel's game pages show it. */
export interface AdminGame {
  key: GameKey;
  names: Localized;
  pitch: string;
  matches: number;
  avgSec: number | null;
  last: number | null;
  /** Rooms open now on this game. */
  rooms: number;
  seats: { min: number; max: number };
}

/** Every game, with its numbers (admin only). */
export async function adminGames(): Promise<AdminGame[]> {
  await adminOnly();
  const [stats, rooms, texts] = await Promise.all([
    overview(),
    getBackend().rooms.listActive(0),
    Promise.all(
      LANGS.map((l) => getTranslations({ locale: l, namespace: "home.games" })),
    ),
  ]);
  return GAME_KEYS.map((key) => {
    const s = stats.games.find((g) => g.game === key);
    const m = MESSAGES[key];
    const names = Object.fromEntries(
      LANGS.map((l, i) => [l, texts[i](`${m}.name`)]),
    ) as Localized;
    return {
      key,
      names,
      pitch: texts[LANGS.indexOf("pt" as Lang)](`${m}.pitch`),
      matches: s?.matches ?? 0,
      avgSec: s?.avgSec ?? null,
      last: s?.last ?? null,
      rooms: rooms.filter((r) => r.game === key).length,
      seats: GAME_SEATS[key],
    };
  });
}

/** Every row of the game banks (admin only). */
export async function adminBanks(): Promise<Banks> {
  await adminOnly();
  return getBackend().admin.banks();
}

/** Puts a bank row on or off, with the change in admin_audit. */
export async function setBankLive(
  kind: BankKind,
  id: string,
  live: boolean,
): Promise<void> {
  const me = await adminOnly();
  const { admin } = getBackend();
  const before = await admin.setLive(kind, id, live);
  if (before === null) throw new GameError("not_found");
  if (before === live) return;
  await admin.audit({
    actor: me.id,
    action: live ? "bank.live" : "bank.hide",
    target: `${kind}:${id}`,
    before: { live: before },
    after: { live },
  });
}
