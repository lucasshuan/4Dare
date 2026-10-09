import "server-only";
import type { GameKey } from "@/game/games";
import { EMOJI_PALETTES } from "@/game/impostor/answers";
import type { BankQuestion } from "@/game/impostor/questions";
import { QUESTION_KINDS } from "@/game/impostor/types";
import { TONES } from "@/game/lineup/bank";
import { normalizeName } from "@/game/match";
import { THEME_SETS, type ThemeSet } from "@/game/theme-sets";
import { GameError, LANGS, type Lang, type PlayerId } from "@/game/types";
import { BLOCKED_WORDS, STOP_WORDS } from "@/game/workshop-words";
import { getBackend } from "./backend";
import type { BankInsert, StoredSuggestion } from "./backend/community-types";
import type { CatalogTheme } from "./backend/types";
import { catalog, peopleOf } from "./catalog";
import type {
  DraftLabel,
  MissionDraft,
  Pieces,
  QuestionDraft,
  StarterCard,
  ThemeDraft,
  Translations,
  WorkshopCheck,
  WorkshopCounts,
  WorkshopDraft,
  WorkshopItem,
  WorkshopKind,
  WorkshopPage,
} from "./community-contract";
import type { PersonRef } from "./contract";

/** Suggestions an account may send a week (the database counts them too). */
export const WEEKLY_SUGGESTIONS = 3;
export const PAGE_SIZE = 24;

const THEME_GAMES = ["who-am-i", "impostor"] as const;
const isSet = (v: unknown): v is ThemeSet =>
  THEME_SETS.some((s) => s.key === v);

/** The games a card is for. */
const gamesOf = (item: Pick<WorkshopItem, "kind" | "theme">): GameKey[] =>
  item.kind === "theme"
    ? (item.theme?.games ?? [])
    : item.kind === "question"
      ? ["impostor"]
      : ["lineup"];

// -- drafts ----------------------------------------------------------------

/** A draft's texts, by piece. */
export function piecesOf(draft: WorkshopDraft): Pieces {
  if (draft.kind === "theme") return { name: draft.theme.name };
  if (draft.kind === "mission") return { text: draft.mission.text };
  const q = draft.question;
  const out: Pieces = { text: q.text };
  if (q.kind === "scale" && q.low && q.high) {
    out.low = q.low.text;
    out.high = q.high.text;
  }
  if (q.kind === "pick")
    for (const [i, c] of q.choices.entries()) out[`c${i}`] = c.text;
  return out;
}

/** The draft with its texts swapped for `pieces` (a language's). */
function withPieces(draft: WorkshopDraft, pieces: Pieces): WorkshopDraft {
  if (draft.kind === "theme")
    return { kind: "theme", theme: { ...draft.theme, name: pieces.name } };
  if (draft.kind === "mission")
    return {
      kind: "mission",
      mission: { ...draft.mission, text: pieces.text },
    };
  const q = draft.question;
  const label = (l: DraftLabel | null, key: string) =>
    l ? { emoji: l.emoji, text: pieces[key] ?? l.text } : null;
  return {
    kind: "question",
    question: {
      ...q,
      text: pieces.text,
      low: label(q.low, "low"),
      high: label(q.high, "high"),
      choices: q.choices.map((c, i) => ({
        emoji: c.emoji,
        text: pieces[`c${i}`] ?? c.text,
      })),
    },
  };
}

const str = (v: unknown, min: number, max: number) => {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  if (s.length < min || s.length > max) throw new GameError("invalid_input");
  return s;
};
const emoji = (v: unknown) =>
  typeof v === "string" ? [...v.trim()].slice(0, 4).join("") : "";
const label = (v: unknown): DraftLabel => {
  const r = (v ?? {}) as Record<string, unknown>;
  return { emoji: emoji(r.emoji), text: str(r.text, 1, 18) };
};

