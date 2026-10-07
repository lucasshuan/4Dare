// The question bank as the server reads it (table impostor_questions) and the
// screens show it (/api/impostor/questions), and how a match picks its
// questions from it.
import type { ThemeSet } from "../theme-sets";
import type { Localized } from "../types";
import { choicesOf, type EmojiPalette, isPalette } from "./answers";
import type { ImpQuestion, QuestionKind } from "./types";

/** Who a question fits: characters from fiction, real people, or both. */
export type Audience = "all" | "fiction" | "real";

/** An end of a scale, or an option of a pick. */
export interface QuestionLabel {
  emoji: string | null;
  text: Localized;
}

export type QuestionOptions =
  | { low: QuestionLabel; high: QuestionLabel }
  | { choices: QuestionLabel[] }
  | { palette: EmojiPalette };

export interface BankQuestion {
  id: string;
  kind: QuestionKind;
  scope: "general" | "set" | "theme";
  set: ThemeSet | null;
  themeId: string | null;
  audience: Audience;
  spice: 1 | 2 | 3;
  text: Localized;
  options: QuestionOptions | null;
}

/** The question as a match carries it. */
export function toImpQuestion(q: BankQuestion): ImpQuestion {
  const picks =
    q.options && "choices" in q.options ? q.options.choices.length : 2;
  return {
    id: q.id,
    kind: q.kind,
    choices: choicesOf(q.kind, picks),
    spice: q.spice,
  };
}

/** Questions a match prepares: two before the first vote, one per round after, and spares. */
export const MATCH_QUESTIONS = 9;
/** A room's recently asked questions stay out of its next matches. */
export const RECENT_QUESTIONS = 60;

/**
 * A match's questions, in the order they will be asked: the ones that fit
 * both cards (fiction, real people or both), the theme's and its set's
 * mixed in (about one in three, when there are any), never the same kind
 * twice in a row, the first one light and nothing that gives a lot away
 * before the first vote. What the room asked lately comes last.
 */
export function pickQuestions(
  bank: readonly BankQuestion[],
  o: {
    set: ThemeSet | null;
    themeId: string | null;
    audience: Audience;
    recent: readonly string[];
    random: () => number;
    count?: number;
  },
): ImpQuestion[] {
  const count = o.count ?? MATCH_QUESTIONS;
  const fits = bank.filter(
    (q) =>
      (q.audience === "all" || q.audience === o.audience) &&
      (q.scope === "general" ||
        (q.scope === "set" && q.set !== null && q.set === o.set) ||
        (q.scope === "theme" && q.themeId !== null && q.themeId === o.themeId)),
  );
  const fresh = fits.filter((q) => !o.recent.includes(q.id));
  const pool = (fresh.length >= count ? fresh : fits).slice();
  const out: BankQuestion[] = [];
  const take = (q: BankQuestion) => {
    out.push(q);
    pool.splice(pool.indexOf(q), 1);
  };
  const draw = (list: BankQuestion[]) =>
    list[Math.floor(o.random() * list.length)];
  while (out.length < count && pool.length) {
    const n = out.length;
    const last = out.at(-1)?.kind;
    const allowed = pool.filter(
      (q) =>
        q.kind !== last &&
        // the first question is light; nothing that gives a lot away before the first vote
        (n === 0 ? q.spice === 1 : n < 2 ? q.spice < 3 : true),
    );
    const own = allowed.filter((q) => q.scope !== "general");
    // every third question from the theme or its set, when there is one
    const wantOwn = n % 3 === 1 && own.length > 0;
    const list = wantOwn ? own : allowed.length ? allowed : pool;
    take(draw(list));
  }
  return out.map(toImpQuestion);
}

const LANG_KEYS = ["en", "es", "ja", "pt"] as const;

/** A label as the table keeps it ({emoji, en, es, ja, pt}), or null when a language is missing. */
function label(raw: unknown): QuestionLabel | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!LANG_KEYS.every((l) => typeof r[l] === "string" && r[l])) return null;
  return {
    emoji: typeof r.emoji === "string" && r.emoji ? r.emoji : null,
    text: Object.fromEntries(LANG_KEYS.map((l) => [l, r[l]])) as Localized,
  };
}

/** A question's options as the table keeps them: null for a kind without any, undefined when they don't fit. */
export function parseOptions(
  kind: QuestionKind,
  raw: unknown,
): QuestionOptions | null | undefined {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  if (kind === "scale") {
    const low = label(r.low);
    const high = label(r.high);
    return low && high ? { low, high } : undefined;
  }
  if (kind === "pick") {
    const choices = Array.isArray(r.choices) ? r.choices.map(label) : [];
    return choices.length >= 2 &&
      choices.length <= 4 &&
      choices.every((c) => c !== null)
      ? { choices: choices as QuestionLabel[] }
      : undefined;
  }
  if (kind === "emoji")
    return isPalette(r.palette) ? { palette: r.palette } : undefined;
  return null;
}
