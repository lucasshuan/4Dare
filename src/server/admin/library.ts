import "server-only";
import { CATEGORIES } from "@/game/categories";
import { isTaste } from "@/game/tastes";
import { GameError, LANGS } from "@/game/types";
import { adminOnly } from "@/server/auth/roles";
import { getBackend } from "../backend";
import type {
  AdminImage,
  CharacterInfo,
  CharacterPatch,
} from "../backend/admin-types";
import type { CatalogRow } from "../backend/community-types";
import { parseEntryId } from "../backend/seed-format";
import { browse, catalog, invalidateCatalog } from "../catalog";
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
  /** The site's view of it (null while it is hidden). */
  row: CatalogRow | null;
  info: CharacterInfo | null;
  images: AdminImage[];
}

/** A character and every picture it has, any status, hidden or not. */
export async function characterFile(appId: string): Promise<CharacterFile> {
  await adminOnly();
  if (typeof appId !== "string" || appId.length > 120)
    throw new GameError("invalid_input");
  const id = baseOf(appId);
  const { admin } = getBackend();
  const [cat, info, images] = await Promise.all([
    catalog("pt"),
    admin.characterInfo(id),
    admin.characterImages(id),
  ]);
  return { id, row: cat.byId.get(id) ?? null, info, images };
}

/** The characters taken out of the library. */
export async function hiddenCharacters() {
  await adminOnly();
  return getBackend().admin.hiddenCharacters();
}

/** The library's works, to pick a character's from. */
export async function originList() {
  await adminOnly();
  return getBackend().admin.origins();
}

const KINDS = ["fictional", "human"];
const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/**
 * Changes a character (the library is hand-fed: rows are updated, never
 * deleted; hiding takes it out of the site). The panel's audit keeps what it
 * was before.
 */
export async function editCharacter(
  appId: string,
  raw: CharacterPatch,
): Promise<void> {
  const me = await adminOnly();
  const id = baseOf(String(appId ?? ""));
  const { admin } = getBackend();
  const before = await admin.characterInfo(id);
  if (!before) throw new GameError("not_found");
  const patch: CharacterPatch = {};
  if (typeof raw.hidden === "boolean") patch.hidden = raw.hidden;
  if (raw.kind !== undefined)
    patch.kind = raw.kind && KINDS.includes(raw.kind) ? raw.kind : null;
  if (raw.category !== undefined)
    patch.category =
      raw.category && (CATEGORIES as readonly string[]).includes(raw.category)
        ? raw.category
        : null;
  if (raw.tastes !== undefined)
    patch.tastes = [...new Set((raw.tastes ?? []).filter(isTaste))];
  if (raw.originId !== undefined) patch.originId = text(raw.originId, 120);
  if (raw.customOrigin !== undefined)
    patch.customOrigin = text(raw.customOrigin, 120);
  if (raw.names !== undefined) {
    patch.names = [];
    for (const n of raw.names ?? []) {
      if (!(LANGS as readonly string[]).includes(n.lang)) continue;
      const name = text(n.name, 80);
      if (!name) continue;
      const aliases = [
        ...new Set(
          (n.aliases ?? [])
            .map((a) => text(a, 80))
            .filter((a): a is string => !!a),
        ),
      ].slice(0, 20);
      const was = before.names.find((x) => x.lang === n.lang);
      if (
        was &&
        was.name === name &&
        JSON.stringify(was.aliases) === JSON.stringify(aliases)
      )
        continue;
      patch.names.push({ lang: n.lang, name, aliases });
    }
  }
  await admin.editCharacter(id, patch);
  invalidateCatalog();
  await admin
    .audit({
      actor: me.id,
      action: "character.edit",
      target: id,
      before,
      after: patch,
    })
    .catch(() => {});
}

/** Hides or brings back a player's nickname of a character. */
export async function nicknameHidden(id: number, hidden: boolean) {
  const me = await adminOnly();
  if (!Number.isSafeInteger(id)) throw new GameError("invalid_input");
  const { admin } = getBackend();
  await admin.setNicknameHidden(id, hidden === true);
  invalidateCatalog();
  await admin
    .audit({
      actor: me.id,
      action: "nickname.hidden",
      target: String(id),
      after: hidden === true,
    })
    .catch(() => {});
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
