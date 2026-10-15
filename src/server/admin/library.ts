import "server-only";
import { isTaste } from "@/game/tastes";
import { GameError } from "@/game/types";
import { adminOnly } from "@/server/auth/roles";
import { getBackend } from "../backend";
import type { AdminImage } from "../backend/admin-types";
import type { CatalogRow } from "../backend/community-types";
import { parseEntryId } from "../backend/seed-format";
import { browse, catalog } from "../catalog";
import type { LibraryPage, LibrarySort } from "../community-contract";

/** A page of characters, as the library's own search finds them. */
export async function libraryPage(input: {
  q: string;
  taste: string | null;
  sort: LibrarySort;
  offset: number;
}): Promise<LibraryPage> {
  await adminOnly();
  return browse(
    {
      q: String(input.q ?? "").slice(0, 80),
      taste: isTaste(input.taste) ? input.taste : null,
      sort: ["top", "new", "nopic"].includes(input.sort) ? input.sort : "top",
      need: null,
      offset: Math.max(0, Math.floor(Number(input.offset) || 0)),
    },
    "pt",
  );
}

const baseOf = (appId: string) => parseEntryId(appId)?.id ?? appId;

export interface CharacterFile {
  id: string;
  row: CatalogRow | null;
  images: AdminImage[];
}

/** A character and every picture it has, any status. */
export async function characterFile(appId: string): Promise<CharacterFile> {
  await adminOnly();
  if (typeof appId !== "string" || appId.length > 120)
    throw new GameError("invalid_input");
  const id = baseOf(appId);
  const [cat, images] = await Promise.all([
    catalog("pt"),
    getBackend().admin.characterImages(id),
  ]);
  return { id, row: cat.byId.get(id) ?? null, images };
}

export interface PendingPicture {
  id: string;
  url: string;
  characterId: string | null;
  name: string | null;
  authorName: string | null;
  authorGuest: number | null;
  createdBy: string | null;
}

/** The players' pictures still waiting on a look, oldest first. */
export async function pendingPictures(): Promise<PendingPicture[]> {
  await adminOnly();
  const [list, cat] = await Promise.all([
    getBackend().images.pending(120),
    catalog("pt"),
  ]);
  return list.map((p) => ({
    id: p.id,
    url: p.url,
    characterId: p.characterId,
    name: p.characterId ? (cat.byId.get(p.characterId)?.name ?? null) : null,
    authorName: p.author?.name ?? null,
    authorGuest: p.author?.isGuest ? (p.author.guestNumber ?? null) : null,
    createdBy: p.createdBy,
  }));
}

/** Lets a picture through, hides it or brings it back (never deletes it). */
export async function pictureStatus(
  id: string,
  to: "active" | "hidden",
): Promise<void> {
  const me = await adminOnly();
  const { images, admin } = getBackend();
  if (to !== "active" && to !== "hidden") throw new GameError("invalid_input");
  const p = await images.get(id);
  if (!p) throw new GameError("not_found");
  if (to === "active" && p.status === "pending")
    await images.approve(id, { by: "panel" });
  else await admin.setImageStatus(id, to);
  await admin
    .audit({
      actor: me.id,
      action: `picture.${to}`,
      target: id,
      before: p.status,
      after: to,
    })
    .catch(() => {});
}

export const MAP_TABLES = [
  "profiles",
  "match_players",
  "matches",
  "rooms",
  "characters",
  "character_names",
  "character_images",
  "character_aliases",
  "whoami_themes",
  "whoami_theme_starters",
  "impostor_questions",
  "lineup_missions",
  "workshop_suggestions",
  "workshop_votes",
  "user_badges",
  "player_reports",
] as const;

/** How many rows each main table holds. */
export async function dataMap(): Promise<Record<string, number>> {
  await adminOnly();
  return getBackend().admin.tableCounts(MAP_TABLES);
}
