/**
 * Validates data/characters.json and data/origins.json.
 *
 *   pnpm exec tsx scripts/library/validate.ts [--sample 80] [--offline]
 *
 * Checks the SeedCharacter and SeedOrigin shapes, unique ids, sort order,
 * that every origin is used and defined, and per language: duplicates (same
 * normalised name + origin), counts, share with images and file formatting.
 * Then GETs a random sample of image URLs per language and reports the share
 * that load. Exits with 1 when a hard check fails.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CATEGORIES } from "../../src/game/categories";
import { mapLimit, USER_AGENT } from "./http";
import { normalizeName } from "./text";
import { LANGS, type SeedCharacter, type SeedOrigin } from "./types";

const DIR = path.join(__dirname, "..", "..", "data");
const MIN_COUNT = 3000;
const MAX_COUNT = 8500;
const MIN_IMAGE_SHARE = 0.8;
// 80 samples so a couple of dead links don't fail the run.
const MIN_URL_SHARE = 0.9;
/** Japanese names should have kana or kanji; en/pt names shouldn't. */
const CJK = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
/** At most this share of ja names may be in Latin script (e.g. "BTS", "Lady Gaga"). */
const MAX_LATIN_JA = 0.15;

const args = process.argv.slice(2);
const sampleIndex = args.indexOf("--sample");
const SAMPLE =
  sampleIndex >= 0 && Number.isFinite(Number(args[sampleIndex + 1]))
    ? Number(args[sampleIndex + 1])
    : 80;
const OFFLINE = args.includes("--offline");

const KEYS = [
  "id",
  "kind",
  "category",
  "origin",
  "imageUrl",
  "names",
  "aliases",
  "popularity",
];
const ORIGIN_ID =
  /^(wd:Q\d+|al:\d+|job:[a-z0-9-]+(:f)?|group:[a-z0-9-]+|topic:[a-z0-9-]+)$/;

const isName = (value: unknown): value is string =>
  typeof value === "string" &&
  !!value.trim() &&
  value.length <= 60 &&
  value === value.trim();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Keys of a per-language map that aren't languages. */
const strayLangs = (value: Record<string, unknown>) =>
  Object.keys(value).filter(
    (key) => !(LANGS as readonly string[]).includes(key),
  );

function shapeErrors(entry: unknown, origins: Set<string>): string[] {
  if (!isRecord(entry)) return ["not an object"];
  const errors: string[] = [];
  for (const key of Object.keys(entry))
    if (!KEYS.includes(key)) errors.push(`unexpected key "${key}"`);
  for (const key of KEYS) if (!(key in entry)) errors.push(`missing "${key}"`);
  const { id, kind, category, origin, imageUrl, names, aliases, popularity } =
    entry;
  if (typeof id !== "string" || !/^(wd-Q\d+|al-\d+)$/.test(id))
    errors.push(`bad id ${JSON.stringify(id)}`);
  if (kind !== "fictional" && kind !== "human")
    errors.push(`bad kind ${JSON.stringify(kind)}`);
  if (!(CATEGORIES as readonly unknown[]).includes(category))
    errors.push(`bad category ${JSON.stringify(category)}`);
  if (origin !== null && (typeof origin !== "string" || !origins.has(origin)))
    errors.push(`unknown origin ${JSON.stringify(origin)}`);
  if (
    imageUrl !== null &&
    (typeof imageUrl !== "string" || !/^https:\/\/\S+$/.test(imageUrl))
  )
    errors.push(`bad imageUrl ${JSON.stringify(imageUrl)}`);
  if (
    !isRecord(names) ||
    strayLangs(names).length > 0 ||
    !Object.values(names).every(isName)
  )
    errors.push(`bad names ${JSON.stringify(names)}`);
  if (
    !isRecord(aliases) ||
    strayLangs(aliases).length > 0 ||
    !Object.values(aliases).every(
      (list) => Array.isArray(list) && list.length > 0 && list.every(isName),
    )
  )
    errors.push(`bad aliases ${JSON.stringify(aliases)}`);
  if (
    !isRecord(popularity) ||
    strayLangs(popularity).length > 0 ||
    Object.keys(popularity).length === 0 ||
    !Object.values(popularity).every(
      (value) => Number.isInteger(value) && (value as number) >= 0,
    )
  )
    errors.push(`bad popularity ${JSON.stringify(popularity)}`);
  else if (isRecord(names)) {
    for (const lang of Object.keys(popularity))
      if (!(lang in names)) errors.push(`listed in ${lang} without a name`);
  }
  return errors;
}

