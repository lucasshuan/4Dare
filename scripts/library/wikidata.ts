// Wikidata SPARQL: candidate pools (fictional characters, mythology, people by
// occupation and by country) and per-item details for the shortlisted ones.
import { DESCRIPTORS } from "./descriptors";
import { cachedJson, chunk, HttpError, KeyStore } from "./http";
import type { ByLang, Details, Entity, Lang, Work } from "./types";

const ENDPOINT = "https://query.wikidata.org/sparql";

type Term = { type: string; value: string; "xml:lang"?: string };
type Row = Record<string, Term | undefined>;

export async function sparql(query: string, attempts = 3): Promise<Row[]> {
  const json = await cachedJson<{ results: { bindings: Row[] } }>(
    "sparql",
    ENDPOINT,
    {
      method: "POST",
      headers: {
        Accept: "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `query=${encodeURIComponent(query)}`,
      key: query,
      attempts,
      timeout: 120_000,
    },
  );
  return json.results.bindings;
}

const qidOf = (term: Term | undefined) =>
  term?.value.replace("http://www.wikidata.org/entity/", "") ?? "";

/** Language of a literal, with pt-br and mul folded where they help. */
function langOf(term: Term | undefined): string | undefined {
  return term?.["xml:lang"];
}

// ---------------------------------------------------------------------------
// Pools

export interface PoolSpec {
  name: string;
  kind: Entity["kind"];
  /** Inner pattern binding ?item and ?sl; MIN/MAX are replaced by the range. */
  pattern: string;
  min: number;
  max?: number;
}

const FICTIONAL: PoolSpec[] = [
  {
    name: "fictional character",
    kind: "fictional",
    pattern: "?item wdt:P31/wdt:P279* wd:Q95074 ; wikibase:sitelinks ?sl .",
    min: 3,
  },
  {
    name: "mythical character",
    kind: "fictional",
    pattern: "?item wdt:P31/wdt:P279* wd:Q4271324 ; wikibase:sitelinks ?sl .",
    min: 6,
  },
  {
    name: "deity",
    kind: "fictional",
    pattern: "?item wdt:P31/wdt:P279* wd:Q178885 ; wikibase:sitelinks ?sl .",
    min: 8,
  },
  // A whole group can be the character: duos, families, teams (Avengers, Simpsons).
  {
    name: "group of fictional characters",
    kind: "fictional",
    pattern: "?item wdt:P31/wdt:P279* wd:Q14514600 ; wikibase:sitelinks ?sl .",
    min: 8,
  },
  // Species from games and films (Chocobo, Ewok, Pikmin).
  {
    name: "fictional species",
    kind: "fictional",
    pattern: "?item wdt:P31/wdt:P279* wd:Q21192438 ; wikibase:sitelinks ?sl .",
    min: 8,
  },
];

/** Real groups, picked as one "character": bands, duos, comedy troupes. Names start with "group:". */
const GROUP_POOLS: PoolSpec[] = [
  [
    "group: musical",
    "?item wdt:P31/wdt:P279* wd:Q215380 ; wikibase:sitelinks ?sl .",
    40,
  ],
  [
    "group: musical (Brazil)",
    "?item wdt:P31/wdt:P279* wd:Q215380 ; wdt:P495 wd:Q155 ; wikibase:sitelinks ?sl .",
    6,
  ],
  [
    "group: musical (Japan)",
    "?item wdt:P31/wdt:P279* wd:Q215380 ; wdt:P495 wd:Q17 ; wikibase:sitelinks ?sl .",
    8,
  ],
  [
    "group: musical (Portugal)",
    "?item wdt:P31/wdt:P279* wd:Q215380 ; wdt:P495 wd:Q45 ; wikibase:sitelinks ?sl .",
    8,
  ],
  [
    "group: comedy",
    "?item wdt:P31/wdt:P279* wd:Q18510489 ; wikibase:sitelinks ?sl .",
    6,
  ],
].map(([name, pattern, min]) => ({
  name: String(name),
  kind: "human" as const,
  pattern: String(pattern),
  min: Number(min),
}));

/** Occupation groups and the sitelink count a person needs to be considered. */
const OCCUPATION_MIN: Record<string, number> = {
  actor: 18,
  "singer-songwriter": 18,
  singer: 18,
  rapper: 15,
  idol: 10,
  "voice-actor": 12,
  comedian: 15,
  tarento: 10,
  presenter: 20,
  youtuber: 10,
  model: 20,
  dancer: 25,
  dj: 20,
  guitarist: 25,
  pianist: 30,
  musician: 20,
  composer: 30,
  director: 25,
  producer: 35,
  mangaka: 10,
  animator: 15,
  cartoonist: 20,
  fashion: 25,
  chef: 20,
  footballer: 30,
  "football-coach": 30,
  samurai: 10,
  monarch: 40,
  politician: 45,
  military: 45,
  religious: 45,
  physician: 50,
  journalist: 45,
  activist: 40,
  diplomat: 60,
};
const DEFAULT_OCCUPATION_MIN = 30;
/** Occupations too broad to scan with a low threshold. */
const BROAD_MIN: Record<string, number> = {
  Q33999: 22, // actor
  Q177220: 22, // singer
  Q36180: 45, // writer
  Q1028181: 40, // painter
  Q483501: 50, // artist
  Q1650915: 60, // researcher
  Q28389: 45, // screenwriter
  Q2066131: 30, // athlete
};

function occupationPools(): PoolSpec[] {
  const pools: PoolSpec[] = [];
  for (const descriptor of DESCRIPTORS) {
    for (const occupation of descriptor.occupations) {
      const min =
        BROAD_MIN[occupation] ??
        OCCUPATION_MIN[descriptor.key] ??
        DEFAULT_OCCUPATION_MIN;
      pools.push({
        name: `occupation ${descriptor.key} ${occupation}`,
        kind: "human",
        pattern: `?item wdt:P106 wd:${occupation} ; wikibase:sitelinks ?sl . FILTER(?sl >= MIN && ?sl < MAX) ?item wdt:P31 wd:Q5 .`,
        min,
      });
    }
  }
  return pools;
}

const COUNTRY_POOLS: PoolSpec[] = [
  ["Japan", "Q17", 5],
  ["Empire of Japan", "Q188712", 5],
  ["Brazil", "Q155", 5],
  ["Empire of Brazil", "Q217230", 5],
  ["Portugal", "Q45", 8],
  ["Kingdom of Portugal", "Q45670", 8],
].map(([name, qid, min]) => ({
  name: `citizens of ${name}`,
  kind: "human" as const,
  pattern: `?item wdt:P27 wd:${qid} ; wikibase:sitelinks ?sl . FILTER(?sl >= MIN && ?sl < MAX) ?item wdt:P31 wd:Q5 .`,
  min: Number(min),
}));

function poolQuery(pattern: string, min: number, max: number): string {
  let inner = pattern.replace("MIN", String(min)).replace("MAX", String(max));
  if (!pattern.includes("MIN")) {
    inner += ` FILTER(?sl >= ${min} && ?sl < ${max})`;
  }
  return `SELECT DISTINCT ?item ?sl WHERE { ${inner} }`;
}

/** Labels, article titles and flags for a batch of items. */
function coreQuery(qids: string[]): string {
  return `SELECT ?item ?en ?pt ?ptbr ?mul ?ja ?enT ?ptT ?jaT ?img ?al ?sub ?gender WHERE {
  VALUES ?item { ${values(qids)} }
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") }
  OPTIONAL { ?item rdfs:label ?pt FILTER(LANG(?pt) = "pt") }
  OPTIONAL { ?item rdfs:label ?ptbr FILTER(LANG(?ptbr) = "pt-br") }
  OPTIONAL { ?item rdfs:label ?mul FILTER(LANG(?mul) = "mul") }
  OPTIONAL { ?item rdfs:label ?ja FILTER(LANG(?ja) = "ja") }
  OPTIONAL { ?enA schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?enT }
  OPTIONAL { ?ptA schema:about ?item ; schema:isPartOf <https://pt.wikipedia.org/> ; schema:name ?ptT }
  OPTIONAL { ?jaA schema:about ?item ; schema:isPartOf <https://ja.wikipedia.org/> ; schema:name ?jaT }
  OPTIONAL { ?item wdt:P18 ?img }
  OPTIONAL { ?item wdt:P11736 ?al }
  OPTIONAL { ?item wdt:P279 ?sub }
  OPTIONAL { ?item wdt:P21 ?gender }
}`;
}

const MAX_SITELINKS = 1000;

/** Run a pool query, halving the sitelink range whenever it times out. */
async function runPool(
  spec: PoolSpec,
  min: number,
  max: number,
): Promise<Row[]> {
  try {
    return await sparql(poolQuery(spec.pattern, min, max), 2);
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
    // A client error (bad query, blocked client) won't get better by splitting.
    if (error.status >= 400 && error.status < 500 && error.status !== 429)
      throw error;
    if (max - min <= 1) {
      console.warn(
        `  ! giving up on ${spec.name} [${min}, ${max}): ${error.message.slice(0, 120)}`,
      );
      return [];
    }
    // Open-ended top range: grow geometrically, but always strictly inside (min, max).
    const mid =
      max >= MAX_SITELINKS && min * 2 < max
        ? min * 2
        : Math.floor((min + max) / 2);
    console.warn(`  ~ splitting ${spec.name} at ${mid}`);
    return [
      ...(await runPool(spec, min, mid)),
      ...(await runPool(spec, mid, max)),
    ];
  }
}

function fileName(url: string): string {
  return decodeURIComponent(url.replace(/^.*Special:FilePath\//, "")).replace(
    /_/g,
    " ",
  );
}

/** What hydration stores per item (cached per QID). */
interface Core {
  labels: ByLang<string>;
  titles: ByLang<string>;
  p18?: string;
  anilistId?: number;
  isClass: boolean;
  female: boolean;
}

const FEMALE = new Set(["Q6581072", "Q1052281"]);

function coreFromRows(rows: Row[]): Map<string, Core> {
  const out = new Map<string, Core>();
  for (const row of rows) {
    const qid = qidOf(row.item);
    let core = out.get(qid);
    if (!core) {
      core = { labels: {}, titles: {}, isClass: false, female: false };
      out.set(qid, core);
    }
    const latin = row.mul?.value;
    core.labels.en ??= row.en?.value ?? latin;
    // The app speaks Brazilian Portuguese: pt-br labels win over pt ones.
    core.labels.pt ??= row.ptbr?.value ?? row.pt?.value ?? latin;
    core.labels.ja ??= row.ja?.value;
    core.titles.en ??= row.enT?.value;
    core.titles.pt ??= row.ptT?.value;
    core.titles.ja ??= row.jaT?.value;
    if (row.img && !core.p18) core.p18 = fileName(row.img.value);
    if (row.al && !core.anilistId) core.anilistId = Number(row.al.value);
    if (row.sub) core.isClass = true;
    if (FEMALE.has(qidOf(row.gender))) core.female = true;
  }
  return out;
}

/** Fetch labels/titles/flags for items, 250 per query, cached per QID. */
async function hydrate(qids: string[]): Promise<Map<string, Core>> {
  const store = await new KeyStore<Core>("core").load();
  const missing = qids.filter((qid) => !store.has(qid)).sort();
  const batches = chunk(missing, 250);
  console.log(`  hydrate: ${qids.length} items, ${missing.length} to fetch`);
  for (const [index, batch] of batches.entries()) {
    try {
      const cores = coreFromRows(await sparql(coreQuery(batch)));
      await store.add(
        batch.map((qid) => [
          qid,
          cores.get(qid) ?? {
            labels: {},
            titles: {},
            isClass: false,
            female: false,
          },
        ]),
      );
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      console.warn(`  ! hydrate batch skipped: ${error.message.slice(0, 120)}`);
    }
    if ((index + 1) % 25 === 0 || index + 1 === batches.length) {
      console.log(`  hydrate ${index + 1}/${batches.length} batches`);
    }
  }
  const out = new Map<string, Core>();
  for (const qid of qids) {
    const core = store.get(qid);
    if (core) out.set(qid, core);
  }
  return out;
}

export function poolSpecs(): PoolSpec[] {
  return [...FICTIONAL, ...occupationPools(), ...COUNTRY_POOLS, ...GROUP_POOLS];
}

/** Every candidate item: pool scans first, then one hydration pass. */
export async function collectPools(
  specs: PoolSpec[] = poolSpecs(),
): Promise<Map<string, Entity>> {
  const found = new Map<
    string,
    { sitelinks: number; kind: Entity["kind"]; pools: Set<string> }
  >();
  for (const [index, spec] of specs.entries()) {
    const rows = await runPool(spec, spec.min, spec.max ?? MAX_SITELINKS);
    for (const row of rows) {
      const qid = qidOf(row.item);
      if (!/^Q\d+$/.test(qid)) continue;
      const entry = found.get(qid) ?? {
        sitelinks: Number(row.sl?.value ?? 0),
        kind: spec.kind,
        pools: new Set<string>(),
      };
      if (spec.kind === "fictional") entry.kind = "fictional";
      entry.pools.add(spec.name);
      found.set(qid, entry);
    }
    console.log(
      `  [${index + 1}/${specs.length}] ${spec.name}: ${rows.length} items, ${found.size} total`,
    );
  }
  const cores = await hydrate([...found.keys()]);
  const pool = new Map<string, Entity>();
  for (const [qid, entry] of found) {
    const core = cores.get(qid);
    if (!core) continue;
    pool.set(qid, { qid, ...entry, ...core });
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Details

const LANG_OF: Record<string, Lang> = {
  en: "en",
  pt: "pt",
  "pt-br": "pt",
  ja: "ja",
  mul: "en",
};

function values(qids: string[]) {
  return qids.map((qid) => `wd:${qid}`).join(" ");
}

function labelOptionals(variable: string) {
  return ["en", "pt", "pt-br", "mul", "ja"]
    .map((lang) => {
      const name = `${variable}_${lang.replace("-", "")}`;
      return `OPTIONAL { ?${variable} rdfs:label ?${name} FILTER(LANG(?${name}) = "${lang}") }`;
    })
    .join("\n  ");
}

function labelsFrom(row: Row, variable: string): ByLang<string> {
  const latin = row[`${variable}_mul`]?.value;
  return {
    en: row[`${variable}_en`]?.value ?? latin,
    pt: row[`${variable}_ptbr`]?.value ?? row[`${variable}_pt`]?.value ?? latin,
    ja: row[`${variable}_ja`]?.value,
  };
}

function emptyDetails(): Details {
  return {
    aliases: {},
    descriptions: {},
    occupations: [],
    occupationLabels: {},
    works: [],
    classes: [],
  };
}

const WORK_PROPS = ["P8345", "P1080", "P361", "P4584", "P1441", "P31"];

/** Aliases, descriptions, works (fictional) and occupations (people). */
export async function fetchDetails(
  entities: Entity[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, Details>> {
  const store = await new KeyStore<Details>("details").load();
  const details = new Map<string, Details>();
  for (const entity of entities) {
    const cached = store.get(entity.qid);
    if (cached) details.set(entity.qid, cached);
  }
  const missing = entities.filter((entity) => !store.has(entity.qid));
  console.log(
    `  details: ${entities.length} items, ${missing.length} to fetch`,
  );
  const get = (qid: string) => {
    let entry = details.get(qid);
    if (!entry) {
      entry = emptyDetails();
      details.set(qid, entry);
    }
    return entry;
  };
  const batches = chunk(missing.map((entity) => entity.qid).sort(), 400);
  const kindOf = new Map(missing.map((entity) => [entity.qid, entity.kind]));
  let done = 0;
  for (const batch of batches) {
    try {
      const textRows = await sparql(`SELECT ?item ?alias ?desc WHERE {
    VALUES ?item { ${values(batch)} }
    { ?item skos:altLabel ?alias FILTER(LANG(?alias) IN ("en", "pt", "pt-br", "ja", "mul")) }
    UNION
    { ?item schema:description ?desc FILTER(LANG(?desc) IN ("en", "pt", "pt-br", "ja")) }
  }`);
      for (const row of textRows) {
        const entry = get(qidOf(row.item));
        if (row.alias) {
          const lang = LANG_OF[langOf(row.alias) ?? ""];
          if (lang) {
            entry.aliases[lang] = [
              ...(entry.aliases[lang] ?? []),
              row.alias.value,
            ];
          }
        }
        if (row.desc) {
          const tag = langOf(row.desc) ?? "";
          const lang = LANG_OF[tag];
          if (lang && (!entry.descriptions[lang] || tag === "pt-br"))
            entry.descriptions[lang] = row.desc.value;
        }
      }

      const fictional = batch.filter((qid) => kindOf.get(qid) === "fictional");
      if (fictional.length > 0) {
        const workRows =
          await sparql(`SELECT ?item ?p ?work ?wsl ${["en", "pt", "ptbr", "mul", "ja"].map((l) => `?work_${l}`).join(" ")} WHERE {
    VALUES ?item { ${values(fictional)} }
    VALUES ?p { ${WORK_PROPS.map((p) => `wdt:${p}`).join(" ")} }
    ?item ?p ?work .
    OPTIONAL { ?work wikibase:sitelinks ?wsl }
    ${labelOptionals("work")}
  }`);
        for (const row of workRows) {
          const prop =
            row.p?.value.replace("http://www.wikidata.org/prop/direct/", "") ??
            "";
          const work: Work = {
            prop,
            qid: qidOf(row.work),
            sitelinks: Number(row.wsl?.value ?? 0),
            labels: labelsFrom(row, "work"),
          };
          const entry = get(qidOf(row.item));
          if (prop === "P31") entry.classes.push(work.labels.en ?? work.qid);
          else if (
            !entry.works.some((w) => w.prop === prop && w.qid === work.qid)
          ) {
            entry.works.push(work);
          }
        }
      }

      const humans = batch.filter((qid) => kindOf.get(qid) === "human");
      if (humans.length > 0) {
        const occupationRows =
          await sparql(`SELECT ?item ?occ ${["en", "pt", "ptbr", "mul", "ja"].map((l) => `?occ_${l}`).join(" ")} WHERE {
    VALUES ?item { ${values(humans)} }
    ?item wdt:P106 ?occ .
    ${labelOptionals("occ")}
  }`);
        for (const row of occupationRows) {
          const entry = get(qidOf(row.item));
          const occupation = qidOf(row.occ);
          if (entry.occupations.includes(occupation)) continue;
          entry.occupations.push(occupation);
          const labels = labelsFrom(row, "occ");
          for (const lang of ["en", "pt", "ja"] as Lang[]) {
            const label = labels[lang];
            if (label) {
              entry.occupationLabels[lang] = [
                ...(entry.occupationLabels[lang] ?? []),
                label,
              ];
            }
          }
        }
      }
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      // Not stored, so the next run retries this batch.
      console.warn(`  ! details batch skipped: ${error.message.slice(0, 120)}`);
      for (const qid of batch) details.delete(qid);
      continue;
    }
    await store.add(batch.map((qid) => [qid, get(qid)]));
    done += batch.length;
    onProgress?.(done, missing.length);
  }
  return details;
}
