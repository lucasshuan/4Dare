// What the pick card saves while the player works on it (plan 1.5), and the
// hand under it (plan 1.6): the requests, and the pure pieces around them
// (card ↔ draft, the per-viewer draw of the hand), kept apart from React so
// they are easy to test.
import {
  type CardContent,
  type SearchItem,
  shownItem,
  toCardView,
} from "@/game/character-search";
import type { Lang } from "@/game/types";
import type { TrayPicture } from "@/server/pictures";
import type { DraftCard } from "@/server/rooms";
import type { HandCard, HandResponse } from "@/server/theme-picks";

export type { TrayPicture } from "@/server/pictures";
export type { DraftCard } from "@/server/rooms";
export type { HandCard } from "@/server/theme-picks";

/**
 * What the card saves, "whatever is on the card is the pick":
 * empty → null; a library character (picked, or the highlighted row while
 * typing) → its id with the name as shown, and the picture chosen for it
 * when it is not the cover; a name the search doesn't know → the name and
 * its uploaded picture.
 */
export function toDraft(card: CardContent): DraftCard | null {
  switch (card.kind) {
    case "empty":
      return null;
    case "typing":
      if (!card.text.trim()) return null;
      return {
        characterId: card.preview?.[0] ?? null,
        name: card.text,
        imageUrl: null,
      };
    case "picked":
      return {
        characterId: card.card.characterId,
        name: card.card.name,
        imageUrl: card.picture ?? null,
      };
    case "new":
      if (!card.name.trim() && !card.imageUrl) return null;
      return { characterId: null, name: card.name, imageUrl: card.imageUrl };
  }
}

/** One string per draft, to compare a card with what the server holds. */
export const draftKey = (draft: DraftCard | null | undefined): string =>
  draft ? JSON.stringify([draft.characterId, draft.name, draft.imageUrl]) : "";

/**
 * The card a saved draft stands for (a reload, a rejoin). A library id needs
 * the character index to show its picture: undefined until it has loaded.
 * One of the character's names in full (its own or an alias) is the picked
 * character under that name; anything else was being typed over that row's
 * preview.
 */
export function fromDraft(
  draft: DraftCard | null,
  items: readonly SearchItem[] | undefined,
): CardContent | undefined {
  if (!draft) return { kind: "empty" };
  if (draft.characterId === null)
    return draft.name.trim() || draft.imageUrl
      ? {
          kind: "new",
          name: draft.name,
          imageUrl: draft.imageUrl,
          uploading: false,
        }
      : { kind: "empty" };
  if (!items) return undefined;
  const item = items.find((i) => i[0] === draft.characterId);
  const picture = draft.imageUrl ? { picture: draft.imageUrl } : {};
  if (!item)
    return {
      kind: "picked",
      card: {
        characterId: draft.characterId,
        name: draft.name,
        origin: null,
        imageUrl: null,
      },
      via: "restore",
      ...picture,
    };
  const preview = shownItem(item, draft.name);
  return preview[1] === draft.name
    ? { kind: "picked", card: toCardView(preview), via: "restore", ...picture }
    : { kind: "typing", text: draft.name, preview };
}

export type DraftSave = {
  ok: boolean;
  status: number;
  /** The `{ error }` code of a refusal, when the body had one. */
  error?: string;
};

/** PUT the whole card (or null for an empty one). Never throws: status 0 when the network failed. */
export async function putDraft(
  code: string,
  draft: DraftCard | null,
  { keepalive = false }: { keepalive?: boolean } = {},
): Promise<DraftSave> {
  try {
    const res = await fetch(`/api/rooms/${code}/draft`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
      keepalive,
    });
    if (res.ok) return { ok: true, status: res.status };
    let error: string | undefined;
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === "string") error = body.error;
    } catch {
      // no JSON body (a proxy's error page): judged by the status alone
    }
    return { ok: false, status: res.status, error };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** Refusals that mean the card is closed for good: confirmed, out of time, not seated, no room. */
