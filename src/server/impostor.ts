import "server-only";
import { gostoAllowed } from "@/game/gostos";
import {
  type Audience,
  type BankQuestion,
  pickQuestions,
} from "@/game/impostor/questions";
import type { ImpDeal, ImpPair } from "@/game/impostor/types";
import { normalizeName } from "@/game/match";
import { themeId } from "@/game/theme-id";
import {
  type Character,
  type Lang,
  type RoomState,
  THEME_OPTIONS,
  type Theme,
} from "@/game/types";
import { getBackend } from "./backend";
import { entryId, parseEntryId } from "./backend/seed-format";
import type { CharacterFacts } from "./backend/types";
import { roomFilter, themeRanking } from "./rooms";
import type { ThemeFit } from "./theme-picks";

/** The crew's card comes from the theme's best fits, like the dice. */
const CREW_POOL = 20;
/** How deep in the theme's ranking the impostor's card may come from. */
const RANKED = 60;
/** Same work or job: the impostor's card is a neighbour, so answers stay close. */
const SAME_WORK = 3;
const SAME_CATEGORY = 1.5;
/** Fame apart by this much (popularity points) weighs nothing more than the floor. */
const FAME_SPAN = 8000;
const FAME_FLOOR = 0.2;
/** Pairs kept for "I don't know this one". */
const SPARES = 2;
/** Themes tried for the vote's four: some have too few known characters. */
const CANDIDATES = 8;

/** A character's id in every language ("pt-wd-Q302" → "wd-Q302"). */
const libraryId = (id: string) => parseEntryId(id)?.id ?? id;

interface Known {
  fit: ThemeFit;
  facts: CharacterFacts;
}

function weighted<T>(
  items: T[],
  weight: (t: T) => number,
  random: () => number,
) {
  const w = items.map((t) => Math.max(0.0001, weight(t)));
  let roll = random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) {
    roll -= w[i];
    if (roll < 0) return items[i];
  }
  return items.at(-1);
}

/** How close the impostor's card sits to the crew's: same work, same category, alike in fame. */
function nearness(crew: CharacterFacts, other: CharacterFacts) {
  const work =
    crew.work &&
    other.work &&
    crew.work.toLowerCase() === other.work.toLowerCase()
      ? SAME_WORK
      : crew.category && crew.category === other.category
        ? SAME_CATEGORY
        : 1;
  const gap = Math.abs((crew.popularity ?? 0) - (other.popularity ?? 0));
  return work * Math.max(FAME_FLOOR, 1 - gap / FAME_SPAN);
}

/** A crew card and its impostor from `pool`, skipping `used`; null when two aren't left. */
function drawPair(pool: Known[], used: Set<string>, random: () => number) {
  const free = pool.filter((k) => !used.has(k.fit.id));
  if (free.length < 2) return null;
  const crew = weighted(free.slice(0, CREW_POOL), (k) => k.fit.score, random);
  if (!crew) return null;
  const rest = free.filter((k) => k !== crew);
  const impostor = weighted(
    rest,
    (k) => k.fit.score * nearness(crew.facts, k.facts),
    random,
  );
  return impostor ? { crew, impostor } : null;
}

const isReal = (f: CharacterFacts) => !!f.gostos?.includes("real");

/** Questions that fit both cards: fiction, real people, or (one of each) both. */
function audienceOf(a: CharacterFacts, b: CharacterFacts): Audience {
  if (isReal(a) && isReal(b)) return "real";
  if (!isReal(a) && !isReal(b)) return "fiction";
  return "all";
}

/**
 * The cards for one theme in `lang`: the crew's from its best known fits,
 * the impostor's a neighbour of it, spares for "I don't know", and the
 * match's questions. Null when the theme has too few characters known there.
 * `fallback` deals from the language's popular characters instead of the
 * theme's (a room whose themes have no history at all, as in local mode).
 */