/** A draft as the composer sent it, checked field by field; invalid_input otherwise. */
export function parseDraft(raw: unknown): WorkshopDraft {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (r.kind === "theme") {
    const t = (r.theme ?? {}) as Record<string, unknown>;
    const games = Array.isArray(t.games)
      ? THEME_GAMES.filter((g) => (t.games as unknown[]).includes(g))
      : [];
    const starters = Array.isArray(t.starters)
      ? [
          ...new Set(
            t.starters.filter((s): s is string => typeof s === "string"),
          ),
        ]
      : [];
    if (
      !isSet(t.set) ||
      !games.length ||
      starters.length < 3 ||
      starters.length > 5
    )
      throw new GameError("invalid_input");
    const startersLang =
      t.startersLang === "all" ||
      (LANGS as readonly unknown[]).includes(t.startersLang)
        ? (t.startersLang as ThemeDraft["startersLang"])
        : "all";
    return {
      kind: "theme",
      theme: {
        name: str(t.name, 4, 40),
        set: t.set,
        games,
        starters,
        startersLang,
      },
    };
  }
  if (r.kind === "mission") {
    const m = (r.mission ?? {}) as Record<string, unknown>;
    if (!(TONES as readonly unknown[]).includes(m.tone))
      throw new GameError("invalid_input");
    return {
      kind: "mission",
      mission: {
        text: str(m.text, 10, 90),
        tone: m.tone as MissionDraft["tone"],
        heavy: m.heavy === true,
      },
    };
  }
  if (r.kind === "question") {
    const q = (r.question ?? {}) as Record<string, unknown>;
    if (!(QUESTION_KINDS as readonly unknown[]).includes(q.kind))
      throw new GameError("invalid_input");
    const kind = q.kind as QuestionDraft["kind"];
    const scope =
      q.scope === "set" || q.scope === "theme" ? q.scope : ("general" as const);
    if (scope === "set" && !isSet(q.set)) throw new GameError("invalid_input");
    if (scope === "theme" && typeof q.themeId !== "string")
      throw new GameError("invalid_input");
    const audience =
      q.audience === "fiction" || q.audience === "real" ? q.audience : "all";
    const spice = q.spice === 2 || q.spice === 3 ? q.spice : 1;
    const choices = Array.isArray(q.choices) ? q.choices : [];
    if (kind === "pick" && (choices.length < 2 || choices.length > 4))
      throw new GameError("invalid_input");
    return {
      kind: "question",
      question: {
        kind,
        text: str(q.text, 8, 80),
        low: kind === "scale" ? label(q.low) : null,
        high: kind === "scale" ? label(q.high) : null,
        choices: kind === "pick" ? choices.map(label) : [],
        scope,
        set: scope === "set" ? (q.set as ThemeSet) : null,
        themeId: scope === "theme" ? (q.themeId as string) : null,
        audience,
        spice,
      },
    };
  }
  throw new GameError("invalid_input");
}

/** Other languages' texts as sent: only known pieces, trimmed, never the source language. */
export function parseTranslations(
  raw: unknown,
  source: Lang,
  pieces: Pieces,
): Translations {
  const out: Translations = {};
  const r = (raw ?? {}) as Record<string, unknown>;
  for (const lang of LANGS) {
    if (lang === source) continue;
    const got = (r[lang] ?? {}) as Record<string, unknown>;
    const kept: Pieces = {};
    for (const key of Object.keys(pieces)) {
      const v = got[key];
      if (typeof v === "string" && v.trim())
        kept[key] = v.replace(/\s+/g, " ").trim().slice(0, 90);
    }
    if (Object.keys(kept).length) out[lang] = kept;
  }
  return out;
}

// -- the cards ---------------------------------------------------------------

interface Context {
  lang: Lang;
  themes: CatalogTheme[];
  starters: Map<string, StarterCard[]>;
  people: Map<string, PersonRef>;
  votes: Map<string, boolean>;
  viewer: PlayerId;
}

async function starterCards(lang: Lang): Promise<Map<string, StarterCard[]>> {
  const [all, cat] = await Promise.all([
    getBackend().characters.starters(),
    catalog(lang),
  ]);
  const out = new Map<string, StarterCard[]>();
  const sorted = [...all]
    .filter((s) => s.lang === "all" || s.lang === lang)
    .sort((a, b) => a.position - b.position);
  for (const s of sorted) {
    const row = cat.byId.get(s.characterId);
    if (!row) continue;
    const list = out.get(s.themeId) ?? [];
    if (list.length < 5)
      list.push({
        id: s.characterId,
        name: row.name,
        imageUrl: row.imageUrl,
        taste: row.taste,
      });
    out.set(s.themeId, list);
  }
  return out;
}

