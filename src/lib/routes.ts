// Paths of the games hub. Each game has its page; rooms (/new?game=…, /r/CODE) are shared by all games.
import type { GameKey } from "@/game/games";

export const GAMES = "/";
export const WHO_AM_I = "/who-am-i";
export const IMPOSTOR = "/impostor";
export const LINEUP = "/lineup";
export const NEW_ROOM = "/new";

/** Each game's own page. */
export const GAME_PATHS: Record<GameKey, string> = {
  "who-am-i": WHO_AM_I,
  impostor: IMPOSTOR,
  lineup: LINEUP,
};

/** The create-room screen, set up for `game`. */
export const newRoom = (game: GameKey) => `${NEW_ROOM}?game=${game}`;

/** Every listed room; the filters live in the link. */
export const ROOMS = "/rooms";

/** The room list, filtered to `game` when given. */
export const roomsOf = (game?: GameKey) =>
  game ? `${ROOMS}?game=${game}` : ROOMS;

/** Pages of the side menu outside the games. */
export const SETTINGS = "/settings";

/** The characters page, and one character's sheet (over the list from inside the app). */
export const CHARACTERS = "/characters";
/**
 * A character's page; its name, when given, goes after the id as a slug
 * ("/characters/wd-Q302/jesus-christ") for search engines and people reading
 * the link. Only the id picks the character.
 */
export const characterPath = (id: string, name?: string) => {
  const slug = name ? nameSlug(name) : "";
  // the language-free id ("pt-wd-Q302" -> "wd-Q302"): one address per character
  const base = id.replace(/^(?:en|es|ja|pt)-(?=wd-|al-|hand-)/, "");
  return `${CHARACTERS}/${base}${slug ? `/${slug}` : ""}`;
};

/** A name as one URL segment: Latin accents off, lowercase, runs of anything but letters (any script) and digits as "-". */
export const nameSlug = (name: string) =>
  name
    .normalize("NFD")
    // only Latin accents: kana keep their voicing marks once recomposed
    .replace(/[̀-ͯ]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");

/** The Workshop, one suggestion in it (a shared link), and the curators' queue. */
export const WORKSHOP = "/workshop";
export const workshopPath = (id: string) => `${WORKSHOP}/${id}`;
export const WORKSHOP_REVIEW = "/workshop/review";

/** The community pages and the help ones. */
export const RANKINGS = "/rankings";
export const PLAYERS = "/players";
export const CONTRIBUTIONS = "/contributions";
export const NEWS = "/news";
export const PRIVACY = "/privacy";
export const TERMS = "/terms";
