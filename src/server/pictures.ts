import "server-only";
// Pictures of characters (0017_character_images.sql): what a player sends
// goes through the detector, becomes another picture of the character, and
// may go on a pick card for one match. Every confirmed card counts a pick for
// the picture it showed; the cover (the character's imageUrl) is the best
// active picture, the library's own with a head start.
import {
  type Character,
  GameError,
  type Identity,
  type PickDraft,
  type PlayerId,
} from "@/game/types";
import { getBackend } from "./backend";
import { parseEntryId } from "./backend/seed-format";
import type {
  CharacterImage,
  ImageAuthor,
  NewCharacter,
} from "./backend/types";
import { getOrCreateCharacter } from "./characters";
import { moderateImage } from "./moderation";

/** Distinct reports that hide a player's picture. */
export const REPORTS_TO_HIDE = 3;
/** The most pictures a tray shows. */
export const TRAY_SIZE = 60;
/** A picture sent for a new name that is still unattached this long after is an orphan. */
const ORPHAN_AFTER_MS = 24 * 60 * 60 * 1000;
/** Waiting pictures checked again per run (each costs detector operations). */
const RECHECK_BATCH = 40;

/** The language-free id behind an app id: "pt-wd-Q302" → "wd-Q302"; a player's "u-…" stays. */
export const baseId = (id: string) => parseEntryId(id)?.id ?? id;

const authorOf = (who: Identity): ImageAuthor => ({
  name: who.name,
  isGuest: who.isGuest,
  guestNumber: who.guestNumber,
  avatar: who.avatar,
});

/** What the tray shows of a picture. */
export interface TrayPicture {
  id: string;
  url: string;
  /** null for the library's own picture. */
  author: ImageAuthor | null;
  /** The viewer sent it. */
  mine: boolean;
  /** Waiting on the detector: only its author sees it. */
  pending: boolean;
}

/**
 * Checks and keeps a picture a player sent: for a character (an app id), or
 * for a new name on their card (null). Throws image_rejected when the
 * detector refuses it; a picture it could not check is kept as pending.
 */
export async function sendPicture(
  who: Identity,
  characterId: string | null,
  image: { bytes: Uint8Array; type: string },
): Promise<CharacterImage> {
  const check = await moderateImage(image.bytes, image.type);
  if (check.verdict === "rejected") throw new GameError("image_rejected");
  const { files, images } = getBackend();
  const url = await files.put("characters", image.bytes, image.type);
  return images.add({
    characterId: characterId && baseId(characterId),
    url,
    createdBy: who.id,
    author: authorOf(who),
    status: check.verdict === "ok" ? "active" : "pending",
    moderation: check.verdict === "ok" ? check.scores : { error: check.error },
  });
}

const visibleTo = (image: CharacterImage, playerId: PlayerId) =>
  image.status === "active" ||
  (image.status === "pending" && image.createdBy === playerId);

/**
 * A picture `playerId` may put on a card: one of the character's they can see
 * or, for a new name (null), one they sent for it.
 */
export async function usablePicture(
  playerId: PlayerId,
  characterId: string | null,
  url: string,
): Promise<CharacterImage | null> {
  const { images } = getBackend();
  const image = await images.find(characterId && baseId(characterId), url);
  if (!image) return null;
  if (characterId === null) return image.createdBy === playerId ? image : null;
  return visibleTo(image, playerId) ? image : null;
}

/** A library character as the card shows it: with the draft's picture when the draft is for it. */
export function wearing(c: Character, draft: PickDraft | null | undefined) {
  return draft?.characterId === c.id && draft.imageUrl
    ? { ...c, imageUrl: draft.imageUrl }
    : c;
}

/**
 * A card's new name as a character, found in the library or added to it,
 * wearing the picture the card sent for it (`input.imageUrl`). That picture
 * becomes one of the character's; a new character takes it as its cover
 * once the detector cleared it. Safe to race, like getOrCreateCharacter.
 */
