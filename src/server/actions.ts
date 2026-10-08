"use server";
// Every mutation the UI can make. Reads go through the route handlers under /api.

import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { knownAs } from "@/game/character-search";
import { GAME_KEYS, OPEN_GAMES } from "@/game/games";
import { GOSTO_KEYS, type Gosto } from "@/game/gostos";
import type { ImpAnswer } from "@/game/impostor/types";
import {
  COINS,
  LOTS_PER_SEAT,
  OFF_MISSIONS_MAX,
  ROUNDS,
} from "@/game/lineup/rules";
import { parseSynced } from "@/game/options";
import { themeId } from "@/game/theme-id";
import {
  ANSWERS,
  type AnswerValue,
  DEFAULT_SETTINGS,
  GameError,
  type GameEvent,
  type Identity,
  LANGS,
  type Lang,
  MAX_CHARACTER_NAME,
  MAX_GUESS,
  MAX_NOTE,
  MAX_QUESTION,
  MAX_THEME,
  OFF_THEMES_MAX,
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
import { background } from "./background";
import {
  type CharacterDTO,
  type CreateRoomInput,
  fail,
  type Me,
  ok,
  type Result,
} from "./contract";
import { readImage } from "./images";
import { impostorRound } from "./impostor";
import { deleteLine, postLine, reportLine } from "./mural";
import { countPick, nameWithPicture, sendPicture, wearing } from "./pictures";
import {
  checkHandle as checkHandleFor,
  editProfile,
  type HandleCheck,
} from "./profile-edit";
import { allow } from "./rate-limit";
import {
  currentMatch,
  dispatch,
  hasNewcomer,
  leaveOtherRooms,
  normalizeCode,
  openRoom,
  roundExamples,
  roundThemes,
  saveDraft,
  syncIdentity,
  themeRanking,
} from "./rooms";
import { showMe } from "./shown";
import { drawFit, pickKey } from "./theme-picks";

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
  return toView(state, version, who.id, Date.now(), await lang());
}

// --- rooms ------------------------------------------------------------------

const seconds = z.number().int().min(STEP_SECONDS_MIN).max(STEP_SECONDS_MAX);

