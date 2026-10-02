"use server";
// Every mutation the UI can make. Reads go through the route handlers under /api.

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { normalizeName } from "@/game/match";
import {
  ANSWERS,
  type AnswerValue,
  CRITTER_SEED,
  DEFAULT_SETTINGS,
  GameError,
  type GameEvent,
  type Identity,
  LANGS,
  type Lang,
  MAX_GUESS,
  MAX_NAME,
  MAX_NOTE,
  MAX_QUESTION,
  type RoomSettings,
  type RoomView,
  STEP_SECONDS_MAX,
  STEP_SECONDS_MIN,
} from "@/game/types";
import { toView } from "@/game/view";
import { getBackend } from "./backend";
import {
  AVATAR_COLORS,
  type CharacterDTO,
  type CreateRoomInput,
  fail,
  type Me,
  ok,
  type Result,
} from "./contract";
import { allow } from "./rate-limit";
import { dispatch, normalizeCode, openRoom } from "./rooms";

async function lang(): Promise<Lang> {
  try {
    const l = await getLocale();
    return (LANGS as readonly string[]).includes(l) ? (l as Lang) : "en";
  } catch {
    return "en";
  }
}

const me = async (): Promise<Identity> =>
  getBackend().auth.identity(await lang());

/** Runs `work`, turning game errors into `fail(code)` and anything else into "unknown". */
async function run<T>(work: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await work());
  } catch (e) {
    if (e instanceof GameError) return fail(e.code);
    console.error("[action]", e);
    return fail("unknown");
  }
}

const bad = (): never => {
  throw new GameError("invalid_input");
};

function roomCode(raw: unknown) {
  return (typeof raw === "string" && normalizeCode(raw)) || bad();
}

/** Sends one event for the caller to a room. */
/** Applies the player's event and hands back the room as they now see it, so the screen updates without another request. */
async function act(
  rawCode: string,
  build: (id: string) => GameEvent,
): Promise<RoomView> {
  const code = roomCode(rawCode);
  const who = await me();
  const { state, version } = await dispatch(code, () => build(who.id));
  return toView(state, version, who.id, Date.now());
}

// --- rooms ------------------------------------------------------------------

const createSchema = z.object({
  visibility: z.enum(["public", "private"]),
  seats: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  stepSeconds: z.number().int().min(STEP_SECONDS_MIN).max(STEP_SECONDS_MAX),
});

export async function createRoom(
  input: CreateRoomInput,
): Promise<Result<{ code: string }>> {
  return run(async () => {
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) bad();
    const host = await me();
    if (!allow(`create:${host.id}`, 20, 60_000))
      throw new GameError("rate_limited");
    const settings: RoomSettings = { ...DEFAULT_SETTINGS, ...parsed.data };
    return { code: await openRoom(host, settings) };
  });
}

/** Idempotent: joining a room you are already in succeeds. */
export async function joinRoom(
  rawCode: string,
): Promise<Result<{ code: string }>> {
  return run(async () => {
    const code = roomCode(rawCode);
    const who = await me();
    await dispatch(code, () => ({ type: "JOIN", player: who }));
    return { code };
  });
}

export async function leaveRoom(code: string): Promise<Result> {
  return run(async () => {
    await act(code, (id) => ({ type: "LEAVE", playerId: id }));
  });
}

/** Host only, lobby only. */
export async function updateSettings(
  code: string,
  settings: Partial<RoomSettings>,
): Promise<Result<RoomView>> {
  return run(async () => {
    const parsed = createSchema.partial().strict().safeParse(settings);
    if (!parsed.success) bad();
    return act(code, (id) => ({
      type: "UPDATE_SETTINGS",
      playerId: id,
      settings: parsed.data ?? {},
    }));
  });
}

export async function setReady(
  code: string,
  ready: boolean,
): Promise<Result<RoomView>> {
  return run(() =>
    act(code, (id) => ({
      type: "SET_READY",
      playerId: id,
      ready: ready === true,
    })),
  );
}

/** Host only, 2+ players. Draws the theme and the picking ring. */
export async function startGame(code: string): Promise<Result<RoomView>> {
  return run(async () => {
    const theme = await getBackend().themes.draw([]);
    return act(code, (id) => ({ type: "START", playerId: id, theme }));
  });
}

