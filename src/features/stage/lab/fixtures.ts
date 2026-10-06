// What the lab's made-up room is made of: the players, the themes, the characters,
// the rule cards. Pictures are drawn here (plain shapes and initials), so the lab
// needs no network, no library and no art it may not show.
import { THEME_SET_KEYS, type ThemeSet } from "@/game/theme-sets";
import type {
  Character,
  ExampleCard,
  Identity,
  Lang,
  Localized,
  PickDraft,
  RuleExamples,
  Theme,
} from "@/game/types";
import type { LabParams } from "./params";

/**
 * What a scene's lab file may add to the room (lab/scenarios/<scene>.ts).
 * Later files win for single values; `queries` add up.
 */
export interface SceneFixtures {
  /** The three themes of the vote; the first one wins (unless it ties). */
  themes?: Theme[];
  /** The rule cards for each of those themes (rule=cards on a first match). */
  examples?: (RuleExamples | null)[];
  /** What the host types (typed=1). */
  typedTheme?: string;
  /** The character picked for each player, by seat. */
  characters?: Character[];
  /** What the viewer left on their card when the pick clock ran out (timeout=1). */
  draft?: PickDraft | null;
  /** The viewer's question on the first turn. */
  question?: string;
  /**
   * React Query data the screens read, written into the lab's own query
   * client before the stage renders (the hand, the chat): `key` is the
   * query key the hook uses.
   */
  queries?: { key: readonly unknown[]; data: unknown }[];
}

/** A plain drawn portrait: a head and shoulders on a coloured ground, with initials. */
export function portrait(name: string, ground: string, ink = "#1e2433") {
  const initials = name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => [...w][0]?.toUpperCase() ?? "")
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100"><rect width="80" height="100" fill="${ground}"/><circle cx="40" cy="38" r="17" fill="${ink}" opacity=".22"/><path d="M8 100c3-24 17-36 32-36s29 12 32 36z" fill="${ink}" opacity=".22"/><text x="40" y="92" font-family="system-ui,sans-serif" font-size="15" font-weight="700" text-anchor="middle" fill="${ink}" opacity=".7">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const GROUNDS = [
  "#f4c7d9",
  "#bfe6c8",
  "#d9c7f4",
  "#bfe3ea",
  "#f3d3b8",
  "#f2e3a8",
];

export function labCharacter(
  id: string,
  name: string,
  origin: string | null,
  i: number,
  lang: Lang = "en",
): Character {
  return {
    id,
    lang,
    name,
    origin,
    imageUrl: portrait(name, GROUNDS[i % GROUNDS.length]),
    aliases: [],
  };
}

export function exampleCard(id: string, name: string, i: number): ExampleCard {
  return {
    id,
    imageUrl: portrait(name, GROUNDS[i % GROUNDS.length]),
    names: { en: name, pt: name, ja: name },
  };
}

/** Short account names, as in the prototype. */
const SHORT = ["Bia", "Rafa", "Leo", "Nina"];
/** Guests whose Portuguese names are 16 characters (the longest a name gets). */
const LONG_GUESTS = [532, 956, 843, 99]; // RaposaMisteriosa, PandaAventureiro, PandaTrabalhador, GatoAconchegante
const CRITTERS = ["bia", "rafa", "leo", "nina"];
const COLORS = ["#F4C7D9", "#BFE3EA", "#F2E3A8", "#D9C7F4"];

/** The players by seat; the host sits first. */
export function labPlayers(params: LabParams): Identity[] {
  return Array.from({ length: params.players }, (_, i) => ({
    id: `lab-${i + 1}`,
    isGuest: params.names === "long",
    name: params.names === "long" ? null : SHORT[i],
    guestNumber: params.names === "long" ? LONG_GUESTS[i] : 100 + i,
    avatar: { kind: "critter", seed: CRITTERS[i], color: COLORS[i] },
    lang: "pt",
  }));
}