function originErrors(origin: unknown): string[] {
  if (!isRecord(origin)) return ["not an object"];
  const errors: string[] = [];
  if (typeof origin.id !== "string" || !ORIGIN_ID.test(origin.id))
    errors.push(`bad id ${JSON.stringify(origin.id)}`);
  const { labels } = origin;
  if (
    !isRecord(labels) ||
    strayLangs(labels).length > 0 ||
    Object.keys(labels).length === 0 ||
    !Object.values(labels).every(isName)
  )
    errors.push(`bad labels ${JSON.stringify(labels)}`);
  return errors;
}

function sample<T>(items: T[], count: number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

async function imageWorks(
  url: string,
): Promise<{ ok: boolean; status: string }> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      const type = res.headers.get("content-type") ?? "";
      await res.body?.cancel();
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      return {
        ok: res.ok && type.startsWith("image/"),
        status: `${res.status} ${type}`,
      };
    } catch (error) {
      if (attempt === 3)
        return { ok: false, status: String(error).slice(0, 80) };
    }
  }
  return { ok: false, status: "unreachable" };
}

async function readList(
  name: string,
  fail: (message: string) => void,
): Promise<unknown[]> {
  const text = await readFile(path.join(DIR, name), "utf8");
  console.log(`\n${name} (${(text.length / 1024 / 1024).toFixed(2)} MB)`);
  if (!text.endsWith("\n") || text.endsWith("\n\n"))
    fail("file must end with exactly one newline");
  if (text.length > 3 && !text.startsWith("[\n  {"))
    fail("expected 2-space indentation");
  const data = JSON.parse(text) as unknown;
  if (Array.isArray(data)) return data;
  fail("top level is not an array");
  return [];
}