async function cardsOf(ids: string[], lang: Lang): Promise<StarterCard[]> {
  const cat = await catalog(lang);
  return ids.flatMap((id) => {
    const row = cat.byId.get(id);
    return row
      ? [{ id, name: row.name, imageUrl: row.imageUrl, taste: row.taste }]
      : [];
  });
}

const blankItem = (
  id: string,
  kind: WorkshopKind,
  lang: Lang,
): WorkshopItem => ({
  id,
  kind,
  status: "live",
  lang,
  theme: null,
  question: null,
  mission: null,
  by: null,
  at: null,
  votes: null,
  reason: null,
  mine: false,
});

function questionView(
  q: QuestionDraft,
  themes: CatalogTheme[],
  lang: Lang,
): WorkshopItem["question"] {
  const { themeId, ...rest } = q;
  const theme = themeId ? themes.find((t) => t.id === themeId) : null;
  return { ...rest, themeName: theme ? theme[lang] || theme.en : null };
}

async function suggestionItem(
  s: StoredSuggestion,
  ctx: Context,
): Promise<WorkshopItem> {
  const draft = { kind: s.kind, [s.kind]: s.payload } as WorkshopDraft;
  const own = piecesOf(draft);
  const theirs = ctx.lang === s.lang ? null : s.translations[ctx.lang];
  const translated = !!theirs && Object.keys(own).every((k) => theirs[k]);
  const shown = translated && theirs ? withPieces(draft, theirs) : draft;
  const item = blankItem(s.id, s.kind, translated ? ctx.lang : s.lang);
  item.status = s.status;
  item.by = (s.createdBy && ctx.people.get(s.createdBy)) || null;
  item.at = s.createdAt;
  item.mine = s.createdBy === ctx.viewer;
  item.reason = s.status === "refused" ? s.reason : null;
  if (s.status === "voting" || s.status === "review")
    item.votes = { yes: s.yes, no: s.no, mine: ctx.votes.get(s.id) ?? null };
  if (shown.kind === "theme")
    item.theme = {
      name: shown.theme.name,
      set: shown.theme.set,
      games: shown.theme.games,
      starters: await cardsOf(shown.theme.starters, ctx.lang),
    };
  if (shown.kind === "question")
    item.question = questionView(shown.question, ctx.themes, ctx.lang);
  if (shown.kind === "mission") item.mission = shown.mission;
  return item;
}

const labelOf = (
  l: { emoji: string | null; text: Record<Lang, string> } | undefined,
  lang: Lang,
) => (l ? { emoji: l.emoji ?? "", text: l.text[lang] || l.text.en } : null);

function bankQuestion(q: BankQuestion, lang: Lang): QuestionDraft {
  const o = q.options;
  return {
    kind: q.kind,
    text: q.text[lang] || q.text.en,
    low: o && "low" in o ? labelOf(o.low, lang) : null,
    high: o && "high" in o ? labelOf(o.high, lang) : null,
    choices:
      o && "choices" in o
        ? o.choices.map((c) => labelOf(c, lang) ?? { emoji: "", text: "" })
        : [],
    scope: q.scope,
    set: q.set,
    themeId: q.themeId,
    audience: q.audience,
    spice: q.spice,
  };
}

/** Everything live in the three banks, as cards (cached a minute per language). */
const bankCache = new Map<
  Lang,
  { at: number; items: Promise<WorkshopItem[]> }
>();

function bankItems(lang: Lang, ctx: Context): Promise<WorkshopItem[]> {
  const hit = bankCache.get(lang);
  if (hit && Date.now() - hit.at < 60_000) return hit.items;
  const items = (async () => {
    const { impostor, lineup } = getBackend();
    const [questions, missions] = await Promise.all([
      impostor.list(),
      lineup.missions(),
    ]);
    const out: WorkshopItem[] = [];
    for (const t of ctx.themes) {
      const item = blankItem(`bank:theme:${t.id}`, "theme", lang);
      item.theme = {
        name: t[lang] || t.en,
        set: t.set,
        games: t.games,
        starters: ctx.starters.get(t.id) ?? [],
      };
      out.push(item);
    }
    for (const q of questions) {
      const item = blankItem(`bank:question:${q.id}`, "question", lang);
      item.question = questionView(bankQuestion(q, lang), ctx.themes, lang);
      out.push(item);
    }
    for (const m of missions) {
      const item = blankItem(`bank:mission:${m.id}`, "mission", lang);
      item.mission = {
        text: m.text[lang] || m.text.en,
        tone: m.tone,
        heavy: m.heavy,
      };
      out.push(item);
    }
    return out;
  })();
  bankCache.set(lang, { at: Date.now(), items });
  items.catch(() => bankCache.delete(lang));
  return items;
}

