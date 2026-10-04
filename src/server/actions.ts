"use server";
// Every mutation the UI can make. Reads go through the route handlers under /api.

import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { GAME_KEYS } from "@/game/games";
import { themeId } from "@/game/theme-id";
import { THEME_SET_KEYS, type ThemeSet } from "@/game/theme-sets";
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
  MAX_CHARACTER_NAME,
  MAX_GUESS,
  MAX_NAME,
  MAX_NOTE,
  MAX_QUESTION,
  MAX_THEME,
  ROOM_NAME_MAX,
  ROOM_PASSWORD_MAX,
  type RoomSettings,
  type RoomView,
  STEP_SECONDS_MAX,
  STEP_SECONDS_MIN,
  THEME_OPTIONS,
} from "@/game/types";
import { toView } from "@/game/view";
import { rerollGuest as rerollGuestCookie } from "./auth/guest";
import { getBackend } from "./backend";
import { findSameName, getOrCreateCharacter } from "./characters";
import {
  AVATAR_COLORS,
  type CharacterDTO,
  type CreateRoomInput,
  fail,
  type Me,
  ok,
  type Result,
} from "./contract";
import { readImage } from "./images";
import { allow } from "./rate-limit";
import {
  currentMatch,
  dispatch,
  leaveOtherRooms,
  normalizeCode,
  openRoom,
  roundExamples,
  roundThemes,
  saveDraft,
  syncIdentity,
} from "./rooms";
import { drawPopular, PICKS_FETCHED, pickKey } from "./theme-picks";

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

const seconds = z.number().int().min(STEP_SECONDS_MIN).max(STEP_SECONDS_MAX);

const createSchema = z.object({
  game: z.enum(GAME_KEYS),
  name: z.string().trim().min(1).max(ROOM_NAME_MAX),
  visibility: z.enum(["public", "private"]),
  password: z.string().trim().max(ROOM_PASSWORD_MAX),
  seats: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  askSeconds: seconds,
  guessSeconds: seconds,
  answerSeconds: seconds,
  validateSeconds: seconds,
  themeMode: z.enum(["vote", "host"]),
  themeSets: z
    .array(z.enum(THEME_SET_KEYS as [ThemeSet, ...ThemeSet[]]))
    .min(1)
    .max(THEME_SET_KEYS.length),
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
    if (await currentMatch(host.id)) throw new GameError("in_match");
    const settings: RoomSettings = { ...DEFAULT_SETTINGS, ...parsed.data };
    const code = await openRoom(host, settings);
    await leaveOtherRooms(host.id, code);
    return { code };
  });
}

/**
 * Idempotent: joining a room you are already in succeeds. A private room asks
 * newcomers for `password`. One room at a time: a match still going elsewhere
 * has to be left first, while another lobby is left on the way in.
 */
export async function joinRoom(
  rawCode: string,
  password?: string,
): Promise<Result<{ code: string }>> {
  return run(async () => {
    const code = roomCode(rawCode);
    const who = await me();
    // Guessing a password takes one try per call: keep it slow.
    if (password !== undefined && !allow(`join:${who.id}:${code}`, 10, 60_000))
      throw new GameError("rate_limited");
    const playing = await currentMatch(who.id);
    if (playing && playing.code !== code) throw new GameError("in_match");
    const typed =
      typeof password === "string" ? password.slice(0, 100) : undefined;
    await dispatch(code, () => ({
      type: "JOIN",
      player: who,
      password: typed,
    }));
    await leaveOtherRooms(who.id, code);
    return { code };
  });
}

