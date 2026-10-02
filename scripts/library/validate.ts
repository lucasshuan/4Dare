/**
 * Validates data/characters/{en,pt,ja}.json.
 *
 *   pnpm exec tsx scripts/library/validate.ts [--sample 80] [--offline]
 *
 * Checks the SeedCharacter shape, ids unique across files, sort order,
 * duplicates (same normalised name + origin), counts, share with images and
 * file formatting, then GETs a random sample of image URLs per language and
 * reports the share that load. Exits with 1 when a hard check fails.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { mapLimit, USER_AGENT } from "./http";
import { normalizeName } from "./text";
import { LANGS, type Lang, type SeedCharacter } from "./types";

const DIR = path.join(__dirname, "..", "..", "data", "characters");
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

const KEYS = ["id", "name", "origin", "imageUrl", "aliases", "popularity"];

function shapeErrors(entry: unknown, lang: Lang): string[] {
  const errors: string[] = [];
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    return ["not an object"];
  }
  const record = entry as Record<string, unknown>;
  const keys = Object.keys(record);
  for (const key of keys)
    if (!KEYS.includes(key)) errors.push(`unexpected key "${key}"`);
  for (const key of KEYS) if (!(key in record)) errors.push(`missing "${key}"`);
  const { id, name, origin, imageUrl, aliases, popularity } = record;
  if (
    typeof id !== "string" ||
    !new RegExp(`^${lang}-(wd-Q\\d+|al-\\d+)$`).test(id)
  ) {
    errors.push(`bad id ${JSON.stringify(id)}`);
  }
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 60 ||
    name !== name.trim()
  ) {
    errors.push(`bad name ${JSON.stringify(name)}`);
  }
  if (origin !== null && (typeof origin !== "string" || !origin.trim())) {
    errors.push(`bad origin ${JSON.stringify(origin)}`);
  }
  if (
    imageUrl !== null &&
    (typeof imageUrl !== "string" || !/^https:\/\/\S+$/.test(imageUrl))
  ) {
    errors.push(`bad imageUrl ${JSON.stringify(imageUrl)}`);
  }
  if (
    !Array.isArray(aliases) ||
    aliases.some(
      (alias) =>
        typeof alias !== "string" || !alias.trim() || alias.length > 60,
    )
  ) {
    errors.push(`bad aliases ${JSON.stringify(aliases)}`);
  }
  if (
    typeof popularity !== "number" ||
    !Number.isInteger(popularity) ||
    popularity < 0
  ) {
    errors.push(`bad popularity ${JSON.stringify(popularity)}`);
  }
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

async function main() {
  let failed = false;
  const fail = (message: string) => {
    failed = true;
    console.log(`  FAIL ${message}`);
  };
  const ids = new Map<string, Lang>();
  const summary: string[] = [];

  for (const lang of LANGS) {
    const file = path.join(DIR, `${lang}.json`);
    const text = await readFile(file, "utf8");
    console.log(
      `\n${lang}.json (${(text.length / 1024 / 1024).toFixed(2)} MB)`,
    );
    if (!text.endsWith("\n") || text.endsWith("\n\n"))
      fail("file must end with exactly one newline");
    if (text.length > 3 && !text.startsWith("[\n  {"))
      fail("expected 2-space indentation");
    const data = JSON.parse(text) as unknown;
    if (!Array.isArray(data)) {
      fail("top level is not an array");
      continue;
    }
    const entries = data as SeedCharacter[];

    let shapeProblems = 0;
    entries.forEach((entry, index) => {
      if (typeof entry?.name !== "string") {
        shapeProblems++;
        return;
      }
      const errors = shapeErrors(entry, lang);
      if (errors.length > 0) {
        shapeProblems++;
        if (shapeProblems <= 5)
          console.log(`  entry ${index}: ${errors.join("; ")}`);
      }
    });
    if (shapeProblems > 0) fail(`${shapeProblems} entries with shape errors`);

    let duplicateIds = 0;
    for (const entry of entries) {
      if (ids.has(entry.id)) duplicateIds++;
      ids.set(entry.id, lang);
    }
    if (duplicateIds > 0) fail(`${duplicateIds} duplicate ids`);

    let unsorted = 0;
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].popularity > entries[i - 1].popularity) unsorted++;
    }
    if (unsorted > 0) fail(`${unsorted} entries out of popularity order`);

    const named = entries.filter((entry) => typeof entry?.name === "string");
    const wrongScript =
      lang === "ja"
        ? named.filter((entry) => !CJK.test(entry.name))
        : named.filter((entry) => CJK.test(entry.name));
    const wrongShare = wrongScript.length / Math.max(1, named.length);
    if (lang === "ja" && wrongShare > MAX_LATIN_JA)
      fail(`${(wrongShare * 100).toFixed(1)}% of ja names have no kana/kanji`);
    if (lang !== "ja" && wrongScript.length > 0)
      fail(
        `${wrongScript.length} ${lang} names in Japanese script, e.g. ${wrongScript
          .slice(0, 3)
          .map((entry) => entry.name)
          .join(", ")}`,
      );
    const selfAlias = named.filter((entry) =>
      entry.aliases?.some?.(
        (alias) => normalizeName(alias) === normalizeName(entry.name),
      ),
    ).length;
    if (selfAlias > 0)
      fail(`${selfAlias} entries list their own name as alias`);

    const keys = new Set<string>();
    let duplicates = 0;
    for (const entry of named) {
      const key = `${normalizeName(entry.name)}|${normalizeName(entry.origin ?? "")}`;
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
    const wikidata = entries.filter((entry) =>
      entry.id.includes("-wd-"),
    ).length;
    console.log(
      `  ${count} entries, ${(imageShare * 100).toFixed(1)}% with image, ${((withOrigin / count) * 100).toFixed(1)}% with origin, ${wikidata} Wikidata / ${count - wikidata} AniList`,
    );
    console.log(
      `  top: ${entries
        .slice(0, 12)
        .map((entry) => entry.name)
        .join(", ")}`,
    );

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