async function dealFor(
  theme: Theme,
  lang: Lang,
  state: RoomState,
  bank: readonly BankQuestion[],
  random: () => number,
  fallback = false,
): Promise<ImpDeal | null> {
  const { characters } = getBackend();
  const { offGostos } = roomFilter(state);
  let ranked: ThemeFit[];
  if (fallback) {
    const popular = await characters.randomPopular(lang, 40);
    ranked = popular.map((c) => ({
      id: libraryId(c.id),
      score: 1,
      picks: 0,
      fits: 0,
    }));
  } else {
    if (!theme.set) return null;
    ranked = (await themeRanking(themeId(theme), lang)).slice(0, RANKED);
  }
  if (ranked.length < 2) return null;
  const [facts, floor] = await Promise.all([
    characters.facts(
      ranked.map((f) => f.id),
      lang,
    ),
    characters.knownFloor(lang),
  ]);
  const byId = new Map(facts.map((f) => [f.id, f]));
  const pool: Known[] = ranked.flatMap((fit) => {
    const f = byId.get(fit.id);
    if (!f || f.popularity === null) return [];
    if (floor !== null && f.popularity < floor) return [];
    if (!gostoAllowed(f.gostos, offGostos)) return [];
    return [{ fit, facts: f }];
  });
  const used = new Set<string>();
  const pairs: { crew: Known; impostor: Known }[] = [];
  for (let i = 0; i <= SPARES; i++) {
    const pair = drawPair(pool, used, random);
    if (!pair) break;
    used.add(pair.crew.fit.id);
    used.add(pair.impostor.fit.id);
    pairs.push(pair);
  }
  if (!pairs.length) return null;
  const cards = new Map(
    (
      await characters.getMany(
        [...used].map((id) => (id.startsWith("u-") ? id : entryId(lang, id))),
        lang,
      )
    ).map((c) => [libraryId(c.id), c]),
  );
  const resolved: (ImpPair & { audience: Audience })[] = pairs.flatMap((p) => {
    const crew = cards.get(p.crew.fit.id);
    const impostor = cards.get(p.impostor.fit.id);
    // two names that read the same would make the impostor's card no different
    if (!crew || !impostor) return [];
    if (normalizeName(crew.name) === normalizeName(impostor.name)) return [];
    return [
      {
        crew: lean(crew),
        impostor: lean(impostor),
        audience: audienceOf(p.crew.facts, p.impostor.facts),
      },
    ];
  });
  const [first, ...spares] = resolved;
  if (!first) return null;
  return {
    crew: first.crew,
    impostor: first.impostor,
    spares: spares.map(({ crew, impostor }) => ({ crew, impostor })),
    questions: pickQuestions(bank, {
      set: theme.set,
      themeId: theme.set ? themeId(theme) : null,
      audience: first.audience,
      recent: state.recentQuestions ?? [],
      random,
    }),
  };
}

/** A card as the match keeps it: a guess only needs a handful of aliases. */
const lean = (c: Character): Character => ({
  ...c,
  aliases: c.aliases.slice(0, 12),
});

/**
 * The vote's four themes for an Impostor round and their cards, in the
 * host's language: themes the room lets in whose characters are known
 * enough to deal; the language's popular characters stand in for a theme
 * that has none to give.
 */
export async function impostorRound(
  state: RoomState,
  avoid: Theme[],
  random: () => number = Math.random,
): Promise<{ themes: Theme[]; deals: ImpDeal[] }> {
  const { themes, impostor } = getBackend();
  const host = state.players.find((p) => p.id === state.hostId);
  const lang: Lang = host?.lang ?? "en";
  const [candidates, bank] = await Promise.all([
    themes.draw(avoid, CANDIDATES, roomFilter(state)),
    impostor.list().catch(() => [] as BankQuestion[]),
  ]);
  const dealt = await Promise.all(
    candidates.map((t) =>
      dealFor(t, lang, state, bank, random).catch(() => null),
    ),
  );
  const out: { theme: Theme; deal: ImpDeal }[] = [];
  candidates.forEach((theme, i) => {
    const deal = dealt[i];
    if (deal && out.length < THEME_OPTIONS) out.push({ theme, deal });
  });
  for (const theme of candidates) {
    if (out.length >= THEME_OPTIONS) break;
    if (out.some((o) => o.theme === theme)) continue;
    const deal = await dealFor(theme, lang, state, bank, random, true).catch(
      () => null,
    );
    if (deal) out.push({ theme, deal });
  }
  return {
    themes: out.map((o) => o.theme),
    deals: out.map((o) => o.deal),
  };
}