/** Out of the room, or out of the match (the seat stays, marked away). Nothing to show afterwards: a player who left has no view. */
export async function leaveRoom(rawCode: string): Promise<Result> {
  return run(async () => {
    const code = roomCode(rawCode);
    const who = await me();
    await dispatch(code, () => ({ type: "LEAVE", playerId: who.id }));
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

/**
 * Host only, 2+ players. Draws the themes everyone votes on (or the host's
 * ideas, when they type the theme), avoiding the last vote's. A room's first
 * vote brings the rule scene's cards for each theme along.
 */
export async function startGame(code: string): Promise<Result<RoomView>> {
  return run(async () => {
    const stored = await getBackend().rooms.get(roomCode(code));
    const themes = stored
      ? await roundThemes(stored.state, stored.state.vote?.options ?? [])
      : [];
    const examples =
      stored?.state.settings.themeMode === "vote"
        ? await roundExamples(stored.state, themes)
        : undefined;
    return act(code, (id) => ({
      type: "START",
      playerId: id,
      themes,
      ...(examples ? { examples } : {}),
    }));
  });
}

/** Host only, while the room waits for them to type the theme. */
export async function chooseTheme(
  code: string,
  theme: string,
): Promise<Result<RoomView>> {
  return run(() =>
    act(code, (id) => ({
      type: "SET_THEME",
      playerId: id,
      text: text(theme, MAX_THEME),
    })),
  );
}

/** Any player, while voting: `option` is the index of the theme. They may change it until everyone has voted. */
export async function voteTheme(
  code: string,
  option: number,
): Promise<Result<RoomView>> {
  return run(() => {
    if (!Number.isInteger(option) || option < 0 || option >= THEME_OPTIONS)
      bad();
    return act(code, (id) => ({ type: "VOTE", playerId: id, option }));
  });
}

// --- match ------------------------------------------------------------------

export async function confirmPick(
  code: string,
  characterId: string,
): Promise<Result<RoomView>> {
  return run(() => confirmed(code, characterId));
}

/**
 * Confirms what is on the caller's pick card in one call: a character of the
 * library (`characterId`), or a name, found in the library or added to it
 * (insert only). A new character's picture is the one the card's draft holds
 * (uploaded through /api/rooms/[code]/draft/image), never a URL from the
 * browser; its id is the draft's, so a clock running out at the same moment
 * makes the same character.
 */
export async function confirmCard(
  code: string,
  card: { characterId: string } | { name: string },
): Promise<Result<RoomView>> {
  return run(async () => {
    if (!card || typeof card !== "object") bad();
    if ("characterId" in card) return confirmed(code, card.characterId);
    const name = text(
      (card as { name: unknown }).name,
      MAX_CHARACTER_NAME,
    ).replace(/\s+/g, " ");
    const room = roomCode(code);
    const who = await me();
    const state = (await getBackend().rooms.get(room))?.state;
    if (!state) throw new GameError("not_found");
    if (state.phase !== "picking") throw new GameError("wrong_phase");
    const player = state.players.find((p) => p.id === who.id);
    const mine = Object.values(state.assignments).find(
      (a) => a.pickerId === who.id,
    );
    if (!player || !mine) throw new GameError("not_member");
    if (mine.character) throw new GameError("already_done");
    if (!allow(`upload:${who.id}`, 30, 60_000))
      throw new GameError("rate_limited");
    const draft = mine.draft ?? null;
    const character = await getOrCreateCharacter({
      id: draft?.newId ?? undefined,
      lang: player.lang,
      name,
      origin: null,
      imageUrl: draft && draft.characterId === null ? draft.imageUrl : null,
      createdBy: who.id,
    });
    return act(room, (id) => ({ type: "PICK", playerId: id, character }));
  });
}

/** PICK with a character the library has. */
async function confirmed(code: string, characterId: unknown) {
  if (typeof characterId !== "string" || characterId.length > 200) bad();
  const character =
    (await getBackend().characters.get(characterId as string)) ?? bad();
  return act(code, (id) => ({ type: "PICK", playerId: id, character }));
}

/**
 * A character for the caller to pick, drawn among the ones players picked
 * most in finished matches with this theme. Fails with "not_enough_picks"
 * until the theme has enough history. `skip` is the one drawn last, so a
 * second press shows someone else. The draw goes on the caller's card (its
 * draft), so it is the pick if the clock runs out; they still confirm it.
 * Never one already picked in the match, the caller's own secret included.
 */
export async function randomPick(
  code: string,
  skip?: string,
): Promise<Result<CharacterDTO>> {
  return run(async () => {
    const who = await me();
    if (!allow(`random:${who.id}`, 30, 60_000))
      throw new GameError("rate_limited");
    const { rooms, matches, characters } = getBackend();
    const state = (await rooms.get(roomCode(code)))?.state;
    if (!state) throw new GameError("not_found");
    if (state.phase !== "picking") throw new GameError("wrong_phase");
    const player = state.players.find((p) => p.id === who.id);
    const mine = Object.values(state.assignments).find(
      (a) => a.pickerId === who.id,
    );
    if (!player || !mine) throw new GameError("not_member");
    if (mine.character) throw new GameError("already_done");
    // A theme the host typed has no history to draw from.
    if (!state.theme || state.theme.set === null)
      throw new GameError("not_enough_picks");
    // Language-free keys: someone else's pick in another language is taken too.
    const taken = new Set(
      Object.values(state.assignments).flatMap((a) => {
        const key = pickKey(a.character?.id ?? null);
        return key ? [key] : [];
      }),
    );
    const popular = await matches.popularPicks(
      themeId(state.theme),
      PICKS_FETCHED,
    );
    const c = await drawPopular(
      popular,
      player.lang,
      taken,
      typeof skip === "string" ? pickKey(skip) : null,
      (ids) => characters.getMany(ids, player.lang),
      Math.random,
    );
    if (!c) throw new GameError("not_enough_picks");
    try {
      await saveDraft(roomCode(code), who.id, {
        characterId: c.id,
        name: c.name,
        imageUrl: null,
      });
    } catch (e) {
      // the card was confirmed or the clock ran out meanwhile: the draw still shows
      if (!(e instanceof GameError)) throw e;
    }
    return toDTO(c);
  });
}

/**
 * The picker's verdict on a character the random button just drew: "no"
 * makes it less likely to be drawn for this theme again, "yes" more.
 */
export async function rateRandomPick(
  code: string,
  characterId: string,
  liked: boolean,
): Promise<Result<null>> {
  return run(async () => {
    const who = await me();
    if (!allow(`rate:${who.id}`, 30, 60_000))
      throw new GameError("rate_limited");
    const key =
      typeof characterId === "string" && characterId.length <= 200
        ? pickKey(characterId)
        : null;
    if (!key || typeof liked !== "boolean") bad();
    const { rooms, matches } = getBackend();
    const state = (await rooms.get(roomCode(code)))?.state;
    if (!state) throw new GameError("not_found");
    if (!state.players.some((p) => p.id === who.id))
      throw new GameError("not_member");
    if (state.phase !== "picking" || !state.theme)
      throw new GameError("wrong_phase");
    const theme = themeId(state.theme);
    // Only characters the button can draw for this theme get a say.
    const known = await matches.popularPicks(theme, PICKS_FETCHED);
    if (!known.some((p) => p.id === key)) bad();
    await matches.rateDraw({
      themeId: theme,
      characterId: key as string,
      userId: who.id,
      liked,
    });
    return null;
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

/** Host only, from the podium: everyone back to the lobby now, without waiting for the clock. */
export async function backToLobby(code: string): Promise<Result<RoomView>> {
  return run(() =>
    act(code, (id) => ({ type: "BACK_TO_LOBBY", playerId: id })),
  );
}

// --- character library --------------------------------------------------------

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
    const same = await findSameName(name, l, origin);
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
    const updated = await auth.updateProfile({ name, avatar });
    await syncIdentity(await auth.identity(await lang()));
    return updated;
  });
}

/** Guests only: a new random name and critter, shown at once in every room they sit in. */
export async function rerollGuest(): Promise<Result<Me>> {
  return run(async () => {
    const l = await lang();
    const current = await getBackend().auth.me(l);
    if (!current.isGuest) throw new GameError("unauthorized");
    if (!allow(`reroll:${current.id}`, 30, 60_000))
      throw new GameError("rate_limited");
    const guest = rerollGuestCookie(await cookies());
    if (!guest) throw new GameError("unauthorized");
    await syncIdentity({
      id: guest.id,
      isGuest: true,
      name: null,
      guestNumber: guest.guestNumber,
      avatar: guest.avatar,
      lang: l,
    });
    return { ...current, guestNumber: guest.guestNumber, avatar: guest.avatar };
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
