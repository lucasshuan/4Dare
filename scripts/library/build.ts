/**
 * Builds the starter character library: data/characters/{en,pt,ja}.json.
 *
 *   pnpm exec tsx scripts/library/build.ts
 *
 * Then check it with `pnpm exec tsx scripts/library/validate.ts`.
 *
 * Sources (no keys needed):
 * - Wikidata SPARQL: candidates (fictional characters, mythical figures,
 *   deities, people by occupation and by country), labels, aliases, works,
 *   occupations.
 * - Wikipedia clickstream dumps (en/pt/ja): local popularity, as the median
 *   of the last three months of reader traffic per article (about 1.5 GB to
 *   download, mostly English; run with NODE_OPTIONS=--max-old-space-size=6144).
 * - Wikipedia and Commons APIs: the article lead image, or the Wikidata P18
 *   thumbnail, for the entries that make the cut.
 * - AniList GraphQL: anime/manga characters by favourites, native names.
 *
 * Every response is cached in $LIBRARY_CACHE_DIR (default
 * <os tmp>/dare-library-cache); delete it to start fresh. A cold run takes
 * one to two hours because every source is paced politely (Wikimedia allows
 * 10 API requests a minute to clients without contact details; set
 * LIBRARY_CONTACT to an email or URL to identify the client and go faster).
 * A cached rerun takes about a minute.
 *
 * Env: LIBRARY_CACHE_DIR, LIBRARY_CONTACT, LIBRARY_MAX (entries per language,
 * default 8000), LIBRARY_ANILIST (characters to fetch, default and API
 * maximum 5000), LIBRARY_CLICKSTREAM_MONTHS (e.g. "2026-06,2026-07,2026-08").
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchAniListCharacters } from "./anilist";
import { fetchClickstream } from "./clickstream";
import { pickDescriptor } from "./descriptors";
import { CACHE_DIR } from "./http";
import {
  capitalize,
  cleanName,
  cleanWorkLabel,
  formatJson,
  normalizeName,
} from "./text";
import {
  type AniListCharacter,
  type Details,
  type Entity,
  LANGS,
  type Lang,
  type SeedCharacter,
} from "./types";
import { collectPools, fetchDetails } from "./wikidata";
import {
  fetchPageImages,
  type PageImage,
  resolveCommonsFiles,
} from "./wikipedia";

const OUT_DIR = path.join(__dirname, "..", "..", "data", "characters");
const MAX_ENTRIES = Number(process.env.LIBRARY_MAX ?? 8000);
const ANILIST_LIMIT = Number(process.env.LIBRARY_ANILIST ?? 5000);
/**
 * Target share of fictional characters in each list. Character articles draw
 * far less traffic than celebrities, so characters get a score offset
 * calibrated per language to reach this share.
 */
const FICTIONAL_SHARE = Number(process.env.LIBRARY_FICTIONAL_SHARE ?? 0.45);
/** At least this share of each list must have an image. */
const MIN_IMAGE_SHARE = 0.88;
const MAX_NAME = 60;
const MAX_ALIASES = 12;

type Views = Record<Lang, Map<string, number>>;
type Images = Record<Lang, Map<string, PageImage>>;

// ---------------------------------------------------------------------------
// Scoring: one scale for every source. A Wikidata item scores by its global
// sitelinks plus local reader traffic; an AniList character by favourites,
// shifted so characters found in both sources land on the same scale.

const log = (value: number) => Math.log10(1 + Math.max(0, value));
const favouriteScore = (favourites: number) => 60 * log(favourites);
const toPopularity = (score: number) => Math.max(1, Math.round(score * 100));

function viewsOf(views: Views, entity: Entity, lang: Lang): number {
  const title = entity.titles[lang];
  return title ? (views[lang].get(title) ?? 0) : 0;
}

/** Fixed ranking for the shortlists, so tuning the final score keeps the cache. */
function shortlistScore(views: Views, entity: Entity, lang: Lang): number {
  return 50 * log(entity.sitelinks) + 60 * log(viewsOf(views, entity, lang));
}

function wikiScore(views: Views, entity: Entity, lang: Lang): number {
  return 50 * log(entity.sitelinks) + 60 * log(viewsOf(views, entity, lang));
}

// ---------------------------------------------------------------------------
// Filters

const LIST_LIKE =
  /^(list|lists|lista|listas|category|categoria|template|predefinição|wikipedia)\b|一覧|^Q\d+$/i;
