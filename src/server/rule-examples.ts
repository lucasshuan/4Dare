import "server-only";
// The rule scene's cards ("Every character must be from this theme"): two
// characters that fit the theme get ✓, one that clearly doesn't gets ✗. They
// come from the theme's starters (supabase/seed/theme_starters.sql), then its
// history; decided once by the server at START, so everyone sees the same.
import { themeId } from "@/game/theme-id";
import type { ThemeSet } from "@/game/theme-sets";
import {
  type Character,
  type ExampleCard,
  LANGS,
  type Lang,
  type RoomState,
  type RuleExamples,
  THEME_OPTIONS,
  type Theme,
} from "@/game/types";
import { entryId, parseEntryId } from "./backend/seed-format";
import type { ThemeStarter } from "./backend/types";
import { drawWeight, PICKS_FETCHED, type PopularPick } from "./theme-picks";

/** Sets of made-up characters: a theme of one gets a real person as its ✗. */
const FICTION: readonly ThemeSet[] = [
  "screen",
  "cartoons",
  "anime",
  "games",
  "heroes",
  "powers",
  "myths",
  "scifi",
  "warriors",
  "animals",
];
/** Sets of real people: a theme of one gets a made-up character as its ✗. */
const REAL: readonly ThemeSet[] = ["music", "celebs", "sports", "history"];
// Every other set gets no ✗: world, jobs, family, quirks and looks cut across
// fiction and real life ("Characters with glasses" fits almost anyone), and
// books holds both stories and the people who write them. A wrong ✗ would
// teach a wrong rule.

/**
 * Where the ✗ comes from: starters nobody mistakes for the other side. Real
 * people come from athletes and musicians (actors play characters, and
 * history has kings and dictators); made-up ones from cartoons and games.
 */
const MISFIT_SOURCES: Record<"fiction" | "real", readonly ThemeSet[]> = {
  fiction: ["sports", "music"],
  real: ["cartoons", "games"],
};
const MISFIT_KIND = { fiction: "human", real: "fictional" } as const;
/** Only the clearest of those themes' starters: the most famous, nobody wonders who it is. */
const MISFIT_POSITIONS = 2;
/** Candidates tried in turn when one has no picture or names, or shares a name with the theme's own. */
const MISFIT_TRIES = 8;

/** What the examples are read from: the backend's stores (see rooms.ts), fixtures in tests. */
export interface ExampleSources {
  starters(): Promise<ThemeStarter[]>;
  popularPicks(themeId: string, limit: number): Promise<PopularPick[]>;
  getMany(ids: string[], lang: Lang): Promise<Character[]>;
}

/** FNV-1a: a small stable hash, so a theme always gets the same ✗. */
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const isLibraryId = (id: string) => parseEntryId(entryId("en", id)) !== null;

/**
 * Which side of the rule a theme is on, judged by its set and its starters:
 * a fiction set whose starters are all made up, or a real-people set whose
 * starters are all real. Null when unsure (mixed, cross-cutting, no starters).
 */
function sideOf(
  set: ThemeSet | null,
  own: ThemeStarter[],
): "fiction" | "real" | null {
  if (!set || own.length === 0) return null;
  if (FICTION.includes(set) && own.every((s) => s.kind === "fictional"))
    return "fiction";
  if (REAL.includes(set) && own.every((s) => s.kind === "human")) return "real";
  return null;
}

/** Looks the ids up in every language: library id → language → character. */
async function lookUp(src: ExampleSources, ids: string[]) {
  const out = new Map<string, Map<Lang, Character>>();
  if (ids.length === 0) return out;
  const found = await Promise.all(
    LANGS.map((lang) =>
      src.getMany(
        ids.map((id) => entryId(lang, id)),
        lang,
      ),
    ),
  );
  for (const list of found)
    for (const c of list) {
      const entry = parseEntryId(c.id);
      if (!entry || entry.lang !== c.lang) continue;
      const byLang = out.get(entry.id) ?? new Map<Lang, Character>();
      byLang.set(c.lang, c);
      out.set(entry.id, byLang);
    }
  return out;
}

/** A name's words, without case or accents: "Lisa Simpson" → " lisa simpson ". */
const words = (name: string) =>
  ` ${name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .join(" ")} `;

/** One name holds the other whole ("Lisa" and "Lisa Simpson"): a ✗ named so would read as a ✓. */
const clash = (a: string, b: string) => {
  const [x, y] = [words(a), words(b)];
  return x.trim() !== "" && y.trim() !== "" && (x.includes(y) || y.includes(x));
};

/** A card when the character has a picture and its names in English and Portuguese (Japanese when it has one). */
function toCard(
  id: string,
  found: Map<string, Map<Lang, Character>>,
): ExampleCard | null {
  const byLang = found.get(id);
  const en = byLang?.get("en");
  const pt = byLang?.get("pt");
  const ja = byLang?.get("ja");
  const imageUrl = en?.imageUrl ?? pt?.imageUrl ?? ja?.imageUrl ?? null;
  if (!en || !pt || !imageUrl) return null;
  return {
    id,
    imageUrl,
    names: { en: en.name, pt: pt.name, ...(ja ? { ja: ja.name } : {}) },
  };
}