export interface WorkshopQuery {
  game: GameKey | null;
  kind: WorkshopKind | null;
  status: "voting" | "live" | "refused";
  mine: boolean;
  q: string;
  offset: number;
}

const statusOf = (s: WorkshopItem["status"]) => (s === "review" ? "voting" : s);

const textOf = (item: WorkshopItem) =>
  item.theme?.name ?? item.question?.text ?? item.mission?.text ?? "";

/** Every card with the reader's votes and names, before any filter. */
async function allItems(lang: Lang, viewer: PlayerId, isGuest: boolean) {
  const { workshop, themes } = getBackend();
  const [suggestions, allThemes, votes] = await Promise.all([
    workshop.suggestions(),
    themes.catalog(),
    isGuest
      ? Promise.resolve(new Map<string, boolean>())
      : workshop.votesOf(viewer),
  ]);
  const ctx: Context = {
    lang,
    themes: allThemes,
    starters: await starterCards(lang),
    people: await peopleOf(
      suggestions.map((s) => s.createdBy),
      lang,
    ),
    votes,
    viewer,
  };
  const bank = await bankItems(lang, ctx);
  // a live suggestion credits its bank card; until the bank has it, its own card stands in
  const credited = new Map(
    suggestions
      .filter((s) => s.status === "live" && s.bankId)
      .map((s) => [`bank:${s.kind}:${s.bankId}`, s]),
  );
  const bankIds = new Set(bank.map((b) => b.id));
  const items: WorkshopItem[] = [];
  for (const s of suggestions) {
    if (
      s.status === "live" &&
      s.bankId &&
      bankIds.has(`bank:${s.kind}:${s.bankId}`)
    )
      continue;
    items.push(await suggestionItem(s, ctx));
  }
  for (const b of bank) {
    const s = credited.get(b.id);
    items.push(
      s
        ? {
            ...b,
            id: s.id,
            by: (s.createdBy && ctx.people.get(s.createdBy)) || null,
            at: s.decidedAt ?? s.createdAt,
            mine: s.createdBy === viewer,
          }
        : b,
    );
  }
  return { items, suggestions, themes: allThemes };
}

/** One page of the Workshop for `viewer`, in `lang`. */
export async function workshopPage(
  query: WorkshopQuery,
  lang: Lang,
): Promise<WorkshopPage> {
  const { auth, workshop } = getBackend();
  const me = await auth.identity(lang);
  const { items } = await allItems(lang, me.id, me.isGuest);
  const scoped = items.filter(
    (i) =>
      (!query.game || gamesOf(i).includes(query.game)) &&
      (!query.mine || i.mine),
  );
  const counts = Object.fromEntries(
    (["theme", "question", "mission"] as const).map((k) => {
      const c: WorkshopCounts = { voting: 0, live: 0, refused: 0 };
      for (const i of scoped) if (i.kind === k) c[statusOf(i.status)] += 1;
      return [k, c];
    }),
  ) as Record<WorkshopKind, WorkshopCounts>;
  const needle = normalizeName(query.q);
  const shown = scoped
    .filter(
      (i) =>
        statusOf(i.status) === query.status &&
        (!query.kind || i.kind === query.kind) &&
        (!needle || normalizeName(textOf(i)).includes(needle)),
    )
    .sort(
      (a, b) =>
        // the community's first, newest first; the bank's own keep their order
        (b.at ?? 0) - (a.at ?? 0),
    );
  const page = shown.slice(query.offset, query.offset + PAGE_SIZE);
  const end = query.offset + page.length;
  const [left, curator] = me.isGuest
    ? [null, false]
    : await Promise.all([
        workshop
          .sentThisWeek(me.id)
          .then((n) => Math.max(0, WEEKLY_SUGGESTIONS - n)),
        workshop.isCurator(me.id),
      ]);
  return {
    items: page,
    next: end < shown.length ? end : null,
    counts,
    left,
    curator,
  };
}

/** One card, wherever it is (a shared link). */
export async function workshopItem(id: string, lang: Lang) {
  const { auth } = getBackend();
  const me = await auth.identity(lang);
  const { items } = await allItems(lang, me.id, me.isGuest);
  return items.find((i) => i.id === id) ?? null;
}