const ADULT_OCCUPATION =
  /porn|erotic|adult (film|video|model)|\bAV idol|sex worker|camgirl|webcam model|onlyfans|playmate|stripper|glamou?r model|nude model|prostitut|escort|ポルノ|AV女優|アダルト|ストリッパー/i;
/**
 * People a party game shouldn't hand out: killers, terrorists, dictators,
 * war criminals, crime victims. Checked against descriptions and occupations
 * in every language; the excluded list is written to the cache for review.
 */
const UNSAFE_PERSON =
  /serial killer|spree killer|mass murderer|murderer|mass shooter|school shooter|terrorist|war criminal|(?<!anti-?)\bnazi|dictator|cult leader|murder victim|sex offender|child molester|drug lord|drug trafficker|crime boss|mobster|gangster|assassino em série|assassin[oa]\b|terrorista|ditador|criminos[oa]|narcotraficante|(?<!anti-?)nazista|vítima de|殺人|テロリスト|死刑囚|独裁者|被害者|犯罪者|暴力団|ナチス/iu;
/** Named exclusions the descriptions don't catch (and Muhammad, whose depiction is offensive to many). */
const DENY = new Set([
  "Q352", // Adolf Hitler
  "Q855", // Joseph Stalin
  "Q23559", // Benito Mussolini
  "Q1317", // Osama bin Laden
  "Q1316", // Saddam Hussein
  "Q56226", // Kim Jong Un
  "Q9458", // Muhammad
]);
/** Caught by "dictator" but fine to play. */
const ALLOW = new Set(["Q1048" /* Julius Caesar */]);

function exclusionReason(entity: Entity, info: Details): string | null {
  if (DENY.has(entity.qid)) return "denylist";
  if (entity.kind === "fictional") {
    return info.classes.some((label) => GROUP_CLASS.test(label))
      ? "group or organisation"
      : null;
  }
  const text = [
    ...Object.values(info.descriptions),
    ...Object.values(info.occupationLabels).flat(),
  ].join(" | ");
  if (ADULT_OCCUPATION.test(text)) return "adult content";
  if (!ALLOW.has(entity.qid) && UNSAFE_PERSON.test(text)) return "unsafe";
  return null;
}
const GROUP_CLASS =
  /(\b(organi[sz]ation|team|group|family|duo|trio|band|army|clan|tribe|dynasty|episode|couple)$)|^group of|^Wikimedia/i;
const MYTHOLOGY =
  /mytholog|folklore|legend|religio|pantheon|olympian|æsir|aesir|vanir|bible|gods\b/i;
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
const LATIN_ONLY = /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}]+$/u;

function validName(name: string | null | undefined): name is string {
  return (
    !!name &&
    name.length <= MAX_NAME &&
    !LIST_LIKE.test(name) &&
    /\p{L}/u.test(name)
  );
}

// ---------------------------------------------------------------------------
// Origins

const WORK_ORDER = ["P8345", "P1080", "P361", "P1441", "P4584"];

function fictionalOrigin(
  details: Details | undefined,
  lang: Lang,
  name: string,
): string | null {
  if (!details) return null;
  const nameKey = normalizeName(name);
  for (const prop of WORK_ORDER) {
    const works = details.works
      .filter((work) => work.prop === prop)
      .filter((work) => prop !== "P361" || MYTHOLOGY.test(work.labels.en ?? ""))
      .sort((a, b) => b.sitelinks - a.sitelinks);
    for (const work of works) {
      const label = work.labels[lang];
      if (!label) continue;
      const cleaned = cleanWorkLabel(label, lang);
      if (!validName(cleaned) || normalizeName(cleaned) === nameKey) continue;
      return lang === "ja" ? cleaned : capitalize(cleaned);
    }
  }
  return null;
}

function aniListTitle(character: AniListCharacter, lang: Lang): string | null {
  const media = character.media;
  if (!media) return null;
  if (lang === "ja") return media.native ?? media.romaji ?? media.english;
  const { english, romaji } = media;
  if (
    english &&
    romaji &&
    english === english.toUpperCase() &&
    english.toLowerCase() === romaji.toLowerCase()
  ) {
    return romaji;
  }
  return english ?? romaji ?? null;
}

