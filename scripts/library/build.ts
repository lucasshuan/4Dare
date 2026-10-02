/**
 * Builds the starter character library: data/characters.json (one entry per
 * character, with its name, aliases and popularity in each language whose
 * list holds it) and data/origins.json (the works and descriptors characters
 * come from, translated).
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
 *   of six months of reader traffic per article spread over two years (about
 *   3 GB to download, mostly English; run with
 *   NODE_OPTIONS=--max-old-space-size=6144).
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
 * maximum 5000), LIBRARY_CLICKSTREAM_MONTHS (e.g. "2025-12,2026-04,2026-08").
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Category } from "../../src/game/categories";
import { fetchAniListCharacters } from "./anilist";
import { fetchClickstream } from "./clickstream";
import { DESCRIPTORS, type Descriptor, pickDescriptor } from "./descriptors";
import { CACHE_DIR } from "./http";
import {
  ALLOW_QIDS,
  CUSTOM_ORIGINS,
  DENY_QIDS,
  DROP_ALIASES,
  NAMES,
  ORIGIN_REPLACEMENTS,
  ORIGINS,
  REMOVE_IDS,
} from "./overrides";
import {
  capitalize,
  cleanName,
  cleanWorkLabel,
  formatJson,
  normalizeName,
} from "./text";
import {
  type AniListCharacter,
  type ByLang,
  type Details,
  type Entity,
  LANGS,
  type Lang,
  type SeedCharacter,
  type SeedOrigin,
  type Work,
} from "./types";
import { collectPools, fetchDetails } from "./wikidata";
import {
  fetchPageImages,
  type PageImage,
  resolveCommonsFiles,
} from "./wikipedia";

const OUT_DIR = path.join(__dirname, "..", "..", "data");
const MAX_ENTRIES = Number(process.env.LIBRARY_MAX ?? 8000);
const ANILIST_LIMIT = Number(process.env.LIBRARY_ANILIST ?? 5000);
/**
 * Target share of fictional characters in each list. Character articles draw
 * far less traffic than celebrities, so characters get a score offset
 * calibrated per language to reach this share.
 */
const FICTIONAL_SHARE = Number(process.env.LIBRARY_FICTIONAL_SHARE ?? 0.45);
/**
 * Gods, saints and legends get half the offset: students and the curious read
 * their articles far more than players know them (Agamemnon outread Homer
 * Simpson and, with the offset, Messi).
 */
const TRADITION = new Set<Category>(["mythology", "religion", "folklore"]);
const offsetFor = (candidate: Candidate, offset: number) =>
  candidate.kind !== "fictional"
    ? 0
    : TRADITION.has(candidate.profile.category)
      ? offset / 2
      : offset;
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
for (const qid of Object.keys(DENY_QIDS)) DENY.add(qid);
/** Caught by a keyword (e.g. "dictator") but fine to play. */
const ALLOW = new Set([
  "Q1048" /* Julius Caesar */,
  ...Object.keys(ALLOW_QIDS),
]);

function exclusionReason(entity: Entity, info: Details): string | null {
  if (DENY.has(entity.qid)) return "denylist";
  if (ALLOW.has(entity.qid)) return null;
  if (entity.kind === "fictional") {
    // A type ("vampire", "God in Judaism") rather than someone; species from a
    // franchise (Pikachu, Koopa Troopa, Chocobo) stay.
    if (
      entity.isClass &&
      !info.works.some((work) => FRANCHISE_PROPS.has(work.prop))
    )
      return "generic type";
    return info.classes.some((label) => NOT_A_CHARACTER.test(label))
      ? "not a character"
      : null;
  }
  const text = [
    ...Object.values(info.descriptions),
    ...Object.values(info.occupationLabels).flat(),
  ].join(" | ");
  if (ADULT_OCCUPATION.test(text)) return "adult content";
  if (UNSAFE_PERSON.test(text)) return "unsafe";
  return null;
}
/** Groups, families and teams count as one character; these don't. */
const NOT_A_CHARACTER =
  /\b(episode|army|military unit|dynasty|company|corporation|school|university|agency|government)$|^Wikimedia/i;