/** One theme per set, in every language (the client lab can't read local mode's fixtures: builds with the Supabase keys leave them out). */
const LAB_SET_THEMES: Record<ThemeSet, Localized> = {
  screen: {
    en: "Disney characters",
    es: "Personajes de Disney",
    pt: "Personagens da Disney",
    ja: "ディズニーのキャラクター",
  },
  cartoons: {
    en: "The Simpsons characters",
    es: "Personajes de Los Simpson",
    pt: "Personagens dos Simpsons",
    ja: "シンプソンズのキャラクター",
  },
  anime: {
    en: "Dragon Ball characters",
    es: "Personajes de Dragon Ball",
    pt: "Personagens de Dragon Ball",
    ja: "ドラゴンボールのキャラクター",
  },
  games: { en: "Pokémon", es: "Pokémon", pt: "Pokémon", ja: "ポケモン" },
  books: {
    en: "Fairy tale characters",
    es: "Personajes de cuentos de hadas",
    pt: "Personagens de contos de fadas",
    ja: "おとぎ話のキャラクター",
  },
  heroes: {
    en: "Superheroes",
    es: "Superhéroes",
    pt: "Super-heróis",
    ja: "スーパーヒーロー",
  },
  powers: {
    en: "Characters who can fly",
    es: "Personajes que vuelan",
    pt: "Personagens que voam",
    ja: "空を飛べるキャラクター",
  },
  myths: { en: "Vampires", es: "Vampiros", pt: "Vampiros", ja: "吸血鬼" },
  scifi: { en: "Robots", es: "Robots", pt: "Robôs", ja: "ロボット" },
  warriors: { en: "Pirates", es: "Piratas", pt: "Piratas", ja: "海賊" },
  animals: { en: "Cats", es: "Gatos", pt: "Gatos", ja: "猫のキャラクター" },
  music: {
    en: "Female singers",
    es: "Cantantes femeninas",
    pt: "Cantoras",
    ja: "女性歌手",
  },
  celebs: {
    en: "Comedians",
    es: "Comediantes",
    pt: "Comediantes",
    ja: "お笑い芸人",
  },
  sports: {
    en: "Soccer players",
    es: "Futbolistas",
    pt: "Jogadores de futebol",
    ja: "サッカー選手",
  },
  history: { en: "Kings", es: "Reyes", pt: "Reis", ja: "王様" },
  world: {
    en: "Famous Brazilians",
    es: "Brasileños famosos",
    pt: "Brasileiros famosos",
    ja: "有名なブラジル人",
  },
  jobs: { en: "Detectives", es: "Detectives", pt: "Detetives", ja: "探偵" },
  family: {
    en: "Twins",
    es: "Gemelos",
    pt: "Gêmeos",
    ja: "双子のキャラクター",
  },
  quirks: {
    en: "Clumsy characters",
    es: "Personajes torpes",
    pt: "Personagens desastrados",
    ja: "ドジなキャラクター",
  },
  looks: {
    en: "Characters who wear a hat",
    es: "Personajes que usan sombrero",
    pt: "Personagens de chapéu",
    ja: "帽子をかぶったキャラクター",
  },
};

/** Four themes from four sets: `set`'s wins, the others come from the next sets. */
export function labThemes(set: ThemeSet): Theme[] {
  const at = THEME_SET_KEYS.indexOf(set);
  return [0, 1, 2, 3].map((k) => {
    const s = THEME_SET_KEYS[(at + k * 3) % THEME_SET_KEYS.length];
    return { ...LAB_SET_THEMES[s], set: s };
  });
}

/** One character per seat (the same in every language: the lab is about the stage, not the library). */
export const LAB_CHARACTERS: Character[] = [
  labCharacter("lab-c1", "Spider-Man", "Marvel", 0),
  labCharacter("lab-c2", "Wonder Woman", "DC", 1),
  labCharacter("lab-c3", "Black Panther", "Marvel", 2),
  labCharacter("lab-c4", "Batgirl", "DC", 3),
];

/** ✓✓ and ✗, the same for every theme. */
export const LAB_EXAMPLES: RuleExamples = {
  fits: [
    exampleCard("lab-e1", "Spider-Man", 0),
    exampleCard("lab-e2", "Storm", 1),
  ],
  misfit: exampleCard("lab-e3", "Shrek", 2),
};