export async function nameWithPicture(input: NewCharacter): Promise<Character> {
  const { images } = getBackend();
  const sent = input.imageUrl
    ? await usablePicture(input.createdBy, null, input.imageUrl)
    : null;
  const c = await getOrCreateCharacter({
    ...input,
    imageUrl: sent?.status === "active" ? sent.url : null,
  });
  // a racing request may have attached it already
  const picture =
    sent ??
    (input.imageUrl ? await images.find(baseId(c.id), input.imageUrl) : null);
  if (
    !picture ||
    picture.createdBy !== input.createdBy ||
    picture.status === "hidden"
  )
    return c;
  await images.attach(picture, baseId(c.id));
  return { ...c, imageUrl: picture.url };
}

/** Counts the picture a confirmed card showed toward its character's cover. Best effort. */
export async function countPick(c: Character, pickerId: PlayerId) {
  if (!c.imageUrl || c.id.startsWith("emergency-")) return;
  try {
    await getBackend().images.recordPick(baseId(c.id), c.imageUrl, pickerId);
  } catch (e) {
    console.warn("[pictures] pick not counted:", e);
  }
}

/** A character's tray for a viewer: its active pictures and their own waiting ones, best first. */
export async function trayOf(
  characterId: string,
  viewer: PlayerId,
): Promise<TrayPicture[]> {
  const list = await getBackend().images.list(
    baseId(characterId),
    viewer,
    TRAY_SIZE,
  );
  return list.map((i) => ({
    id: i.id,
    url: i.url,
    author: i.author,
    mine: i.createdBy === viewer,
    pending: i.status === "pending",
  }));
}

/**
 * Reports a player's picture (never the library's, never one's own). The
 * picture is hidden at REPORTS_TO_HIDE distinct reports.
 */
export async function reportPicture(
  id: string,
  reporter: PlayerId,
): Promise<{ hidden: boolean }> {
  const { images } = getBackend();
  const image = await images.get(id);
  if (!image || image.status === "hidden") throw new GameError("not_found");
  if (image.createdBy === null || image.createdBy === reporter)
    throw new GameError("invalid_input");
  const status = await images.report(id, reporter, REPORTS_TO_HIDE);
  return { hidden: status === "hidden" };
}

/**
 * A picture its author replaced before anyone picked it (a crop adjusted on
 * the card sends again): it goes, with its file. Never the cover a new
 * character took from it.
 */
export async function withdrawPicture(id: string, author: PlayerId) {
  const { images, files, characters } = getBackend();
  const image = await images.get(id);
  if (!image || image.createdBy !== author || image.score > 0) return;
  if (
    image.characterId?.startsWith("u-") &&
    (await characters.get(image.characterId))?.imageUrl === image.url
  )
    return;
  await images.remove(image.id);
  await files.remove(image.url);
}

/** Bytes of a stored picture, for a second look by the detector. */
async function download(url: string) {
  if (!/^https?:\/\//.test(url)) return null;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;
  return {
    bytes: new Uint8Array(await res.arrayBuffer()),
    type: res.headers.get("content-type") ?? "image/webp",
  };
}

/**
 * The daily tidy-up: pictures that waited on the detector are checked again
 * (until it fails again: no quota left, try tomorrow), and pictures sent for
 * a name that never became a character go, with their files.
 */
export async function tidyPictures(now = Date.now()) {
  const { images, files } = getBackend();
  const done = { approved: 0, rejected: 0, orphans: 0 };
  for (const image of await images.pending(RECHECK_BATCH)) {
    const file = await download(image.url).catch(() => null);
    if (!file) continue;
    const check = await moderateImage(file.bytes, file.type);
    if (check.verdict === "unknown") break;
    if (check.verdict === "ok") {
      await images.approve(image.id, check.scores);
      done.approved++;
    } else {
      await images.remove(image.id);
      await files.remove(image.url);
      done.rejected++;
    }
  }
  for (const image of await images.orphans(now - ORPHAN_AFTER_MS, 200)) {
    await images.remove(image.id);
    await files.remove(image.url);
    done.orphans++;
  }
  return done;
}