/** Franchise, fictional universe, "present in work", "from narrative universe". */
const FRANCHISE_PROPS = new Set(["P8345", "P1080", "P1441", "P4584"]);
/** Real groups from the "group:" pools: band, duo, idol group, comedy group. */
const isGroup = (entity: Entity) =>
  [...entity.pools].some((pool) => pool.startsWith("group:"));
/** Kinds of real groups, by origin id; the first that matches wins, else a band. */
const GROUPS: Record<
  string,
  { match: RegExp; category: Category; labels: Record<Lang, string> }
> = {
  "group:comedy": {
    match: /comedy|comic|humor|humou?r|お笑い|コント|漫才/i,
    category: "entertainment",
    labels: { en: "comedy group", pt: "grupo de humor", ja: "お笑いグループ" },
  },
  "group:duo": {
    match: /\bduo\b|\bdupla\b|デュオ|ユニット/i,
    category: "music",
    labels: { en: "music duo", pt: "dupla musical", ja: "音楽デュオ" },
  },
  "group:idol": {
    match: /\bidol\b|アイドル|ídolos/i,
    category: "music",
    labels: { en: "idol group", pt: "grupo de ídolos", ja: "アイドルグループ" },
  },
  "group:band": {
    match: /./,
    category: "music",
    labels: { en: "band", pt: "banda", ja: "バンド" },
  },
};
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
// Origins: one per character, shared by every language. An origin is an id
// ("wd:Q8337", "job:actress") with its labels collected in `originLabels`,
// written to data/origins.json, so the app (and the database) translate it.

const WORK_ORDER = ["P8345", "P1080", "P361", "P1441", "P4584"];

/** Labels of every origin handed out so far, by id. */
const originLabels = new Map<string, ByLang<string>>();
/** Origins with the same labels in every language are one origin. */
const originBySignature = new Map<string, string>();
/** Every Wikidata work seen, for origins picked by hand. */
const worksById = new Map<string, Work>();
const DESCRIPTOR_BY_KEY = new Map(DESCRIPTORS.map((d) => [d.key, d]));

function registerOrigin(id: string, labels: ByLang<string>): string {
  const replacement = ORIGIN_REPLACEMENTS[id];
  if (replacement) return resolveOrigin(replacement);
  const known = originLabels.get(id);
  if (known) return id;
  const signature = LANGS.map((lang) => normalizeName(labels[lang] ?? "")).join(
    "|",
  );
  const same = originBySignature.get(signature);
  if (same) return same;
  originBySignature.set(signature, id);
  originLabels.set(id, labels);
  return id;
}

/** Labels of a work, cleaned; empty when no language has a usable one. */
function workLabels(work: Work): ByLang<string> {
  const labels: ByLang<string> = {};
  for (const lang of LANGS) {
    const label = work.labels[lang];
    if (!label) continue;
    const cleaned = cleanWorkLabel(label, lang);
    if (!validName(cleaned) || (lang === "ja" && notJapanese(cleaned)))
      continue;
    labels[lang] = lang === "ja" ? cleaned : capitalize(cleaned);
  }
  return labels;
}

function descriptorOrigin(descriptor: Descriptor, female: boolean): string {
  const gendered = LANGS.some(
    (lang) => descriptor.labels[lang][0] !== descriptor.labels[lang][1],
  );
  const form = female && gendered ? 1 : 0;
  return registerOrigin(
    `job:${descriptor.key}${form ? ":f" : ""}`,
    Object.fromEntries(
      LANGS.map((lang) => [lang, descriptor.labels[lang][form]]),
    ),
  );
}

/** An origin id from overrides.ts, registered; throws on an unknown id. */
function resolveOrigin(id: string): string {
  const custom = CUSTOM_ORIGINS[id];
  if (custom) return registerOrigin(id, custom.labels);
  const group = GROUPS[id];
  if (group) return registerOrigin(id, group.labels);
  const job = /^job:([a-z0-9-]+)(:f)?$/.exec(id);
  const descriptor = job && DESCRIPTOR_BY_KEY.get(job[1]);
  if (descriptor) return descriptorOrigin(descriptor, !!job[2]);
  const work = id.startsWith("wd:") && worksById.get(id.slice(3));
  if (work) return registerOrigin(id, workLabels(work));
  throw new Error(`unknown origin "${id}" in overrides.ts`);
}