/** How many suggestions are up for votes (the side menu). */
export async function votingCount(): Promise<number> {
  const all = await getBackend().workshop.suggestions();
  return all.filter((s) => s.status === "voting").length;
}

// -- the live check ----------------------------------------------------------

const fold = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .normalize("NFC")
    .trim();

/** A text's meaningful word stems: its words less the little ones, cut to four letters. */
function stems(text: string, lang: Lang): string[] {
  const stop = new Set(STOP_WORDS[lang]);
  return fold(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !stop.has(w))
    .map((w) => w.slice(0, 4));
}

/** The first text of `pool` that says the same as `text`: equal once folded, or the same stems give or take one. */
function nearOf(
  text: string,
  lang: Lang,
  pool: { text: string; lang: Lang; shown: string }[],
): string | null {
  const a = stems(text, lang);
  const whole = fold(text);
  for (const p of pool) {
    if (fold(p.text) === whole) return p.shown;
    if (!a.length || p.lang !== lang) continue;
    const b = new Set(stems(p.text, p.lang));
    if (b.size && a.every((w) => b.has(w)) && b.size <= a.length + 1)
      return p.shown;
  }
  return null;
}

function blocked(text: string, lang: Lang): boolean {
  const words = new Set(fold(text).split(/[^\p{L}\p{N}]+/u));
  return (
    LANGS.some((l) =>
      BLOCKED_WORDS[l].some((w) =>
        l === "ja" ? text.includes(w) : words.has(fold(w)),
      ),
    ) ||
    (lang === "ja" && BLOCKED_WORDS.ja.some((w) => text.includes(w)))
  );
}

/**
 * What blocks a draft, as the composer shows it while typing and the server
 * checks on sending: a name or text like one there is, examples another
 * theme already has, an example with no picture, a word that can't go.
 * Rules and lists only.
 */
export async function checkDraft(
  draft: WorkshopDraft,
  lang: Lang,
): Promise<WorkshopCheck[]> {
  const out: WorkshopCheck[] = [];
  const { themes, characters, impostor, lineup, workshop } = getBackend();
  const suggestions = (await workshop.suggestions()).filter(
    (s) => s.status !== "refused",
  );
  const texts = Object.values(piecesOf(draft));
  if (texts.some((t) => blocked(t, lang)))
    out.push({
      slot: draft.kind === "theme" ? "name" : "text",
      code: "blocked_word",
      ref: "",
    });
  if (draft.kind === "theme") {
    const t = draft.theme;
    const all = await themes.catalog();
    const pool = [
      ...all.flatMap((th) =>
        LANGS.map((l) => ({ text: th[l], lang: l, shown: th[lang] || th.en })),
      ),
      ...suggestions
        .filter((s) => s.kind === "theme")
        .flatMap((s) => {
          const p = s.payload as ThemeDraft;
          return [
            { text: p.name, lang: s.lang, shown: p.name },
            ...LANGS.flatMap((l) =>
              s.translations[l]?.name
                ? [
                    {
                      text: s.translations[l]?.name ?? "",
                      lang: l,
                      shown: p.name,
                    },
                  ]
                : [],
            ),
          ];
        }),
    ];
    const near = t.name.length > 3 ? nearOf(t.name, lang, pool) : null;
    if (near) out.push({ slot: "name", code: "near_theme", ref: near });
    if (t.starters.length >= 3) {
      const byTheme = new Map<string, Set<string>>();
      for (const s of await characters.starters()) {
        const set = byTheme.get(s.themeId) ?? new Set<string>();
        set.add(s.characterId);
        byTheme.set(s.themeId, set);
      }
      const names = new Map(all.map((th) => [th.id, th[lang] || th.en]));
      for (const s of suggestions)
        if (s.kind === "theme") {
          const p = s.payload as ThemeDraft;
          byTheme.set(`s:${s.id}`, new Set(p.starters));
          names.set(`s:${s.id}`, p.name);
        }
      for (const [id, set] of byTheme) {
        if (t.starters.filter((c) => set.has(c)).length >= 3) {
          out.push({
            slot: "starters",
            code: "same_starters",
            ref: names.get(id) ?? id,
          });
          break;
        }
      }
      const cat = await catalog(lang);
      const bare = t.starters.find((id) => !cat.byId.get(id)?.imageUrl);
      if (bare)
        out.push({
          slot: "starters",
          code: "no_picture",
          ref: cat.byId.get(bare)?.name ?? bare,
        });
    }
    return out;
  }
  const text =
    draft.kind === "question" ? draft.question.text : draft.mission.text;
  const bank =
    draft.kind === "question"
      ? (await impostor.list()).map((q) => q.text)
      : (await lineup.missions()).map((m) => m.text);
  const pool = [
    ...bank.flatMap((loc) =>
      LANGS.map((l) => ({ text: loc[l], lang: l, shown: loc[lang] || loc.en })),
    ),
    ...suggestions
      .filter((s) => s.kind === draft.kind)
      .map((s) => {
        const p = s.payload as { text: string };
        return { text: p.text, lang: s.lang, shown: p.text };
      }),
  ];
  const near = text.length > 7 ? nearOf(text, lang, pool) : null;
  if (near) out.push({ slot: "text", code: "near_text", ref: near });
  return out;
}

