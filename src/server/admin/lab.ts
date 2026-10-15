import "server-only";
import type { LabScene } from "@/features/lab/scene";
import {
  type LabKit,
  type LabSettings,
  labPeople,
  rng,
  seatsOf,
} from "@/features/lab/sim";
import { createRoom, reduce } from "@/game/engine";
import { isGameKey } from "@/game/games";
import {
  DEFAULT_SETTINGS,
  GameError,
  LANGS,
  type Lang,
  type RoomState,
  THEME_OPTIONS,
} from "@/game/types";
import { adminOnly } from "@/server/auth/roles";
import { getBackend } from "../backend";
import type { StoredLabScene } from "../backend/admin-types";
import { impostorRound } from "../impostor";
import { lineupDecks } from "../lineup";
import { roomFilter, roundExamples, roundThemes } from "../rooms";

const QUESTIONS: Record<Lang, string[]> = {
  pt: [
    "Eu sou humano?",
    "Eu sou de um filme?",
    "Eu tenho poderes?",
    "Eu sou famoso?",
  ],
  en: [
    "Am I human?",
    "Am I from a movie?",
    "Do I have powers?",
    "Am I famous?",
  ],
  es: [
    "¿Soy humano?",
    "¿Salgo en una película?",
    "¿Tengo poderes?",
    "¿Soy famoso?",
  ],
  ja: ["人間？", "映画のキャラ？", "超能力がある？", "有名？"],
};
const TYPED: Record<Lang, string> = {
  pt: "Piratas do espaço",
  en: "Space pirates",
  es: "Piratas del espacio",
  ja: "宇宙海賊",
};

/** The lab's room before its start, as a real start would see it. */
function labState(s: LabSettings): RoomState {
  const people = labPeople(s.players, s.seed, s.lang);
  const random = rng(s.seed);
  const now = Date.now();
  let state = createRoom(
    "LAB01",
    people[0],
    { ...DEFAULT_SETTINGS, game: s.game, seats: seatsOf(s.game).max },
    { now, random },
  );
  for (const p of people.slice(1))
    state = reduce(state, { type: "JOIN", player: p }, { now, random });
  return state;
}

/** What a real start would get for this match: themes and rule cards, the Impostor's deals, What for?'s decks. */
export async function labKit(raw: LabSettings): Promise<LabKit> {
  await adminOnly();
  if (!isGameKey(raw.game)) throw new GameError("invalid_input");
  const lang = (LANGS as readonly string[]).includes(raw.lang)
    ? raw.lang
    : "pt";
  const s: LabSettings = {
    ...raw,
    lang,
    players: Math.max(
      seatsOf(raw.game).min,
      Math.min(seatsOf(raw.game).max, raw.players),
    ),
  };
  const state = labState(s);
  const random = rng(s.seed);
  const { characters, themes } = getBackend();
  const [popular, timeoutThemes] = await Promise.all([
    characters.randomPopular(lang, 24).catch(() => []),
    Promise.resolve(themes.drawFromBank(THEME_OPTIONS, roomFilter(state))),
  ]);
  let start: LabKit["start"];
  if (s.game === "impostor") start = await impostorRound(state, [], random);
  else if (s.game === "lineup")
    start = { decks: await lineupDecks(state, random) };
  else {
    const drawn = await roundThemes(state, []);
    const examples =
      s.match === "first"
        ? await roundExamples(state, drawn, false)
        : undefined;
    start = { themes: drawn, ...(examples ? { examples } : {}) };
  }
  return {
    start,
    bot: {
      characters: popular,
      questions: QUESTIONS[lang],
      typedTheme: TYPED[lang],
    },
    fallback: popular,
    timeoutThemes,
  };
}

/** The rooms open now, to start the lab from one. */
export async function labRooms() {
  await adminOnly();
  const listed = await getBackend().rooms.listActive(0);
  return listed;
}

/** A real room's state, to play on from in the lab. */
export async function labRoom(code: string): Promise<RoomState> {
  await adminOnly();
  const stored = await getBackend().rooms.get(code.toUpperCase());
  if (!stored) throw new GameError("not_found");
  return stored.state;
}

/** The saved scenes, newest first. */
export async function labScenes(): Promise<StoredLabScene[]> {
  await adminOnly();
  return getBackend().admin.labScenes(60);
}

export async function labScene(id: string): Promise<StoredLabScene | null> {
  await adminOnly();
  return getBackend().admin.labScene(id);
}

export async function saveLabScene(
  scene: LabScene,
  name: string,
  note: string | null,
): Promise<string> {
  const me = await adminOnly();
  const clean = name.trim().slice(0, 80) || "Cena sem nome";
  return getBackend().admin.saveLabScene({
    name: clean,
    game: scene.settings.game,
    params: scene,
    note: note?.trim().slice(0, 500) || null,
    author: me.id,
  });
}

export async function deleteLabScene(id: string): Promise<void> {
  await adminOnly();
  await getBackend().admin.deleteLabScene(id);
}