function humanOrigin(
  entity: Entity,
  details: Details | undefined,
  lang: Lang,
): string | null {
  if (!details) return null;
  const descriptor = pickDescriptor(
    details.occupations,
    details.descriptions,
    lang,
  );
  if (descriptor) return descriptor.labels[lang][entity.female ? 1 : 0];
  return (
    details.occupationLabels[lang]?.find(
      (label) => label.length <= 40 && !ADULT_OCCUPATION.test(label),
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Aliases

function buildAliases(
  name: string,
  candidates: (string | null | undefined)[],
): string[] {
  const seen = new Set([normalizeName(name)]);
  const out: string[] = [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const alias = cleanName(candidate);
    if (!alias || alias.length > MAX_NAME || LIST_LIKE.test(alias)) continue;
    const key = normalizeName(alias);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(alias);
    if (out.length >= MAX_ALIASES) break;
  }
  return out;
}

function aniListNames(character: AniListCharacter, lang: Lang): string[] {
  return [character.full, character.native, ...character.alternative].filter(
    (name): name is string => !!name && (lang !== "ja" || !HANGUL.test(name)),
  );
}

// ---------------------------------------------------------------------------
// AniList <-> Wikidata matching: by Wikidata's AniList ID (P11736), else by
// name when the character's works and the AniList media agree.

function matchAniList(
  characters: AniListCharacter[],
  entities: Entity[],
  details: Map<string, Details>,
): Map<string, AniListCharacter> {
  const byAniListId = new Map<number, Entity>();
  const byName = new Map<string, Entity[]>();
  for (const entity of entities) {
    if (entity.kind !== "fictional") continue;
    if (entity.anilistId) byAniListId.set(entity.anilistId, entity);
    const info = details.get(entity.qid);
    const names = [
      entity.labels.en,
      entity.labels.ja,
      ...(info?.aliases.en ?? []),
      ...(info?.aliases.ja ?? []),
    ];
    for (const name of names) {
      if (!name) continue;
      const key = normalizeName(name);
      if (key.length < 2) continue;
      const list = byName.get(key) ?? [];
      if (!list.includes(entity)) list.push(entity);
      byName.set(key, list);
    }
  }
  const overlaps = (entity: Entity, character: AniListCharacter) => {
    const titles = [
      character.media?.romaji,
      character.media?.english,
      character.media?.native,
    ]
      .filter((title): title is string => !!title)
      .map((title) => normalizeName(cleanName(title)))
      .filter((title) => title.length >= 2);
    for (const work of details.get(entity.qid)?.works ?? []) {
      for (const label of Object.values(work.labels)) {
        if (!label) continue;
        const key = normalizeName(cleanWorkLabel(label, "en"));
        if (key.length < 2) continue;
        for (const title of titles) {
          if (key === title) return true;
          const [short, long] =
            key.length < title.length ? [key, title] : [title, key];
          if (short.length >= 3 && long.includes(short)) return true;
        }
      }
    }
    return false;
  };

  const matches = new Map<string, AniListCharacter>();
  for (const character of characters) {
    let entity = byAniListId.get(character.id);
    if (!entity) {
      const candidates = new Set<Entity>();
      for (const name of aniListNames(character, "en")) {
        for (const candidate of byName.get(normalizeName(name)) ?? []) {
          candidates.add(candidate);
        }
      }
      const confirmed = [...candidates].filter((candidate) =>
        overlaps(candidate, character),
      );
      if (confirmed.length === 1) entity = confirmed[0];
    }
    if (entity && !matches.has(entity.qid)) matches.set(entity.qid, character);
  }
  return matches;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ---------------------------------------------------------------------------
// Images: fictional characters prefer the English article image (official
// art), then AniList; real people prefer the free Wikidata photo (P18).

interface ImageSources {
  pages: Images;
  commons: Map<string, string>;
}

async function fetchImages(
  topByLang: Record<Lang, Entity[]>,
): Promise<ImageSources> {
  const titles: Record<Lang, Set<string>> = {
    en: new Set(),
    pt: new Set(),
    ja: new Set(),
  };
  for (const lang of LANGS) {
    for (const entity of topByLang[lang]) {
      if (entity.kind === "fictional") {
        const own = entity.titles[lang];
        if (entity.titles.en) titles.en.add(entity.titles.en);
        else if (own) titles[lang].add(own);
      } else if (!entity.p18) {
        const own = entity.titles[lang];
        if (own) titles[lang].add(own);
        else if (entity.titles.en) titles.en.add(entity.titles.en);
      }
    }
  }
  const pages = {} as Images;
  for (const lang of LANGS) {
    pages[lang] = await fetchPageImages(lang, titles[lang]);
  }
  const hasPageImage = (entity: Entity) =>
    LANGS.some((lang) => {
      const title = entity.titles[lang];
      return !!title && !!pages[lang].get(title)?.image;
    });
  const files = new Set<string>();
  for (const entity of new Set(LANGS.flatMap((lang) => topByLang[lang]))) {
    if (!entity.p18) continue;
    if (entity.kind === "human" || !hasPageImage(entity)) files.add(entity.p18);
  }
  const commons = await resolveCommonsFiles(files);
  return { pages, commons };
}

function pickImage(
  entity: Entity,
  lang: Lang,
  character: AniListCharacter | undefined,
  images: ImageSources,
): string | null {
  const page = (l: Lang) => {
    const title = entity.titles[l];
    return title ? (images.pages[l].get(title)?.image ?? undefined) : undefined;
  };
  const others = LANGS.filter((l) => l !== lang && l !== "en").map(page);
  const p18 = entity.p18 ? images.commons.get(entity.p18) : undefined;
  const order =
    entity.kind === "fictional"
      ? [page("en"), character?.image ?? undefined, page(lang), ...others, p18]
      : [p18, page(lang), page("en"), ...others];
  return order.find(Boolean) ?? null;
}

// ---------------------------------------------------------------------------
// Selection

interface Candidate extends SeedCharacter {
  /** Score before the fictional offset; popularity is set from it at the end. */
  score: number;
  kind: Entity["kind"];
  source: "wd" | "al" | "wd+al";
}

/**
 * Smallest score offset for fictional candidates that gives them at least
 * `share` of the top `max` (never negative: lists that already have enough
 * characters, like Japanese with AniList, are left alone).
 */
function fictionalOffset(
  candidates: Candidate[],
  max: number,
  share: number,
): number {
  const shareAt = (offset: number) => {
    const top = candidates
      .map((c) => ({
        fictional: c.kind === "fictional",
        score: c.score + (c.kind === "fictional" ? offset : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, max);
    return top.filter((c) => c.fictional).length / Math.max(1, top.length);
  };
  if (shareAt(0) >= share) return 0;
  let low = 0;
  let high = 300;
  for (let i = 0; i < 25; i++) {
    const mid = (low + high) / 2;
    if (shareAt(mid) >= share) high = mid;
    else low = mid;
  }
  return high;
}

function selectEntries(candidates: Candidate[], max: number): Candidate[] {
  const sorted = [...candidates].sort(
    (a, b) => b.popularity - a.popularity || a.id.localeCompare(b.id),
  );
  const seen = new Set<string>();
  const unique: Candidate[] = [];
  for (const candidate of sorted) {
    const key = `${normalizeName(candidate.name)}|${normalizeName(candidate.origin ?? "")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }
  let target = Math.min(max, unique.length);
  for (;;) {
    const allowed = Math.floor(target * (1 - MIN_IMAGE_SHARE));
    const chosen: Candidate[] = [];
    let imageless = 0;
    for (const candidate of unique) {
      if (chosen.length >= target) break;
      if (!candidate.imageUrl) {
        if (imageless >= allowed) continue;
        imageless++;
      }
      chosen.push(candidate);
    }
    if (chosen.length >= target) return chosen;
    target = chosen.length;
  }
}

// ---------------------------------------------------------------------------

async function main() {
  const started = Date.now();
  const step = (label: string) =>
    console.log(
      `\n== ${label} (${Math.round((Date.now() - started) / 1000)}s)`,
    );
  console.log(`cache: ${CACHE_DIR}`);

  step("1/6 Wikidata candidate pools");
  const pool = await collectPools();
  const entities = [...pool.values()].filter((entity) => !entity.isClass);
  console.log(
    `  ${entities.length} entities (${pool.size - entities.length} classes dropped)`,
  );

  step("2/6 AniList characters");
  const anilist = await fetchAniListCharacters(ANILIST_LIMIT);
  console.log(`  ${anilist.length} characters`);
  const anilistIds = new Set(anilist.map((character) => character.id));
  const onAniList = (entity: Entity) =>
    !!entity.anilistId && anilistIds.has(entity.anilistId);

  step("3/6 Wikipedia clickstream");
  const views = {} as Views;
  for (const lang of LANGS) {
    const wanted = new Set(
      entities
        .map((entity) => entity.titles[lang])
        .filter((title): title is string => !!title),
    );
    views[lang] = await fetchClickstream(lang, wanted);
  }

  step("4/6 Details and images");
  const ranked = {} as Record<Lang, Entity[]>;
  for (const lang of LANGS) {
    ranked[lang] = entities
      .filter(
        (entity) =>
          !!entity.labels[lang] || (lang === "ja" && onAniList(entity)),
      )
      .sort(
        (a, b) =>
          shortlistScore(views, b, lang) - shortlistScore(views, a, lang),
      );
  }
  // People and characters are shortlisted separately: characters draw less
  // traffic than celebrities but get their share of the list (see below).
  const top = (lang: Lang, headroom: number) => {
    const quota = {
      fictional: Math.round(MAX_ENTRIES * FICTIONAL_SHARE * headroom),
      human: Math.round(MAX_ENTRIES * (1 - FICTIONAL_SHARE) * headroom),
    };
    return (["fictional", "human"] as const).flatMap((kind) =>
      ranked[lang]
        .filter((entity) => entity.kind === kind)
        .slice(0, quota[kind]),
    );
  };
  const shortlist = new Set<Entity>();
  for (const lang of LANGS) {
    for (const entity of top(lang, 1.35)) shortlist.add(entity);
  }
  for (const entity of entities) if (onAniList(entity)) shortlist.add(entity);
  const shortlisted = [...shortlist];
  console.log(`  ${shortlisted.length} entities shortlisted`);
  const topByLang = {} as Record<Lang, Entity[]>;
  for (const lang of LANGS) topByLang[lang] = top(lang, 1.15);
  // Different rate-limit pools (query service vs. API), so run side by side.
  const [details, images] = await Promise.all([
    fetchDetails(shortlisted, (done, total) => {
      if (done % 4000 < 400 || done === total) {
        console.log(`  details ${done}/${total}`);
      }
    }),
    fetchImages(topByLang),
  ]);

  step("5/6 Assemble");
  const excluded = new Map<string, string>();
  for (const entity of shortlisted) {
    const info = details.get(entity.qid);
    // Without details nothing could be checked: leave it out (a rerun retries).
    const reason = info ? exclusionReason(entity, info) : "no details";
    if (reason) excluded.set(entity.qid, reason);
  }
  const excludedReport = [...excluded].map(([qid, reason]) => {
    const entity = pool.get(qid);
    const info = details.get(qid);
    return [
      qid,
      reason,
      entity?.labels.en ?? "",
      info?.descriptions.en ?? "",
    ].join("\t");
  });
  await writeFile(
    path.join(CACHE_DIR, "excluded.tsv"),
    `${excludedReport.join("\n")}\n`,
  );
  const reasons = new Map<string, number>();
  for (const reason of excluded.values())
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  console.log(
    `  ${excluded.size} excluded (${[...reasons].map(([r, n]) => `${n} ${r}`).join(", ")}), see ${path.join(CACHE_DIR, "excluded.tsv")}`,
  );
  const isDisambiguation = (entity: Entity, lang: Lang) => {
    const title = entity.titles[lang];
    return !!title && !!images.pages[lang].get(title)?.disambiguation;
  };
  const usable = shortlisted.filter((entity) => !excluded.has(entity.qid));

  const matches = matchAniList(anilist, usable, details);
  console.log(`  ${matches.size} AniList characters matched to Wikidata items`);

  const offsets = {} as Record<Lang, number>;
  for (const lang of LANGS) {
    const diffs: number[] = [];
    for (const entity of usable) {
      const character = matches.get(entity.qid);
      if (!character || viewsOf(views, entity, lang) <= 0) continue;
      diffs.push(
        wikiScore(views, entity, lang) - favouriteScore(character.favourites),
      );
    }
    // Too few pairs to calibrate: borrow the English offset (en comes first).
    offsets[lang] = diffs.length >= 15 ? median(diffs) : (offsets.en ?? 0);
    console.log(
      `  ${lang}: AniList offset ${offsets[lang].toFixed(1)} from ${diffs.length} pairs`,
    );
  }

  const lists = {} as Record<Lang, Candidate[]>;
  for (const lang of LANGS) {
    const others = LANGS.filter((other) => other !== lang);
    const candidates: Candidate[] = [];
    // AniList characters already in the list through their Wikidata twin.
    const emitted = new Set<number>();
    for (const entity of usable) {
      const info = details.get(entity.qid);
      const character = matches.get(entity.qid);
      let name = entity.labels[lang];
      if (
        !name &&
        lang === "ja" &&
        character?.native &&
        !HANGUL.test(character.native)
      ) {
        name = character.native;
      }
      if (!name) continue;
      name = cleanName(name);
      if (!validName(name) || isDisambiguation(entity, lang)) continue;

      let score = wikiScore(views, entity, lang);
      if (character) {
        score = Math.max(
          score,
          favouriteScore(character.favourites) + offsets[lang],
        );
      }
      const origin =
        entity.kind === "human"
          ? humanOrigin(entity, info, lang)
          : (fictionalOrigin(info, lang, name) ??
            (character ? aniListTitle(character, lang) : null));
      const cleanOrigin = origin ? cleanName(origin) : null;
      candidates.push({
        id: `${lang}-wd-${entity.qid}`,
        name,
        origin: validName(cleanOrigin) ? cleanOrigin : null,
        imageUrl: pickImage(entity, lang, character, images),
        aliases: buildAliases(name, [
          entity.labels[lang],
          ...(info?.aliases[lang] ?? []),
          ...others.map((other) => entity.labels[other]),
          ...(character ? aniListNames(character, lang) : []),
        ]),
        popularity: 0,
        score,
        kind: entity.kind,
        source: character ? "wd+al" : "wd",
      });
      if (character) emitted.add(character.id);
    }
    // A matched character whose Wikidata item was skipped here (no label in
    // this language, disambiguation page) still gets in through AniList.
    for (const character of anilist) {
      if (emitted.has(character.id)) continue;
      const raw = lang === "ja" ? character.native : character.full;
      if (!raw || (lang === "ja" && HANGUL.test(raw))) continue;
      if (lang !== "ja" && !LATIN_ONLY.test(raw)) continue;
      const name = cleanName(raw);
      if (!validName(name)) continue;
      const origin = aniListTitle(character, lang);
      const cleanOrigin = origin ? cleanName(origin) : null;
      candidates.push({
        id: `${lang}-al-${character.id}`,
        name,
        origin: validName(cleanOrigin) ? cleanOrigin : null,
        imageUrl: character.image,
        aliases: buildAliases(name, aniListNames(character, lang)),
        popularity: 0,
        score: favouriteScore(character.favourites) + offsets[lang],
        kind: "fictional",
        source: "al",
      });
    }
    const offset = fictionalOffset(candidates, MAX_ENTRIES, FICTIONAL_SHARE);
    for (const candidate of candidates) {
      candidate.popularity = toPopularity(
        candidate.score + (candidate.kind === "fictional" ? offset : 0),
      );
    }
    console.log(`  ${lang}: fictional offset ${offset.toFixed(1)}`);
    lists[lang] = candidates;
  }

  step("6/6 Write");
  await mkdir(OUT_DIR, { recursive: true });
  for (const lang of LANGS) {
    const chosen = selectEntries(lists[lang], MAX_ENTRIES);
    const output: SeedCharacter[] = chosen.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      origin: candidate.origin,
      imageUrl: candidate.imageUrl,
      aliases: candidate.aliases,
      popularity: candidate.popularity,
    }));
    await writeFile(path.join(OUT_DIR, `${lang}.json`), formatJson(output));
    const withImage = chosen.filter((candidate) => candidate.imageUrl).length;
    const fictional = chosen.filter(
      (candidate) => candidate.kind === "fictional",
    ).length;
    const fromAniList = chosen.filter(
      (candidate) => candidate.source !== "wd",
    ).length;
    console.log(
      `  ${lang}: ${chosen.length} entries, ${((withImage / chosen.length) * 100).toFixed(1)}% with image, ${fictional} fictional (${fromAniList} via AniList)`,
    );
    const debug = chosen.map((candidate, index) =>
      [
        index + 1,
        candidate.popularity,
        candidate.kind,
        candidate.source,
        candidate.name,
        candidate.origin ?? "",
        candidate.imageUrl ? "img" : "-",
      ].join("\t"),
    );
    await writeFile(
      path.join(CACHE_DIR, `debug-${lang}.tsv`),
      `${debug.join("\n")}\n`,
    );
  }
  console.log(`\ndone in ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