/**
 * The ✓✓✗ cards for each theme, aligned with `themes`; null where the theme
 * has fewer than two characters to show (the scene then shows only the
 * sentence) and for a typed theme. ✓: the first two starters (by position)
 * that have a picture and their names, then the theme's most picked. ✗: a
 * starter of a contrasting set, the same for the theme every time, or none
 * when the theme could take almost anyone. Ids the library lacks are skipped.
 */
export async function ruleExamplesFor(
  themes: Theme[],
  src: ExampleSources,
): Promise<(RuleExamples | null)[]> {
  const all = await src.starters();
  const byTheme = new Map<string, ThemeStarter[]>();
  for (const s of all)
    byTheme.set(s.themeId, [...(byTheme.get(s.themeId) ?? []), s]);
  for (const list of byTheme.values())
    list.sort((a, b) => a.position - b.position);

  /** Starters of clean themes in the given sets with the given kind, in a fixed order, each once. */
  const pool = (sets: readonly ThemeSet[], kind: "human" | "fictional") => {
    const ids = new Set<string>();
    const themesInOrder = [...byTheme].sort(([a], [b]) => a.localeCompare(b));
    for (const [, list] of themesInOrder) {
      if (!list[0]?.set || !sets.includes(list[0].set)) continue;
      if (!list.every((s) => s.kind === kind)) continue;
      for (const s of list)
        if (s.position <= MISFIT_POSITIONS && isLibraryId(s.characterId))
          ids.add(s.characterId);
    }
    return [...ids];
  };
  const pools = {
    fiction: pool(MISFIT_SOURCES.fiction, MISFIT_KIND.fiction),
    real: pool(MISFIT_SOURCES.real, MISFIT_KIND.real),
  };

  const plans = themes.map((theme) => {
    if (theme.set === null) return null;
    const id = themeId(theme);
    const own = byTheme.get(id) ?? [];
    const fits = own.map((s) => s.characterId).filter(isLibraryId);
    const side = sideOf(theme.set, own);
    let misfits: string[] = [];
    if (side) {
      const mine = new Set(fits);
      const free = pools[side].filter((c) => !mine.has(c));
      const start = free.length ? hash(id) % free.length : 0;
      misfits = [...free.slice(start), ...free.slice(0, start)].slice(
        0,
        MISFIT_TRIES,
      );
    }
    return { id, fits, misfits };
  });

  const found = await lookUp(src, [
    ...new Set(plans.flatMap((p) => (p ? [...p.fits, ...p.misfits] : []))),
  ]);

  return Promise.all(
    plans.map(async (plan) => {
      if (!plan) return null;
      const fits = plan.fits.flatMap((id) => toCard(id, found) ?? []);
      if (fits.length < 2) {
        // Too few starters: the theme's most picked fill in.
        const have = new Set(fits.map((c) => c.id));
        const picked = (
          await src.popularPicks(plan.id, PICKS_FETCHED).catch(() => [])
        )
          .filter((p) => isLibraryId(p.id) && !have.has(p.id))
          .filter((p) => drawWeight(p) > 0)
          .sort(
            (a, b) => drawWeight(b) - drawWeight(a) || a.id.localeCompare(b.id),
          )
          .map((p) => p.id);
        const more = await lookUp(src, picked);
        for (const id of picked) {
          if (fits.length >= 2) break;
          const card = toCard(id, more);
          if (card) fits.push(card);
        }
      }
      if (fits.length < 2) return null;
      const own = plan.fits.flatMap((id) =>
        [...(found.get(id)?.values() ?? [])].map((c) => c.name),
      );
      const misfit =
        plan.misfits
          .map((id) => toCard(id, found))
          .find(
            (card) =>
              card &&
              !Object.values(card.names).some((name) =>
                own.some((mine) => clash(name, mine)),
              ),
          ) ?? null;
      return { fits: [fits[0], fits[1]], misfit } satisfies RuleExamples;
    }),
  );
}

/** One theme's cards (see ruleExamplesFor). */
export async function ruleExamples(
  theme: Theme,
  src: ExampleSources,
): Promise<RuleExamples | null> {
  return (await ruleExamplesFor([theme], src))[0] ?? null;
}

/**
 * The cards to send with the themes of a vote: only on a room's first match,
 * or when a `newcomer` (someone's first match ever) is seated, since the rule
 * scene plays only then; and never in the way of the match: if the data can't
 * be read, the scene shows the sentence alone.
 */
export async function voteExamples(
  state: RoomState,
  themes: Theme[],
  src: ExampleSources,
  newcomer = state.newcomer === true,
): Promise<(RuleExamples | null)[] | undefined> {
  if ((state.round !== 0 && !newcomer) || themes.length !== THEME_OPTIONS)
    return undefined;
  try {
    const examples = await ruleExamplesFor(themes, src);
    return examples.some(Boolean) ? examples : undefined;
  } catch (e) {
    console.warn(
      "[rule examples] left out:",
      e instanceof Error ? e.message : e,
    );
    return undefined;
  }
}