async function main() {
  let failed = false;
  const fail = (message: string) => {
    failed = true;
    console.log(`  FAIL ${message}`);
  };
  const summary: string[] = [];

  const originList = (await readList("origins.json", fail)) as SeedOrigin[];
  let badOrigins = 0;
  originList.forEach((origin, index) => {
    const errors = originErrors(origin);
    if (errors.length === 0) return;
    badOrigins++;
    if (badOrigins <= 5) console.log(`  origin ${index}: ${errors.join("; ")}`);
  });
  if (badOrigins > 0) fail(`${badOrigins} origins with shape errors`);
  const origins = new Map(originList.map((origin) => [origin.id, origin]));
  if (origins.size !== originList.length)
    fail(`${originList.length - origins.size} duplicate origin ids`);
  const sortedOrigins = originList.every(
    (origin, i) => i === 0 || originList[i - 1].id.localeCompare(origin.id) < 0,
  );
  if (!sortedOrigins) fail("origins are not sorted by id");
  console.log(`  ${originList.length} origins`);

  const data = await readList("characters.json", fail);
  let shapeProblems = 0;
  data.forEach((entry, index) => {
    const errors = shapeErrors(entry, new Set(origins.keys()));
    if (errors.length === 0) return;
    shapeProblems++;
    if (shapeProblems <= 5)
      console.log(`  entry ${index}: ${errors.join("; ")}`);
  });
  if (shapeProblems > 0) fail(`${shapeProblems} entries with shape errors`);
  const all = (data as SeedCharacter[]).filter(
    (entry) => isRecord(entry?.popularity) && isRecord(entry?.names),
  );
  const ids = new Set(all.map((entry) => entry.id));
  if (ids.size !== all.length) fail(`${all.length - ids.size} duplicate ids`);
  const best = (entry: SeedCharacter) =>
    Math.max(...Object.values(entry.popularity).map(Number));
  let unsorted = 0;
  for (let i = 1; i < all.length; i++) {
    if (best(all[i]) > best(all[i - 1])) unsorted++;
  }
  if (unsorted > 0) fail(`${unsorted} entries out of popularity order`);
  const used = new Set(all.map((entry) => entry.origin));
  const unused = originList.filter((origin) => !used.has(origin.id)).length;
  if (unused > 0) fail(`${unused} origins no character uses`);
  const categories = new Map<string, number>();
  for (const entry of all)
    categories.set(entry.category, (categories.get(entry.category) ?? 0) + 1);
  console.log(
    `  ${all.length} characters; ${[...categories]
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => `${count} ${category}`)
      .join(", ")}`,
  );

  for (const lang of LANGS) {
    console.log(`\n${lang}`);
    const entries = all
      .filter((entry) => entry.popularity[lang] !== undefined)
      .sort(
        (a, b) =>
          (b.popularity[lang] as number) - (a.popularity[lang] as number),
      );
    const nameOf = (entry: SeedCharacter) => entry.names[lang] as string;

    const wrongScript =
      lang === "ja"
        ? entries.filter((entry) => !CJK.test(nameOf(entry)))
        : entries.filter((entry) => CJK.test(nameOf(entry)));
    const wrongShare = wrongScript.length / Math.max(1, entries.length);
    if (lang === "ja" && wrongShare > MAX_LATIN_JA)
      fail(`${(wrongShare * 100).toFixed(1)}% of ja names have no kana/kanji`);
    if (lang !== "ja" && wrongScript.length > 0)
      fail(
        `${wrongScript.length} ${lang} names in Japanese script, e.g. ${wrongScript
          .slice(0, 3)
          .map(nameOf)
          .join(", ")}`,
      );
    const selfAlias = entries.filter((entry) =>
      entry.aliases[lang]?.some(
        (alias) => normalizeName(alias) === normalizeName(nameOf(entry)),
      ),
    ).length;
    if (selfAlias > 0)
      fail(`${selfAlias} entries list their own name as alias`);

    const keys = new Set<string>();
    let duplicates = 0;
    for (const entry of entries) {
      const key = `${normalizeName(nameOf(entry))}|${entry.origin ?? ""}`;
      if (keys.has(key)) duplicates++;
      keys.add(key);
    }
    if (duplicates > 0)
      fail(`${duplicates} duplicates by normalised name + origin`);

    const count = entries.length;
    if (count < MIN_COUNT) fail(`only ${count} entries (need ${MIN_COUNT})`);
    if (count > MAX_COUNT)
      console.log(`  warn: ${count} entries (more than ${MAX_COUNT})`);
    const withImage = entries.filter((entry) => entry.imageUrl).length;
    const imageShare = count ? withImage / count : 0;
    if (imageShare < MIN_IMAGE_SHARE)
      fail(`only ${(imageShare * 100).toFixed(1)}% with image`);
    const withOrigin = entries.filter((entry) => entry.origin).length;
    const translated = entries.filter(
      (entry) => entry.origin && origins.get(entry.origin)?.labels[lang],
    ).length;
    const wikidata = entries.filter((entry) =>
      entry.id.startsWith("wd-"),
    ).length;
    console.log(
      `  ${count} entries, ${(imageShare * 100).toFixed(1)}% with image, ${((withOrigin / count) * 100).toFixed(1)}% with origin (${((translated / Math.max(1, withOrigin)) * 100).toFixed(1)}% of those in ${lang}), ${wikidata} Wikidata / ${count - wikidata} AniList`,
    );
    console.log(`  top: ${entries.slice(0, 12).map(nameOf).join(", ")}`);

    let urlLine = "skipped (--offline)";
    if (!OFFLINE && SAMPLE > 0) {
      const picks = sample(
        entries.filter((entry) => entry.imageUrl),
        SAMPLE,
      );
      const results = await mapLimit(picks, 4, async (entry) => ({
        entry,
        ...(await imageWorks(entry.imageUrl as string)),
      }));
      const working = results.filter((result) => result.ok).length;
      for (const result of results.filter((r) => !r.ok)) {
        console.log(
          `  broken: ${result.entry.id} ${result.entry.imageUrl} -> ${result.status}`,
        );
      }
      const share = working / Math.max(1, results.length);
      urlLine = `${working}/${results.length} image URLs load (${(share * 100).toFixed(0)}%)`;
      console.log(`  ${urlLine}`);
      if (share < MIN_URL_SHARE)
        fail(`image URL success below ${MIN_URL_SHARE * 100}%`);
    }
    summary.push(
      `${lang}: ${count} entries, ${(imageShare * 100).toFixed(1)}% with image, ${urlLine}`,
    );
  }

  console.log(`\n${summary.join("\n")}`);
  console.log(failed ? "\nFAILED" : "\nOK");
  if (failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
