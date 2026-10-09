import "server-only";
// The owner editing their profile in place: everything in one save (name,
// @handle, avatar, cover, quote, accent, showcase, about, privacy), checked
// here, pictures through the detector first.
import {
  HANDLE_CHANGE_DAYS,
  type HandleProblem,
  handleProblem,
  normalizeHandle,
} from "@/game/profile/handle";
import {
  type Banner,
  cleanQuote,
  parseAbout,
  parseAccent,
  parseBanner,
  parsePrivacy,
  parseShowcase,
} from "@/game/profile/profile";
import { GameError, type Identity, type Lang, MAX_NAME } from "@/game/types";
import { isDna } from "@/lib/avatar";
import { getBackend } from "./backend";
import { entryId } from "./backend/seed-format";
import type { ProfilePatch } from "./backend/types";
import { type Account, AVATAR_COLORS } from "./contract";
import { readImage } from "./images";
import { moderateImage } from "./moderation";
import { pickKey } from "./theme-picks";

const DAY = 24 * 60 * 60 * 1000;

export type HandleCheck =
  | { ok: true }
  | {
      ok: false;
      problem: HandleProblem | "taken" | "wait";
      /** "wait": when it may change again (ms). */
      until?: number;
    };

const bad = (): never => {
  throw new GameError("invalid_input");
};

/** When an account may next change its handle, or null when it may now. */
const waitUntil = (changedAt: number | null, now: number) =>
  changedAt !== null && now - changedAt < HANDLE_CHANGE_DAYS * DAY
    ? changedAt + HANDLE_CHANGE_DAYS * DAY
    : null;

/** Whether account `id` may take `raw` as its handle, as the editor asks while typing. */
export async function checkHandle(
  id: string,
  raw: string,
  now = Date.now(),
): Promise<HandleCheck> {
  const handle = normalizeHandle(raw);
  const problem = handleProblem(handle);
  if (problem) return { ok: false, problem };
  const { profiles } = getBackend();
  const [mine] = await profiles.byIds([id]);
  if (mine?.handle === handle) return { ok: true };
  const until = waitUntil(mine?.handleChangedAt ?? null, now);
  if (until !== null) return { ok: false, problem: "wait", until };
  const other = await profiles.byHandle(handle);
  return other && other.id !== id
    ? { ok: false, problem: "taken" }
    : { ok: true };
}

/** A picture the owner sent, checked by the detector, kept with the avatars. */
async function keepPicture(file: FormDataEntryValue | null) {
  const image = (await readImage(file)) ?? bad();
  const check = await moderateImage(image.bytes, image.type);
  if (check.verdict === "rejected") throw new GameError("image_rejected");
  return getBackend().files.put("avatars", image.bytes, image.type);
}

/**
 * The avatar the form asks for: "creature" (dna), "provider", "upload"
 * (image) or "keep", on one of the palette's colours (or the guest's first).
 */
async function avatarFrom(
  form: FormData,
  current: Account,
): Promise<Identity["avatar"]> {
  const color = form.get("color");
  if (
    typeof color !== "string" ||
    (!(AVATAR_COLORS as readonly string[]).includes(color) &&
      color !== current.avatar.color)
  )
    bad();
  const c = color as string;
  const kind = form.get("avatar");
  if (kind === "provider" && current.providerAvatarUrl)
    return { kind: "image", url: current.providerAvatarUrl, color: c };
  if (kind === "upload")
    return {
      kind: "image",
      url: await keepPicture(form.get("image")),
      color: c,
    };
  if (kind === "creature") {
    const dna = form.get("dna");
    if (typeof dna !== "string" || !isDna(dna)) bad();
    return { kind: "creature", dna: dna as string, color: c };
  }
  if (kind === "keep") return { ...current.avatar, color: c };
  return bad();
}

/** "none", "keep", "pattern:<pattern>:<tint>" or "upload" (with bannerImage). */
async function bannerFrom(
  form: FormData,
  current: Banner | null,
): Promise<Banner | null> {
  const raw = form.get("banner");
  if (raw === "keep") return current;
  if (raw === "none") return null;
  if (raw === "upload")
    return { kind: "image", url: await keepPicture(form.get("bannerImage")) };
  if (typeof raw === "string" && raw.startsWith("pattern:")) {
    const [, pattern, tint] = raw.split(":");
    const banner = parseBanner({ kind: "pattern", pattern, tint });
    if (banner) return banner;
  }
  return bad();
}

const jsonField = (form: FormData, key: string): unknown => {
  const raw = form.get(key);
  if (typeof raw !== "string") return bad();
  try {
    return JSON.parse(raw);
  } catch {
    return bad();
  }
};

/** The characters among `keys` (language-free) that exist, in order. */
async function existing(keys: string[], lang: Lang) {
  const { characters } = getBackend();
  const known = await Promise.all(
    keys.map((k) => characters.get(k.startsWith("u-") ? k : entryId(lang, k))),
  );
  return keys.filter((_, i) => known[i]);
}

/** Saves the whole editor; the account as it is now. */
export async function editProfile(
  current: Account,
  form: FormData,
  lang: Lang,
  now = Date.now(),
): Promise<Account> {
  if (current.isGuest) throw new GameError("unauthorized");
  const { auth, profiles } = getBackend();
  const [profile] = await profiles.byIds([current.id]);
  if (!profile) throw new GameError("unauthorized");

  const nameRaw = form.get("name");
  const name =
    typeof nameRaw === "string" &&
    nameRaw.trim() &&
    nameRaw.trim().length <= MAX_NAME
      ? nameRaw.trim()
      : bad();

  const handle = normalizeHandle(String(form.get("handle") ?? ""));
  const patch: ProfilePatch = {};
  if (handle !== profile.handle) {
    if (handleProblem(handle)) bad();
    if (waitUntil(profile.handleChangedAt, now) !== null)
      throw new GameError("handle_wait");
    // asked before any picture is kept; the unique index has the last word
    const other = await profiles.byHandle(handle);
    if (other && other.id !== current.id) throw new GameError("handle_taken");
    patch.handle = handle;
    patch.handleChangedAt = now;
  }

  // the browser sends app ids ("pt-wd-Q302"); the showcase keeps them language-free
  const showcase = parseShowcase(jsonField(form, "showcase")).map((s) => ({
    ...s,
    characterId: pickKey(s.characterId) ?? s.characterId,
  }));
  const known = new Set(
    await existing(
      showcase.map((s) => s.characterId),
      lang,
    ),
  );
  Object.assign(patch, {
    quote: cleanQuote(form.get("quote")),
    accent: parseAccent(form.get("accent")),
    about: parseAbout(jsonField(form, "about")),
    privacy: parsePrivacy(jsonField(form, "privacy")),
    showcase: showcase.filter((s) => known.has(s.characterId)),
    // pictures last: the detector may still refuse one
    banner: await bannerFrom(form, profile.banner),
  } satisfies ProfilePatch);
  const avatar = await avatarFrom(form, current);

  await profiles.update(current.id, patch);
  return auth.updateProfile({ name, avatar });
}