// -- changes -----------------------------------------------------------------

const account = async () => {
  const me = await getBackend().auth.identity("en");
  if (me.isGuest) throw new GameError("sign_in_needed");
  return me;
};

/** Sends a suggestion for votes. Its id, or what blocks it. */
export async function suggest(
  rawDraft: unknown,
  rawTranslations: unknown,
  lang: Lang,
): Promise<{ id: string | null; checks: WorkshopCheck[] }> {
  const me = await account();
  const draft = parseDraft(rawDraft);
  if (draft.kind === "question" && draft.question.themeId) {
    const all = await getBackend().themes.catalog();
    if (!all.some((t) => t.id === draft.question.themeId))
      throw new GameError("invalid_input");
  }
  if (draft.kind === "theme") {
    const cat = await catalog(lang);
    if (!draft.theme.starters.every((id) => cat.byId.has(id)))
      throw new GameError("invalid_input");
  }
  const checks = await checkDraft(draft, lang);
  if (checks.length) return { id: null, checks };
  const pieces = piecesOf(draft);
  const translations = parseTranslations(rawTranslations, lang, pieces);
  const payload =
    draft.kind === "theme"
      ? draft.theme
      : draft.kind === "question"
        ? draft.question
        : draft.mission;
  const id = await getBackend().workshop.create(
    draft.kind,
    lang,
    payload,
    translations,
    me.id,
  );
  if (!id) throw new GameError("rate_limited");
  return { id, checks: [] };
}

/** Wants it (true), doesn't fit (false) or takes the vote back (null). */
export async function voteOn(id: string, vote: boolean | null) {
  const me = await account();
  const s = await getBackend().workshop.suggestion(id);
  if (!s) throw new GameError("not_found");
  if (s.createdBy === me.id) throw new GameError("invalid_input");
  if (s.status !== "voting") throw new GameError("wrong_phase");
  return getBackend().workshop.vote(id, me.id, vote);
}

// -- review ------------------------------------------------------------------

const curatorOnly = async () => {
  const me = await account();
  if (!(await getBackend().workshop.isCurator(me.id)))
    throw new GameError("unauthorized");
  return me;
};

export interface ReviewItem {
  suggestion: Omit<StoredSuggestion, "payload"> & { draft: WorkshopDraft };
  by: PersonRef | null;
  pieces: Pieces;
  starters: StarterCard[];
}

/** Suggestions waiting on a curator, most wanted first. */
export async function reviewQueue(lang: Lang): Promise<ReviewItem[]> {
  await curatorOnly();
  const all = (await getBackend().workshop.suggestions()).filter(
    (s) => s.status === "voting" || s.status === "review",
  );
  const people = await peopleOf(
    all.map((s) => s.createdBy),
    lang,
  );
  all.sort((a, b) => b.yes - b.no - (a.yes - a.no) || b.yes - a.yes);
  return Promise.all(
    all.map(async (s) => {
      const draft = { kind: s.kind, [s.kind]: s.payload } as WorkshopDraft;
      return {
        suggestion: { ...s, draft },
        by: (s.createdBy && people.get(s.createdBy)) || null,
        pieces: piecesOf(draft),
        starters:
          draft.kind === "theme"
            ? await cardsOf(draft.theme.starters, lang)
            : [],
      };
    }),
  );
}

const slugOf = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "workshop";