function fictionalOrigin(
  entity: Entity,
  details: Details | undefined,
  character: AniListCharacter | undefined,
): string | null {
  // A work named after the character ("Sherlock Holmes") says nothing.
  const names = new Set(
    Object.values(entity.labels).map((label) => normalizeName(label ?? "")),
  );
  for (const prop of WORK_ORDER) {
    const works = (details?.works ?? [])
      .filter((work) => work.prop === prop)
      .filter((work) => prop !== "P361" || MYTHOLOGY.test(work.labels.en ?? ""))
      .sort((a, b) => b.sitelinks - a.sitelinks);
    for (const work of works) {
      const labels = workLabels(work);
      const values = Object.values(labels);
      if (values.length === 0) continue;
      if (values.some((label) => names.has(normalizeName(label)))) continue;
      return registerOrigin(`wd:${work.qid}`, labels);
    }
  }
  return character ? aniListOrigin(character) : null;
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

function aniListOrigin(character: AniListCharacter): string | null {
  if (!character.media) return null;
  const labels: ByLang<string> = {};
  for (const lang of LANGS) {
    const title = aniListTitle(character, lang);
    const cleaned = title ? cleanName(title) : null;
    if (!validName(cleaned) || (lang === "ja" && notJapanese(cleaned)))
      continue;
    labels[lang] = cleaned;
  }
  if (Object.keys(labels).length === 0) return null;
  return registerOrigin(`al:${character.media.id}`, labels);
}

function humanOrigin(
  entity: Entity,
  details: Details | undefined,
): string | null {
  if (!details) return null;
  if (isGroup(entity)) {
    const text = [
      ...Object.values(details.descriptions),
      entity.labels.en ?? "",
    ].join(" | ");
    const [id, group] =
      Object.entries(GROUPS).find(([, group]) => group.match.test(text)) ?? [];
    return id && group ? registerOrigin(id, group.labels) : null;
  }
  const descriptor = pickDescriptor(
    details.occupations,
    details.descriptions,
    "en",
  );
  if (descriptor) return descriptorOrigin(descriptor, entity.female);
  // Wikidata's own occupation label. Labels line up with the occupations only
  // in languages that have a label for each of them.
  const { occupations, occupationLabels } = details;
  const aligned = (lang: Lang) =>
    occupationLabels[lang]?.length === occupations.length
      ? occupationLabels[lang]
      : undefined;
  const fits = (label: string | undefined): label is string =>
    !!label && label.length <= 40 && !ADULT_OCCUPATION.test(label);
  for (let i = 0; i < occupations.length; i++) {
    if (!fits(aligned("en")?.[i])) continue;
    const labels: ByLang<string> = {};
    for (const lang of LANGS) {
      const label = aligned(lang)?.[i];
      if (fits(label)) labels[lang] = label;
    }
    return registerOrigin(`wd:${occupations[i]}`, labels);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Categories

const JOB_CATEGORIES: Record<Category, string[]> = {
  sports: [
    "footballer",
    "football-coach",
    "basketball",
    "tennis",
    "racing",
    "f1",
    "boxer",
    "mma",
    "wrestler",
    "sumo",
    "baseball",
    "american-football",
    "hockey",
    "golfer",
    "figure-skater",
    "swimmer",
    "athletics",
    "gymnast",
    "judoka",
    "cyclist",
    "cricketer",
    "volleyball",
    "chess",
    "skater",
    "surfer",
    "athlete",
  ],
  politics: ["politician", "diplomat", "activist"],
  royalty: ["monarch"],
  history: ["samurai", "military", "explorer"],
  entertainment: [
    "actor",
    "voice-actor",
    "comedian",
    "tarento",
    "presenter",
    "model",
    "dancer",
    "journalist",
  ],
  internet: ["youtuber"],
  music: [
    "singer-songwriter",
    "singer",
    "rapper",
    "idol",
    "guitarist",
    "pianist",
    "musician",
    "composer",
    "dj",
  ],
  film_tv: ["director", "producer"],
  art: [
    "mangaka",
    "animator",
    "cartoonist",
    "fashion",
    "painter",
    "sculptor",
    "architect",
    "photographer",
  ],
  literature: ["poet", "writer"],
  science: [
    "astronaut",
    "inventor",
    "physicist",
    "mathematician",
    "chemist",
    "biologist",
    "astronomer",
    "scientist",
    "physician",
    "philosopher",
  ],
  business: ["business", "chef"],
  religion: ["religious"],
  anime: [],
  games: [],
  comics: [],
  cartoons: [],
  mythology: [],
  folklore: [],
  other: [],
};
const JOB_CATEGORY = new Map(
  Object.entries(JOB_CATEGORIES).flatMap(([category, keys]) =>
    keys.map((key) => [key, category as Category]),
  ),
);

/**
 * Fiction by its Wikidata classes: each class ("comics character", "Greek
 * deity") votes for the first rule it matches. Film, TV and animation votes
 * count half, since nearly every famous character gets adapted; ties go to
 * the first category in FICTION_ORDER (where the character started).
 */
const FICTION_RULES: [Category, RegExp, number][] = [
  [
    "religion",
    /biblical|\bbible\b|angel|Christian|Judaism|Islam|Bodhisattva|Buddh|\bsaint\b|prophet|Wisdom King|Ars Goetia/i,
    1,
  ],
  [
    "folklore",
    /folklore|legend|yōkai|yokai|creature|cryptid|fairy|Arthurian/i,
    1,
  ],
  [
    "mythology",
    /myth|deity|\bgods?\b|goddess|titan|\bDevi\b|\bDeva\b|kami\b|orisha|Mahabharata|Ramayana|Oceanid|Jötunn|Olympian|theonym|Iliad|Odyssey|Aeneid/i,
    1,
  ],
  [
    "anime",
    /\b(anime|manga|light novel|Sailor Soldier|Soul Reaper|mobile suit)\b/i,
    1,
  ],
  [
    "games",
    /video game|Mario franchise|Donkey Kong|Pokémon|game character/i,
    1,
  ],
  [
    "comics",
    /comic|superhero|super-?villain|mutant|mutate|metahuman|Kryptonian|Asgardian|Marvel|\bDC\b/i,
    1,
  ],
  ["cartoons", /cartoon|Looney Tunes|Disney|puppet|Muppet/i, 1],
  ["cartoons", /animated|CGI/i, 0.5],
  [
    "literature",
    /literary|novel|\bbook|Middle-earth|Harry Potter|Song of Ice|Gryffindor|Sherlock|Discworld|Narnia/i,
    1,
  ],
  [
    "film_tv",
    /Star Wars|Star Trek|Doctor Who|Game of Thrones|sitcom|soap opera/i,
    1,
  ],
  ["film_tv", /film|movie|television|\bTV\b|theatrical|musical/i, 0.5],
  ["internet", /internet|meme|creepypasta|VTuber|YouTube/i, 1],
];
const FICTION_ORDER: Category[] = [
  "religion",
  "mythology",
  "folklore",
  "literature",
  "comics",
  "games",
  "cartoons",
  "anime",
  "film_tv",
  "internet",
];

/** The category the most labels vote for, or null when none matches. */
function fictionCategory(labels: string[]): Category | null {
  const votes = new Map<Category, number>();
  for (const label of labels) {
    const rule = FICTION_RULES.find(([, pattern]) => pattern.test(label));
    if (rule) votes.set(rule[0], (votes.get(rule[0]) ?? 0) + rule[2]);
  }
  let best: Category | null = null;
  for (const category of FICTION_ORDER) {
    if ((votes.get(category) ?? 0) > (best ? (votes.get(best) ?? 0) : 0))
      best = category;
  }
  return best;
}

function categoryOf(
  kind: Entity["kind"],
  details: Details | undefined,
  character: AniListCharacter | undefined,
  origin: string | null,
): Category {
  const custom = origin ? CUSTOM_ORIGINS[origin] : undefined;
  if (custom) return custom.category;
  if (kind === "human") {
    if (origin && GROUPS[origin]) return GROUPS[origin].category;
    const key = origin?.match(/^job:([a-z0-9-]+)/)?.[1];
    return (key && JOB_CATEGORY.get(key)) || "other";
  }
  const label = origin ? (originLabels.get(origin)?.en ?? "") : "";
  return (
    fictionCategory(details?.classes ?? []) ??
    (character ? "anime" : null) ??
    fictionCategory([label]) ??
    "other"
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

/** One picture per character, shared by every language. */
function pickImage(
  entity: Entity,
  character: AniListCharacter | undefined,
  images: ImageSources,
): string | null {
  const page = (l: Lang) => {
    const title = entity.titles[l];
    return title ? (images.pages[l].get(title)?.image ?? undefined) : undefined;
  };
  const pages = LANGS.map(page);
  const p18 = entity.p18 ? images.commons.get(entity.p18) : undefined;
  const order =
    entity.kind === "fictional"
      ? [page("en"), character?.image ?? undefined, ...pages, p18]
      : [p18, ...pages];
  return order.find(Boolean) ?? null;
}

// ---------------------------------------------------------------------------
// Selection

/** What a character is, whatever the language: worked out once. */
interface Profile {
  /** "wd-Q302" or "al-40". */
  key: string;
  kind: Entity["kind"];
  category: Category;
  origin: string | null;
  imageUrl: string | null;
  /** Labels in every language, for the languages whose list leaves it out. */
  labels: ByLang<string>;
}

/** A character in one language's list. */
interface Candidate {
  /** Entry id in that list ("pt-wd-Q302"), as overrides.ts keys entries. */
  id: string;
  lang: Lang;
  profile: Profile;
  name: string;
  /** Origin id, shared by every language (copied for the dedup key). */
  origin: string | null;
  imageUrl: string | null;
  aliases: string[];
  popularity: number;
  /** Score before the fictional offset; popularity is set from it at the end. */
  score: number;
  kind: Entity["kind"];
  source: "wd" | "al" | "wd+al";
  /** Raw signals, for the debug lists. */
  signals: { sitelinks: number; views: number; favourites: number };
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
        score: c.score + offsetFor(c, offset),
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

/** Kanji and kana a Japanese reader knows (JIS X 0208); Chinese-only forms fall outside. */
const JIS = (() => {
  const chars = new Set<string>();
  const decoder = new TextDecoder("shift_jis");
  for (let a = 0x81; a <= 0xfc; a++) {
    if (a > 0x9f && a < 0xe0) continue;
    for (let b = 0x40; b <= 0xfc; b++) {
      if (b === 0x7f) continue;
      const c = decoder.decode(new Uint8Array([a, b]));
      if (c.length === 1 && c !== "�") chars.add(c);
    }
  }
  return chars;
})();
const HAN = /\p{Script=Han}/u;
/** Han characters a Japanese list shouldn't show (simplified Chinese, from Chinese works). */
const notJapanese = (text: string) =>
  [...text].some((c) => HAN.test(c) && !JIS.has(c));

/** Applies the hand-reviewed removals, names and aliases (overrides.ts). */
function reviewed(candidates: Candidate[], lang: Lang): Candidate[] {
  return candidates
    .filter((candidate) => !REMOVE_IDS[candidate.id])
    .filter(
      (candidate) =>
        lang !== "ja" || !!NAMES[candidate.id] || !notJapanese(candidate.name),
    )
    .map((candidate) => {
      const name = NAMES[candidate.id];
      const renamed =
        name && name !== candidate.name
          ? {
              name,
              aliases: buildAliases(name, [
                candidate.name,
                ...candidate.aliases,
              ]),
            }
          : {};
      const base = { ...candidate, ...renamed };
      const dropped = new Set(DROP_ALIASES[candidate.id] ?? []);
      return {
        ...base,
        aliases: base.aliases.filter((alias) => !dropped.has(alias)),
      };
    });
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
  // Fictional "classes" stay for now: species like Pikachu are classes on
  // Wikidata. Generic types are dropped once their details are known.
  const entities = [...pool.values()].filter(
    (entity) => !entity.isClass || entity.kind === "fictional",
  );
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

  // Origin, category and picture belong to the character, not to a language.
  for (const info of details.values()) {
    for (const work of info.works) worksById.set(work.qid, work);
  }
  const pickOrigin = (key: string, generated: () => string | null) => {
    if (!(key in ORIGINS)) return generated();
    const id = ORIGINS[key];
    return id ? resolveOrigin(id) : null;
  };
  const localName = (raw: string | null | undefined, lang: Lang) => {
    if (!raw || (lang === "ja" && (HANGUL.test(raw) || notJapanese(raw))))
      return undefined;
    const name = cleanName(raw);
    return validName(name) ? name : undefined;
  };
  const profiles = new Map<string, Profile>();
  const wikidataProfile = (entity: Entity): Profile => {
    const key = `wd-${entity.qid}`;
    const known = profiles.get(key);
    if (known) return known;
    const info = details.get(entity.qid);
    const character = matches.get(entity.qid);
    const origin = pickOrigin(entity.qid, () =>
      entity.kind === "human"
        ? humanOrigin(entity, info)
        : fictionalOrigin(entity, info, character),
    );
    const profile: Profile = {
      key,
      kind: entity.kind,
      category: categoryOf(entity.kind, info, character, origin),
      origin,
      imageUrl: pickImage(entity, character, images),
      labels: Object.fromEntries(
        LANGS.map((lang) => [lang, localName(entity.labels[lang], lang)]),
      ),
    };
    profiles.set(key, profile);
    return profile;
  };
  const aniListProfile = (character: AniListCharacter): Profile => {
    const key = `al-${character.id}`;
    const known = profiles.get(key);
    if (known) return known;
    const origin = pickOrigin(key, () => aniListOrigin(character));
    const latin =
      character.full && LATIN_ONLY.test(character.full)
        ? character.full
        : undefined;
    const profile: Profile = {
      key,
      kind: "fictional",
      category: categoryOf("fictional", undefined, character, origin),
      origin,
      imageUrl: character.image,
      labels: {
        en: localName(latin, "en"),
        pt: localName(latin, "pt"),
        ja: localName(character.native, "ja"),
      },
    };
    profiles.set(key, profile);
    return profile;
  };

  const lists = {} as Record<Lang, Candidate[]>;
  for (const lang of LANGS) {
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
      const profile = wikidataProfile(entity);
      candidates.push({
        id: `${lang}-${profile.key}`,
        lang,
        profile,
        name,
        origin: profile.origin,
        imageUrl: profile.imageUrl,
        aliases: buildAliases(name, [
          entity.labels[lang],
          ...(info?.aliases[lang] ?? []),
          ...(character ? aniListNames(character, lang) : []),
        ]),
        popularity: 0,
        score,
        kind: entity.kind,
        source: character ? "wd+al" : "wd",
        signals: {
          sitelinks: entity.sitelinks,
          views: Math.round(viewsOf(views, entity, lang)),
          favourites: character?.favourites ?? 0,
        },
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
      const profile = aniListProfile(character);
      candidates.push({
        id: `${lang}-${profile.key}`,
        lang,
        profile,
        name,
        origin: profile.origin,
        imageUrl: profile.imageUrl,
        aliases: buildAliases(name, aniListNames(character, lang)),
        popularity: 0,
        score: favouriteScore(character.favourites) + offsets[lang],
        kind: "fictional",
        source: "al",
        signals: { sitelinks: 0, views: 0, favourites: character.favourites },
      });
    }
    const offset = fictionalOffset(candidates, MAX_ENTRIES, FICTIONAL_SHARE);
    for (const candidate of candidates) {
      candidate.popularity = toPopularity(
        candidate.score + offsetFor(candidate, offset),
      );
    }
    console.log(`  ${lang}: fictional offset ${offset.toFixed(1)}`);
    lists[lang] = candidates;
  }

  step("6/6 Write");
  const entries = new Map<string, SeedCharacter>();
  const chosenProfiles = new Map<string, Profile>();
  for (const lang of LANGS) {
    const chosen = selectEntries(reviewed(lists[lang], lang), MAX_ENTRIES);
    for (const candidate of chosen) {
      const { profile } = candidate;
      let entry = entries.get(profile.key);
      if (!entry) {
        entry = {
          id: profile.key,
          kind: profile.kind,
          category: profile.category,
          origin: profile.origin,
          imageUrl: profile.imageUrl,
          names: {},
          aliases: {},
          popularity: {},
        };
        entries.set(profile.key, entry);
        chosenProfiles.set(profile.key, profile);
      }
      entry.names[lang] = candidate.name;
      if (candidate.aliases.length > 0) entry.aliases[lang] = candidate.aliases;
      entry.popularity[lang] = candidate.popularity;
    }
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
    const debug = chosen.map((candidate, index) => {
      const labels = candidate.origin
        ? originLabels.get(candidate.origin)
        : undefined;
      return [
        index + 1,
        candidate.popularity,
        candidate.kind,
        candidate.source,
        candidate.profile.category,
        candidate.name,
        labels?.[lang] ?? labels?.en ?? "",
        candidate.imageUrl ? "img" : "-",
        candidate.signals.sitelinks,
        candidate.signals.views,
        candidate.signals.favourites,
        candidate.score.toFixed(1),
      ].join("\t");
    });
    await writeFile(
      path.join(CACHE_DIR, `debug-${lang}.tsv`),
      `${debug.join("\n")}\n`,
    );
    // Every candidate with its raw signals, to tune the score without a rebuild.
    const raw = lists[lang].map((candidate) =>
      [
        candidate.id,
        candidate.kind,
        candidate.source,
        candidate.profile.category,
        candidate.name,
        candidate.signals.sitelinks,
        candidate.signals.views,
        candidate.signals.favourites,
        candidate.imageUrl ? "img" : "-",
      ].join("\t"),
    );
    await writeFile(
      path.join(CACHE_DIR, `candidates-${lang}.tsv`),
      `${raw.join("\n")}\n`,
    );
  }
  // Names in the languages whose list leaves the character out still help
  // players who guess in another language. Every map in language order.
  const byLang = <T>(values: ByLang<T>): ByLang<T> =>
    Object.fromEntries(
      LANGS.filter((lang) => values[lang] !== undefined).map((lang) => [
        lang,
        values[lang],
      ]),
    );
  const best = (entry: SeedCharacter) =>
    Math.max(...Object.values(entry.popularity));
  const output = [...entries.values()]
    .map((entry): SeedCharacter => {
      const profile = chosenProfiles.get(entry.id) as Profile;
      const names: ByLang<string> = {};
      for (const lang of LANGS) {
        names[lang] =
          entry.names[lang] ??
          NAMES[`${lang}-${entry.id}`] ??
          profile.labels[lang];
      }
      return {
        ...entry,
        names: byLang(names),
        aliases: byLang(entry.aliases),
        popularity: byLang(entry.popularity),
      };
    })
    .sort((a, b) => best(b) - best(a) || a.id.localeCompare(b.id));
  const used = new Set<string>();
  for (const entry of output) if (entry.origin) used.add(entry.origin);
  const origins: SeedOrigin[] = [...used]
    .map((id) => ({ id, labels: byLang(originLabels.get(id) ?? {}) }))
    .sort((a, b) => a.id.localeCompare(b.id));
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "characters.json"), formatJson(output));
  await writeFile(path.join(OUT_DIR, "origins.json"), formatJson(origins));
  const categories = new Map<string, number>();
  for (const entry of output) {
    categories.set(entry.category, (categories.get(entry.category) ?? 0) + 1);
  }
  console.log(
    `  ${output.length} characters, ${origins.length} origins; ${[...categories]
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => `${count} ${category}`)
      .join(", ")}`,
  );
  console.log(`\ndone in ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