const createSchema = z.object({
  game: z.enum(GAME_KEYS).refine((g) => OPEN_GAMES.includes(g)),
  name: z.string().trim().min(1).max(ROOM_NAME_MAX),
  visibility: z.enum(["public", "private"]),
  password: z.string().trim().max(ROOM_PASSWORD_MAX),
  // the engine checks the game's own range
  seats: z.number().int().min(2).max(10),
  voteSeconds: seconds,
  askSeconds: seconds,
  guessSeconds: seconds,
  answerSeconds: seconds,
  validateSeconds: seconds,
  replySeconds: seconds,
  talkSeconds: seconds,
  lastSeconds: seconds,
  lotSeconds: seconds,
  tradeSeconds: seconds,
  defendSeconds: seconds,
  judgeSeconds: seconds,
  impostors: z.number().int().min(1).max(3).nullable(),
  themeMode: z.enum(["vote", "host"]),
  offGostos: z
    .array(z.enum(GOSTO_KEYS as [Gosto, ...Gosto[]]))
    .max(GOSTO_KEYS.length - 1),
  offThemes: z.array(z.string().regex(/^[a-z0-9-]{1,80}$/)).max(OFF_THEMES_MAX),
  coins: z.number().int().min(COINS.min).max(COINS.max),
  lotsPerSeat: z.number().int().min(LOTS_PER_SEAT.min).max(LOTS_PER_SEAT.max),
  rounds: z.number().int().min(ROUNDS.min).max(ROUNDS.max).nullable(),
  interval: z.boolean(),
  trades: z.boolean(),
  heavy: z.boolean(),
  offMissions: z
    .array(z.string().regex(/^[a-z0-9-]{1,80}$/))
    .max(OFF_MISSIONS_MAX),
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

/** Host only, lobby only: takes `targetId` out of the room for KICK_MS. */
export async function kickPlayer(
  code: string,
  targetId: string,
): Promise<Result<RoomView>> {
  return run(async () => {
    if (typeof targetId !== "string" || !targetId) bad();
    return act(code, (id) => ({ type: "KICK", playerId: id, targetId }));
  });
}

/**
 * Host only, 2+ players. Draws the themes everyone votes on (or the host's
 * ideas, when they type the theme), avoiding the last vote's. A room's first
 * match, or one where someone seated plays their first ever, gets the long
 * shows; its vote brings the rule scene's cards for each theme along.
 */
export async function startGame(code: string): Promise<Result<RoomView>> {
  return run(async () => {
    const stored = await getBackend().rooms.get(roomCode(code));
    // the Impostor deals its cards with the themes it puts to the vote
    if (stored?.state.settings.game === "impostor") {
      const [round, newcomer] = await Promise.all([
        impostorRound(stored.state, stored.state.vote?.options ?? []),
        hasNewcomer(stored.state),
      ]);
      return act(code, (id) => ({
        type: "START",
        playerId: id,
        themes: round.themes,
        deals: round.deals,
        ...(newcomer ? { newcomer } : {}),
      }));
    }
    const [themes, newcomer] = stored
      ? await Promise.all([
          roundThemes(stored.state, stored.state.vote?.options ?? []),
          hasNewcomer(stored.state),
        ])
      : [[], false];
    const examples =
      stored?.state.settings.themeMode === "vote"
        ? await roundExamples(stored.state, themes, newcomer)
        : undefined;
    return act(code, (id) => ({
      type: "START",
      playerId: id,
      themes,
      ...(examples ? { examples } : {}),
      ...(newcomer ? { newcomer } : {}),
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
/** Votes for theme `option`; null takes the vote back (and the time it cut). */
export async function voteTheme(
  code: string,
  option: number | null,
): Promise<Result<RoomView>> {
  return run(() => {
    if (option === null)
      return act(code, (id) => ({ type: "UNVOTE", playerId: id }));
    if (!Number.isInteger(option) || option < 0 || option >= THEME_OPTIONS)
      bad();
    return act(code, (id) => ({ type: "VOTE", playerId: id, option }));
  });
}

// --- impostor -----------------------------------------------------------------

const answerSchema = z.union([
  z.object({ n: z.number().int().min(0).max(12) }).strict(),
  z.object({ word: z.string().max(80) }).strict(),
]);

/** Answers the open question about your card (again to change it); null takes the answer back. */
export async function replyCard(
  code: string,
  answer: ImpAnswer | null,
): Promise<Result<RoomView>> {
  return run(() => {
    if (answer === null)
      return act(code, (id) => ({ type: "UNREPLY", playerId: id }));
    const parsed = answerSchema.safeParse(answer);
    if (!parsed.success) bad();
    return act(code, (id) => ({
      type: "REPLY",
      playerId: id,
      answer: parsed.data as ImpAnswer,
    }));
  });
}

const playerId = (raw: unknown) =>
  typeof raw === "string" && raw.length > 0 && raw.length <= 80 ? raw : bad();

/** Points at a suspect (null: at nobody). Free: it counts for nothing. */
export async function pointAt(
  code: string,
  targetId: string | null,
): Promise<Result<RoomView>> {
  return run(() =>
    act(code, (id) => ({
      type: "POINT",
      playerId: id,
      targetId: targetId === null ? null : playerId(targetId),
    })),
  );
}

/** Confirms a vote to send `targetId` out; null takes it back (and the time it cut). */
export async function accuse(
  code: string,
  targetId: string | null,
): Promise<Result<RoomView>> {
  return run(() =>
    act(code, (id) =>
      targetId === null
        ? { type: "UNACCUSE", playerId: id }
        : { type: "ACCUSE", playerId: id, targetId: playerId(targetId) },
    ),
  );
}

/** "I don't know this one": everyone gets new cards, nobody is told who asked. */
export async function dontKnowCard(code: string): Promise<Result<RoomView>> {
  return run(() => act(code, (id) => ({ type: "DONT_KNOW", playerId: id })));
}

/** A caught impostor's last chance: their guess at the crew's card. */
export async function guessCrewCard(
  code: string,
  guess: string,
): Promise<Result<RoomView>> {
  return run(() =>
    act(code, (id) => ({
      type: "LAST_GUESS",
      playerId: id,
      text: text(guess, MAX_GUESS),
    })),
  );
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
 * library (`characterId`, under the name the card shows when that is one of
 * its aliases), or a name, found in the library or added to it (insert
 * only). A new character's picture is the one the card's draft holds
 * (uploaded through /api/rooms/[code]/draft/image), never a URL from the
 * browser; its id is the draft's, so a clock running out at the same moment
 * makes the same character.
 */
export async function confirmCard(
  code: string,
  card: { characterId: string; name?: string } | { name: string },
): Promise<Result<RoomView>> {
  return run(async () => {
    if (!card || typeof card !== "object") bad();
    if ("characterId" in card)
      return confirmed(code, card.characterId, card.name);
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
    const character = await nameWithPicture({
      id: draft?.newId ?? undefined,
      lang: player.lang,
      name,
      origin: null,
      imageUrl: draft && draft.characterId === null ? draft.imageUrl : null,
      createdBy: who.id,
    });
    const view = await act(room, (id) => ({
      type: "PICK",
      playerId: id,
      character,
    }));
    background(() => countPick(character, who.id, draft));
    return view;
  });
}

/**
 * PICK with a character the library has, under the name the caller's card
 * shows when it is one of its aliases (any other name keeps its own), wearing
 * the picture the card shows for it.
 */
async function confirmed(code: string, characterId: unknown, name?: unknown) {
  if (typeof characterId !== "string" || characterId.length > 200) bad();
  const room = roomCode(code);
  const who = await me();
  const { characters, rooms } = getBackend();
  const [found, stored] = await Promise.all([
    characters.get(characterId as string),
    rooms.get(room),
  ]);
  const draft = Object.values(stored?.state.assignments ?? {}).find(
    (a) => a.pickerId === who.id,
  )?.draft;
  const shown =
    typeof name === "string" && name.length <= MAX_CHARACTER_NAME
      ? knownAs(found ?? bad(), name)
      : (found ?? bad());
  const character = wearing(shown, draft);
  const suggested =
    draft?.characterId === character.id && draft.suggested === true;
  const view = await act(room, (id) => ({
    type: "PICK",
    playerId: id,
    character,
    suggested,
  }));
  background(() => countPick(character, who.id, draft));
  return view;
}

/**
 * A character for the caller to pick, drawn among the theme's best fits for
 * their language (its history and starters, see rankTheme). Fails with
 * "not_enough_picks" when the theme has neither. `skip` is the one drawn
 * last, so a second press shows someone else. The draw goes on the caller's card (its
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
    const { rooms, characters } = getBackend();
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
    const c = await drawFit(
      await themeRanking(themeId(state.theme), player.lang),
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
        suggested: true,
      });
    } catch (e) {
      // the card was confirmed or the clock ran out meanwhile: the draw still shows
      if (!(e instanceof GameError)) throw e;
    }
    return toDTO(c);
  });
}

/**
 * The picker's verdict on a character the random button just drew: did it
 * fit the theme? "No" makes it less likely to be drawn or shown for the
 * theme again, "yes" more; most for players of the picker's language.
 */
export async function rateRandomPick(
  code: string,
  characterId: string,
  fits: boolean,
): Promise<Result<null>> {
  return run(async () => {
    const who = await me();
    if (!allow(`rate:${who.id}`, 30, 60_000))
      throw new GameError("rate_limited");
    const key =
      typeof characterId === "string" && characterId.length <= 200
        ? pickKey(characterId)
        : null;
    if (!key || typeof fits !== "boolean") bad();
    const { rooms, matches } = getBackend();
    const state = (await rooms.get(roomCode(code)))?.state;
    if (!state) throw new GameError("not_found");
    const player = state.players.find((p) => p.id === who.id);
    if (!player) throw new GameError("not_member");
    if (state.phase !== "picking" || !state.theme)
      throw new GameError("wrong_phase");
    const theme = themeId(state.theme);
    // Only characters the button can draw for this theme get a say.
    const ranked = await themeRanking(theme, player.lang);
    if (!ranked.some((f) => f.id === key)) bad();
    await matches.voteFit({
      themeId: theme,
      characterId: key as string,
      voterId: who.id,
      lang: player.lang,
      fits,
    });
    return null;
  });
}

/**
 * A player's verdict on the character they just discovered, once they know
 * who they were: did it fit the theme? It counts like a verdict on a draw.
 */
export async function rateFoundCharacter(
  code: string,
  fits: boolean,
): Promise<Result<null>> {
  return run(async () => {
    const who = await me();
    if (!allow(`rate:${who.id}`, 30, 60_000))
      throw new GameError("rate_limited");
    if (typeof fits !== "boolean") bad();
    const { rooms, matches } = getBackend();
    const state = (await rooms.get(roomCode(code)))?.state;
    if (!state) throw new GameError("not_found");
    const player = state.players.find((p) => p.id === who.id);
    if (!player) throw new GameError("not_member");
    if (state.outcomes[who.id]?.discoveredAt == null || !state.theme)
      throw new GameError("wrong_phase");
    const key = pickKey(state.assignments[who.id]?.character?.id ?? null);
    // a stand-in character has no say in the theme
    if (!key) return null;
    await matches.voteFit({
      themeId: themeId(state.theme),
      characterId: key,
      voterId: who.id,
      lang: player.lang,
      fits,
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
    // a name the library has is reused, and the picture becomes one of its
    const picture = image ? await sendPicture(who, null, image) : null;
    return toDTO(
      await nameWithPicture({
        lang: l,
        name,
        origin,
        imageUrl: picture?.url ?? null,
        createdBy: who.id,
      }),
    );
  });
}

// --- identity -----------------------------------------------------------------

/**
 * The profile editor's save, accounts only. FormData: name, handle, quote,
 * accent, banner ("none" | "keep" | "preset:<id>" | "upload" + bannerImage),
 * about, showcase and privacy (JSON), and the avatar: color, avatar
 * ("creature" + dna | "provider" | "upload" + image | "keep").
 */
export async function saveProfile(form: FormData): Promise<Result<Me>> {
  return run(async () => {
    const { auth } = getBackend();
    const l = await lang();
    const current = await auth.me(l);
    if (current.isGuest) throw new GameError("unauthorized");
    if (!allow(`profile-save:${current.id}`, 20, 60_000))
      throw new GameError("rate_limited");
    const updated = await editProfile(current, form, l);
    await syncIdentity(await auth.identity(l));
    return showMe(updated, l);
  });
}

/** Whether the caller may take this @handle, asked while they type it. */
export async function checkHandle(raw: string): Promise<Result<HandleCheck>> {
  return run(async () => {
    const current = await getBackend().auth.me(await lang());
    if (current.isGuest) throw new GameError("unauthorized");
    if (typeof raw !== "string" || raw.length > 40) bad();
    if (!allow(`handle-check:${current.id}`, 120, 60_000))
      throw new GameError("rate_limited");
    return checkHandleFor(current.id, raw);
  });
}

/** A line on `handle`'s mural, or a reply to one of its top lines; its id. */
export async function postMuralLine(
  handle: string,
  body: string,
  parentId: number | null,
): Promise<Result<number>> {
  return run(async () => {
    if (typeof handle !== "string" || handle.length > 40) bad();
    if (parentId !== null && !Number.isSafeInteger(parentId)) bad();
    return postLine(handle, await me(), body, parentId);
  });
}

/** Takes a mural line down (the mural's owner, or its author). */
export async function deleteMuralLine(id: number): Promise<Result> {
  return run(async () => {
    if (!Number.isSafeInteger(id)) bad();
    await deleteLine(id, (await me()).id);
  });
}

/** Reports a mural line; whether it is hidden now. */
export async function reportMuralLine(id: number): Promise<Result<boolean>> {
  return run(async () => {
    if (!Number.isSafeInteger(id)) bad();
    const who = await me();
    if (!allow(`mural-report:${who.id}`, 30, 60_000))
      throw new GameError("rate_limited");
    return reportLine(id, who);
  });
}

/** Guests only: a new random name and its creature, shown at once in every room they sit in. */
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
    return showMe(
      { ...current, guestNumber: guest.guestNumber, avatar: guest.avatar },
      l,
    );
  });
}

export async function signOut(): Promise<Result> {
  return run(() => getBackend().auth.signOut());
}

/** Ends every session of the account, on every device. */
export async function signOutEverywhere(): Promise<Result> {
  return run(() => getBackend().auth.signOut(true));
}

/** Unlinks Discord or Google from the account; the last one stays. */
export async function unlinkProvider(provider: string): Promise<Result> {
  return run(async () => {
    if (provider !== "discord" && provider !== "google") bad();
    await getBackend().auth.unlink(provider as "discord" | "google");
  });
}

/**
 * Deletes the account, once its @handle is typed back. Its matches stay,
 * without a name; the profile, its mural and its badges go.
 */
export async function deleteAccount(handle: string): Promise<Result> {
  return run(async () => {
    const { auth } = getBackend();
    const current = await auth.me(await lang());
    if (current.isGuest) throw new GameError("unauthorized");
    if (typeof handle !== "string" || handle.trim() !== current.handle) bad();
    await auth.deleteAccount();
  });
}

/** What follows the account between devices: theme, chat bubbles, game options. */
export async function saveAccountSettings(raw: unknown): Promise<Result> {
  return run(async () => {
    const { auth, profiles } = getBackend();
    const current = await auth.me(await lang());
    if (current.isGuest) throw new GameError("unauthorized");
    if (!allow(`settings:${current.id}`, 30, 60_000))
      throw new GameError("rate_limited");
    await profiles.update(current.id, { settings: parseSynced(raw) });
  });
}

/** Local mode only: flips the current guest into a fake account so the profile screen can be used without Supabase. */
export async function enterTestAccount(
  provider: "discord" | "google" = "discord",
): Promise<Result<Me>> {
  return run(async () => {
    const auth = getBackend().auth;
    if (!auth.enterTestAccount) throw new GameError("unauthorized");
    if (provider !== "discord" && provider !== "google") bad();
    return showMe(await auth.enterTestAccount(provider), await lang());
  });
}