const CLOSED = new Set([
  "already_done",
  "wrong_phase",
  "not_member",
  "unauthorized",
  "not_found",
]);

/**
 * What a save's answer means for the autosave: `saved`; `closed` (stop
 * saving, the card can no longer change); or `retry` (a lost CAS race, the
 * rate limit, a server or network failure: the card is still unsaved).
 */
export function saveOutcome(r: DraftSave): "saved" | "closed" | "retry" {
  if (r.ok) return "saved";
  if (r.error !== undefined) return CLOSED.has(r.error) ? "closed" : "retry";
  return r.status === 403 || r.status === 404 ? "closed" : "retry";
}

/** What a picture sent from the card came to: its URL and how the tray shows it, or the refusal. */
export type PictureUpload =
  | { url: string; picture: TrayPicture | null }
  | { error: string };

/**
 * Sends a picture for the card; the server keeps it on the draft. With a
 * library character's id it becomes one more picture of that character,
 * without one it is the new name's (the card becomes a new character, its
 * name kept). `replaces`: the picture this one adjusts (a moved crop). The
 * detector may refuse it (image_rejected).
 */
export async function uploadDraftImage(
  code: string,
  image: Blob,
  {
    characterId,
    replaces,
    lang,
  }: { characterId?: string; replaces?: string; lang: string },
): Promise<PictureUpload> {
  const form = new FormData();
  form.set("image", image, "picture.webp");
  if (characterId) form.set("characterId", characterId);
  if (replaces) form.set("replaces", replaces);
  try {
    const res = await fetch(`/api/rooms/${code}/draft/image?lang=${lang}`, {
      method: "POST",
      body: form,
    });
    const body = (await res.json().catch(() => ({}))) as {
      imageUrl?: string;
      picture?: TrayPicture;
      error?: string;
    };
    if (!res.ok || !body.imageUrl)
      return { error: body.error ?? "upload_failed" };
    return { url: body.imageUrl, picture: body.picture ?? null };
  } catch {
    return { error: "upload_failed" };
  }
}

/** React Query key of a character's pictures (the tray). */
export const picturesKey = (characterId: string) =>
  ["character-pictures", characterId] as const;

/** A character's tray, who sent each picture named in `lang`. */
export async function fetchPictures(
  characterId: string,
  lang: string,
): Promise<TrayPicture[]> {
  const res = await fetch(
    `/api/characters/${encodeURIComponent(characterId)}/pictures?lang=${lang}`,
  );
  if (!res.ok) throw new Error(`pictures: ${res.status}`);
  return ((await res.json()) as { pictures: TrayPicture[] }).pictures;
}

/** Reports another player's picture. True when the server took it. */
export async function reportPicture(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/pictures/${encodeURIComponent(id)}/report`, {
      method: "POST",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** React Query key of a theme's hand (the lab seeds it). */
export const handKey = (themeId: string, lang: Lang) =>
  ["theme-hand", themeId, lang] as const;

export async function fetchHand(
  themeId: string,
  lang: Lang,
): Promise<HandCard[]> {
  const res = await fetch(`/api/themes/${themeId}/picks?lang=${lang}`);
  if (!res.ok) throw new Error(`hand: ${res.status}`);
  return ((await res.json()) as HandResponse).hand;
}

/** How many cards of the hand a player sees. */
export const HAND_SHOWN = 5;

/** FNV-1a, for a seed from a string. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic 0..1 (mulberry32). */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `n` cards of the hand, drawn with `seed` (the viewer's id and the match
 * number), so the pickers don't all reach for the same card; they keep the
 * hand's order. The same seed always draws the same cards.
 */
export function drawHand<T>(
  hand: readonly T[],
  seed: string,
  n = HAND_SHOWN,
): T[] {
  if (hand.length <= n) return [...hand];
  const next = random(hash(seed));
  const order = hand.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order
    .slice(0, n)
    .sort((a, b) => a - b)
    .map((i) => hand[i]);
}