async function freeBankId(kind: BankInsert["kind"], base: string) {
  const { workshop } = getBackend();
  let id = base;
  for (let n = 2; await workshop.bankIdTaken(kind, id); n++)
    id = `${base}-${n}`;
  return id;
}

/** Every piece in every language, or invalid_input. */
function complete(
  source: Lang,
  pieces: Pieces,
  translations: Translations,
): Record<Lang, Pieces> {
  const out = {} as Record<Lang, Pieces>;
  for (const lang of LANGS) {
    const got = lang === source ? pieces : translations[lang];
    if (!got || !Object.keys(pieces).every((k) => got[k]?.trim()))
      throw new GameError("invalid_input");
    out[lang] = got;
  }
  return out;
}

const across = (all: Record<Lang, Pieces>, key: string) =>
  Object.fromEntries(LANGS.map((l) => [l, all[l][key]])) as Record<
    Lang,
    string
  >;

/**
 * A curator puts a suggestion live: its four languages (the curator fills
 * what was missing) go into its game's bank, inserted, never updated.
 */
export async function approve(id: string, rawTranslations: unknown) {
  const me = await curatorOnly();
  const { workshop } = getBackend();
  const s = await workshop.suggestion(id);
  if (!s || (s.status !== "voting" && s.status !== "review"))
    throw new GameError("not_found");
  const draft = { kind: s.kind, [s.kind]: s.payload } as WorkshopDraft;
  const pieces = piecesOf(draft);
  const translations = {
    ...s.translations,
    ...parseTranslations(rawTranslations, s.lang, pieces),
  };
  const all = complete(s.lang, pieces, translations);
  let row: BankInsert;
  if (draft.kind === "theme") {
    const t = draft.theme;
    row = {
      kind: "theme",
      id: await freeBankId("theme", slugOf(all.en.name)),
      names: across(all, "name"),
      set: t.set,
      games: t.games,
      starters: t.starters.map((characterId, i) => ({
        characterId,
        lang: t.startersLang,
        position: i + 1,
      })),
    };
  } else if (draft.kind === "question") {
    const q = draft.question;
    const lab = (l: DraftLabel | null, key: string) =>
      l ? { emoji: l.emoji || null, ...across(all, key) } : null;
    row = {
      kind: "question",
      id: await freeBankId("question", `w-${slugOf(all.en.text)}`),
      questionKind: q.kind,
      scope: q.scope,
      set: q.set,
      themeId: q.themeId,
      audience: q.audience,
      spice: q.spice,
      texts: across(all, "text"),
      options:
        q.kind === "scale"
          ? { low: lab(q.low, "low"), high: lab(q.high, "high") }
          : q.kind === "pick"
            ? { choices: q.choices.map((c, i) => lab(c, `c${i}`)) }
            : q.kind === "emoji"
              ? { palette: Object.keys(EMOJI_PALETTES)[0] }
              : null,
      createdBy: s.createdBy,
    };
  } else {
    row = {
      kind: "mission",
      id: await freeBankId("mission", `w-${slugOf(all.en.text)}`),
      tone: draft.mission.tone,
      heavy: draft.mission.heavy,
      texts: across(all, "text"),
      createdBy: s.createdBy,
    };
  }
  await workshop.insertBank(row);
  await workshop.decide(id, {
    status: "live",
    reason: null,
    bankId: row.id,
    translations,
    by: me.id,
  });
  bankCache.clear();
  return { suggestion: s, bankId: row.id, texts: all };
}

/** A curator leaves a suggestion out, saying why. */
export async function refuse(id: string, rawReason: unknown) {
  const me = await curatorOnly();
  const { workshop } = getBackend();
  const s = await workshop.suggestion(id);
  if (!s || (s.status !== "voting" && s.status !== "review"))
    throw new GameError("not_found");
  await workshop.decide(id, {
    status: "refused",
    reason: str(rawReason, 3, 300),
    bankId: null,
    translations: s.translations,
    by: me.id,
  });
}

/** A curator marks a suggestion as being looked at (amber, steady). */
export async function markReview(id: string) {
  const me = await curatorOnly();
  const { workshop } = getBackend();
  const s = await workshop.suggestion(id);
  if (s?.status !== "voting") throw new GameError("not_found");
  await workshop.decide(id, {
    status: "review",
    reason: null,
    bankId: null,
    translations: s.translations,
    by: me.id,
  });
}
