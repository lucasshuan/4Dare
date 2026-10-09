import "server-only";
import { LANGS, type Lang, type Localized } from "@/game/types";
import { getBackend } from "./backend";
import type { Pieces, WandResult, WorkshopKind } from "./community-contract";

// The Workshop's translation wand. First the game's own banks: a text that
// is already a theme, question or mission comes with its other languages, as
// people wrote them. Then the patterns the themes follow ("Personagens
// verdes" / "Green characters" / "Personajes verdes" / "緑色のキャラクター"
// teach "verdes" in every language). What is left goes to MyMemory, a free
// translation service (its memory of human translations first, machine
// translation when it has none): the one outside call, only on a press of
// the wand. Everything comes back editable.

const fold = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();

/** How each language words "<x> characters" in the theme bank. */
const FRAME: Record<Lang, { before: string; after: string }> = {
  pt: { before: "Personagens ", after: "" },
  en: { before: "", after: " characters" },
  es: { before: "Personajes ", after: "" },
  ja: { before: "", after: "キャラクター" },
};

const middleOf = (text: string, lang: Lang) => {
  const { before, after } = FRAME[lang];
  const t = text.trim();
  if (
    !t.toLowerCase().startsWith(before.toLowerCase()) ||
    !t.toLowerCase().endsWith(after.toLowerCase())
  )
    return null;
  const mid = t.slice(before.length, t.length - after.length).trim();
  return mid || null;
};

const frame = (mid: string, lang: Lang) => {
  const { before, after } = FRAME[lang];
  const word = lang === "en" ? mid.charAt(0).toUpperCase() + mid.slice(1) : mid;
  // 左利き + の + キャラクター, as the bank's Japanese themes join them
  const joint = lang === "ja" && !word.endsWith("の") ? "の" : "";
  return `${before}${word}${joint}${after}`;
};

interface Bank {
  /** Any language's folded text, to all of its languages. */
  exact: Map<string, Localized>;
  /** A pattern's middle in one language (folded), to the middles in all. */
  middles: Map<string, Record<Lang, string>>;
}

let bankCache: { at: number; bank: Promise<Bank> } | null = null;

function loadBank(): Promise<Bank> {
  if (bankCache && Date.now() - bankCache.at < 10 * 60_000)
    return bankCache.bank;
  const bank = (async (): Promise<Bank> => {
    const { themes, impostor, lineup } = getBackend();
    const [all, questions, missions] = await Promise.all([
      themes.catalog(),
      impostor.list(),
      lineup.missions(),
    ]);
    const exact = new Map<string, Localized>();
    const add = (loc: Localized) => {
      for (const l of LANGS) if (loc[l]) exact.set(`${l}:${fold(loc[l])}`, loc);
    };
    const middles = new Map<string, Record<Lang, string>>();
    for (const t of all) {
      const loc: Localized = { en: t.en, es: t.es, ja: t.ja, pt: t.pt };
      add(loc);
      const mids = LANGS.map((l) => middleOf(loc[l], l));
      if (mids.every(Boolean)) {
        const rec = Object.fromEntries(
          LANGS.map((l, i) => [l, mids[i] as string]),
        ) as Record<Lang, string>;
        for (const l of LANGS) middles.set(`${l}:${fold(rec[l])}`, rec);
      }
    }
    for (const q of questions) {
      add(q.text);
      const o = q.options;
      if (o && "low" in o) {
        add(o.low.text);
        add(o.high.text);
      }
      if (o && "choices" in o) for (const c of o.choices) add(c.text);
    }
    for (const m of missions) add(m.text);
    return { exact, middles };
  })();
  bankCache = { at: Date.now(), bank };
  bank.catch(() => {
    bankCache = null;
  });
  return bank;
}

/** "Personagens de Zelda" and the like: a name kept as it is. */
function ofName(text: string, lang: Lang): Record<Lang, string> | null {
  const m =
    lang === "pt"
      ? /^Personagens de (\p{Lu}.*)$/u.exec(text.trim())
      : lang === "es"
        ? /^Personajes de (\p{Lu}.*)$/u.exec(text.trim())
        : null;
  if (!m) return null;
  const name = m[1];
  return {
    pt: `Personagens de ${name}`,
    es: `Personajes de ${name}`,
    en: `${name} characters`,
    ja: `${name}のキャラクター`,
  };
}

const serviceCache = new Map<string, string | null>();
const SERVICE = "https://api.mymemory.translated.net/get";
const CONTACT = "contato@4dare.com";

/** MyMemory's translation of `text`, or null when it fails or has nothing good. */
async function service(
  text: string,
  from: Lang,
  to: Lang,
): Promise<string | null> {
  const key = `${from}|${to}|${text}`;
  if (serviceCache.has(key)) return serviceCache.get(key) ?? null;
  const url = `${SERVICE}?${new URLSearchParams({ q: text, langpair: `${from}|${to}`, de: CONTACT })}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      responseStatus?: number | string;
      responseData?: { translatedText?: string };
    };
    const out = body.responseData?.translatedText?.trim();
    const good =
      Number(body.responseStatus) === 200 &&
      out &&
      // its notices come back as the text
      !/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(out)
        ? out
        : null;
    serviceCache.set(key, good);
    if (serviceCache.size > 5000) serviceCache.clear();
    return good;
  } catch {
    return null;
  }
}

/** The wand: every piece in the three other languages, where each one came from. */
export async function wand(
  kind: WorkshopKind,
  source: Lang,
  pieces: Pieces,
): Promise<WandResult> {
  const bank = await loadBank();
  const targets = LANGS.filter((l) => l !== source);
  const result: WandResult = { translations: {}, sources: {} };
  const put = (
    l: Lang,
    key: string,
    text: string,
    from: "bank" | "pattern" | "service",
  ) => {
    const tr = result.translations[l] ?? {};
    const src = result.sources[l] ?? {};
    tr[key] = text;
    src[key] = from;
    result.translations[l] = tr;
    result.sources[l] = src;
  };
  const jobs: Promise<void>[] = [];
  for (const [key, text] of Object.entries(pieces)) {
    if (!text.trim()) continue;
    const hit = bank.exact.get(`${source}:${fold(text)}`);
    if (hit) {
      for (const l of targets) put(l, key, hit[l], "bank");
      continue;
    }
    if (kind === "theme") {
      const mid = middleOf(text, source);
      const known = mid ? bank.middles.get(`${source}:${fold(mid)}`) : null;
      if (known) {
        for (const l of targets) put(l, key, frame(known[l], l), "pattern");
        continue;
      }
      const named = ofName(text, source);
      if (named) {
        for (const l of targets) put(l, key, named[l], "pattern");
        continue;
      }
    }
    // a theme in the bank's shape: the service gets its one word, the frame stays the bank's
    const whole = kind === "theme" ? middleOf(text, source) : null;
    const mid = whole && !/\s/.test(whole) ? whole : null;
    for (const l of targets)
      jobs.push(
        (mid
          ? service(mid, source, l).then((w) => (w ? frame(w, l) : null))
          : service(text, source, l)
        ).then((out) => {
          if (out) put(l, key, out, "service");
        }),
      );
  }
  await Promise.all(jobs);
  return result;
}