// --- match ------------------------------------------------------------------

export async function confirmPick(
  code: string,
  characterId: string,
): Promise<Result<RoomView>> {
  return run(async () => {
    if (typeof characterId !== "string" || characterId.length > 200) bad();
    const character = (await getBackend().characters.get(characterId)) ?? bad();
    return act(code, (id) => ({ type: "PICK", playerId: id, character }));
  });
}

const text = (raw: unknown, max: number) => {
  if (typeof raw !== "string") return bad();
  const t = raw.trim();
  return t && t.length <= max ? t : bad();
};

export async function askQuestion(
  code: string,
  question: string,
): Promise<Result<RoomView>> {
  return run(() =>
    act(code, (id) => ({
      type: "ASK",
      playerId: id,
      text: text(question, MAX_QUESTION),
    })),
  );
}

export async function answerQuestion(
  code: string,
  value: AnswerValue,
  note: string | null,
): Promise<Result<RoomView>> {
  return run(async () => {
    if (!ANSWERS.includes(value)) bad();
    const n =
      note === null || note === undefined
        ? null
        : typeof note === "string"
          ? note
          : bad();
    if (n && n.length > MAX_NOTE) bad();
    return act(code, (id) => ({
      type: "ANSWER",
      playerId: id,
      value,
      note: n,
    }));
  });
}

/** "hit" = matched the name closely, no validation needed. */
export async function submitGuess(
  code: string,
  guess: string,
): Promise<Result<RoomView>> {
  return run(() =>
    act(code, (id) => ({
      type: "GUESS",
      playerId: id,
      text: text(guess, MAX_GUESS),
    })),
  );
}

export async function passTurn(code: string): Promise<Result<RoomView>> {
  return run(() => act(code, (id) => ({ type: "PASS", playerId: id })));
}

/** Only the player who picked the character under guess. */
export async function validateGuess(
  code: string,
  correct: boolean,
): Promise<Result<RoomView>> {
  return run(() =>
    act(code, (id) => ({
      type: "VALIDATE",
      playerId: id,
      correct: correct === true,
    })),
  );
}

export async function giveUp(code: string): Promise<Result<RoomView>> {
  return run(() => act(code, (id) => ({ type: "GIVE_UP", playerId: id })));
}

/** Host only, from the result screen: same room, new theme. */
export async function rematch(code: string): Promise<Result<RoomView>> {
  return run(async () => {
    const stored = await getBackend().rooms.get(roomCode(code));
    const theme = await getBackend().themes.draw(
      stored?.state.theme ? [stored.state.theme] : [],
    );
    return act(code, (id) => ({ type: "REMATCH", playerId: id, theme }));
  });
}

// --- character library --------------------------------------------------------

const MAX_IMAGE = 4 * 1024 * 1024;

/** Accepts only real WebP, JPEG or PNG files (checked by their first bytes). */
async function readImage(
  file: FormDataEntryValue | null,
): Promise<{ bytes: Uint8Array; type: string } | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (file.size > MAX_IMAGE) throw new GameError("upload_failed");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const has = (sig: number[], at = 0) =>
    sig.every((b, i) => bytes[at + i] === b);
  if (has([0x52, 0x49, 0x46, 0x46]) && has([0x57, 0x45, 0x42, 0x50], 8))
    return { bytes, type: "image/webp" };
  if (has([0xff, 0xd8, 0xff])) return { bytes, type: "image/jpeg" };
  if (has([0x89, 0x50, 0x4e, 0x47])) return { bytes, type: "image/png" };
  throw new GameError("upload_failed");
}

const toDTO = (c: {
  id: string;
  lang: Lang;
  name: string;
  origin: string | null;
  imageUrl: string | null;
}): CharacterDTO => ({
  id: c.id,
  lang: c.lang,
  name: c.name,
  origin: c.origin,
  imageUrl: c.imageUrl,
});

/** FormData: name, origin (optional), lang, image (optional File, cropped 4:5 by the browser). */
export async function createCharacter(
  form: FormData,
): Promise<Result<CharacterDTO>> {
  return run(async () => {
    const who = await me();
    if (!allow(`upload:${who.id}`, 30, 60_000))
      throw new GameError("rate_limited");
    const name = text(form.get("name"), 60);
    const rawOrigin = form.get("origin");
    const origin =
      typeof rawOrigin === "string" && rawOrigin.trim()
        ? text(rawOrigin, 60)
        : null;
    const rawLang = form.get("lang");
    const l = (LANGS as readonly unknown[]).includes(rawLang)
      ? (rawLang as Lang)
      : await lang();
    const image = await readImage(form.get("image"));
    const { files, characters } = getBackend();
    const imageUrl = image
      ? await files.put("characters", image.bytes, image.type)
      : null;
    // same name (and origin, when given) as a library entry: reuse it instead of a duplicate
    const same = (await characters.search(name, l, 10)).find(
      (c) =>
        normalizeName(c.name) === normalizeName(name) &&
        (!origin || normalizeName(c.origin ?? "") === normalizeName(origin)),
    );
    if (same) {
      if (!imageUrl) return toDTO(same);
      return toDTO((await characters.setImage(same.id, imageUrl)) ?? same);
    }
    const c = await characters.create({
      lang: l,
      name,
      origin,
      imageUrl,
      createdBy: who.id,
    });
    return toDTO(c);
  });
}

/** FormData: id, image (File). The new image becomes the library's image for that character. */
export async function replaceCharacterImage(
  form: FormData,
): Promise<Result<CharacterDTO>> {
  return run(async () => {
    const who = await me();
    if (!allow(`upload:${who.id}`, 30, 60_000))
      throw new GameError("rate_limited");
    const id = text(form.get("id"), 200);
    const image = (await readImage(form.get("image"))) ?? bad();
    const { files, characters } = getBackend();
    if (!(await characters.get(id))) throw new GameError("not_found");
    const url = await files.put("characters", image.bytes, image.type);
    const c = (await characters.setImage(id, url)) ?? bad();
    return toDTO(c);
  });
}

// --- identity -----------------------------------------------------------------

/** FormData: name, color, avatar ("critter" | "color" | "provider" | "upload" | "keep"), seed (critter), image (upload). Accounts only. */
export async function updateProfile(form: FormData): Promise<Result<Me>> {
  return run(async () => {
    const { auth, files } = getBackend();
    const current = await auth.me(await lang());
    if (current.isGuest) throw new GameError("unauthorized");
    const name = text(form.get("name"), MAX_NAME);
    const color = form.get("color");
    // one of the palette, or the random pastel the guest started with
    if (
      typeof color !== "string" ||
      (!(AVATAR_COLORS as readonly string[]).includes(color) &&
        color !== current.avatar.color)
    )
      bad();
    const kind = form.get("avatar");
    let avatar: Identity["avatar"] = { kind: "color", color: color as string };
    if (kind === "provider" && current.providerAvatarUrl) {
      avatar = {
        kind: "image",
        url: current.providerAvatarUrl,
        color: color as string,
      };
    } else if (kind === "upload") {
      const image = (await readImage(form.get("image"))) ?? bad();
      avatar = {
        kind: "image",
        url: await files.put("avatars", image.bytes, image.type),
        color: color as string,
      };
    } else if (kind === "critter") {
      const seed = form.get("seed");
      if (typeof seed !== "string" || !CRITTER_SEED.test(seed)) bad();
      avatar = {
        kind: "critter",
        seed: seed as string,
        color: color as string,
      };
    } else if (kind === "keep" && current.avatar.kind === "image") {
      avatar = { ...current.avatar, color: color as string };
    } else if (kind !== "color") {
      bad();
    }
    return auth.updateProfile({ name, avatar });
  });
}

export async function signOut(): Promise<Result> {
  return run(() => getBackend().auth.signOut());
}

/** Local mode only: flips the current guest into a fake account so the profile screen can be used without Supabase. */
export async function enterTestAccount(
  provider: "discord" | "google" = "discord",
): Promise<Result<Me>> {
  return run(async () => {
    const auth = getBackend().auth;
    if (!auth.enterTestAccount) throw new GameError("unauthorized");
    if (provider !== "discord" && provider !== "google") bad();
    return auth.enterTestAccount(provider);
  });
}
