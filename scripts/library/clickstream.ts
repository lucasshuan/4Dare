// Local popularity from the Wikipedia clickstream dumps: monthly counts of
// how readers reached each article (search engines, links, direct visits).
// Summing the incoming clicks gives a close proxy for monthly pageviews, from
// one bulk download per wiki and month instead of thousands of rate-limited
// API calls. The median of the last three months keeps news spikes in check.
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { CACHE_DIR, request, USER_AGENT } from "./http";
import type { Lang } from "./types";

const BASE = "https://dumps.wikimedia.org/other/clickstream/";
/** Articles below this many monthly clicks are not kept in the cache. */
const MIN_CLICKS = 30;
const MONTHS = 3;
/** A stalled download is abandoned after this long, then retried. */
const DOWNLOAD_TIMEOUT = 45 * 60_000;
const DOWNLOAD_ATTEMPTS = 3;

/** The months to use: env override, else the newest cached, else the newest online. */
async function pickMonths(lang: Lang): Promise<string[]> {
  const fromEnv = process.env.LIBRARY_CLICKSTREAM_MONTHS;
  if (fromEnv) return fromEnv.split(",").map((month) => month.trim());
  const prefix = `clickstream-${lang}-`;
  const cached = existsSync(CACHE_DIR)
    ? readdirSync(CACHE_DIR)
        .filter((name) => name.startsWith(prefix) && name.endsWith(".tsv"))
        .map((name) => name.slice(prefix.length, -".tsv".length))
        .filter((month) => /^\d{4}-\d{2}$/.test(month))
        .sort()
        .reverse()
    : [];
  if (cached.length >= MONTHS) return cached.slice(0, MONTHS);
  const index = await request(BASE);
  const months = [...index.matchAll(/href="(\d{4}-\d{2})\/"/g)]
    .map((match) => match[1])
    .sort()
    .reverse();
  const available: string[] = [];
  for (const month of months.slice(0, MONTHS + 2)) {
    const listing = await request(`${BASE}${month}/`);
    if (listing.includes(`clickstream-${lang}wiki-${month}.tsv.gz`)) {
      available.push(month);
      if (available.length === MONTHS) break;
    }
  }
  if (available.length === 0) {
    throw new Error(`no clickstream dump found for ${lang}wiki`);
  }
  return available;
}

/** Stream the gzip dump and sum incoming clicks per article title. */
async function aggregate(
  lang: Lang,
  month: string,
): Promise<Map<string, number>> {
  const url = `${BASE}${month}/clickstream-${lang}wiki-${month}.tsv.gz`;
  console.log(`  downloading ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} for ${url}`);
  const totals = new Map<string, number>();
  // Decoded as one stream, so a character split across two chunks stays whole.
  const stream = Readable.fromWeb(res.body as never)
    .pipe(createGunzip())
    .setEncoding("utf8");
  let rest = "";
  let lines = 0;
  for await (const chunk of stream) {
    const text = rest + (chunk as string);
    const parts = text.split("\n");
    rest = parts.pop() ?? "";
    for (const line of parts) {
      // prev \t curr \t type \t n
      const a = line.indexOf("\t");
      const b = line.indexOf("\t", a + 1);
      const c = line.lastIndexOf("\t");
      if (a < 0 || b < 0 || c <= b) continue;
      const title = line.slice(a + 1, b);
      const clicks = Number(line.slice(c + 1));
      if (!(clicks > 0)) continue;
      const previous = totals.get(title);
      if (previous !== undefined) {
        totals.set(title, previous + clicks);
      } else {
        // A slice keeps its whole parent chunk alive; store a flat copy.
        totals.set(Buffer.from(title, "utf8").toString("utf8"), clicks);
      }
    }
    lines += parts.length;
    if (lines % 10_000_000 < parts.length) {
      console.log(`  ${lang} ${month}: ${Math.round(lines / 1e6)}M rows`);
    }
  }
  return totals;
}

async function aggregateWithRetry(
  lang: Lang,
  month: string,
): Promise<Map<string, number>> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await aggregate(lang, month);
    } catch (error) {
      if (attempt >= DOWNLOAD_ATTEMPTS) throw error;
      console.warn(`  ! ${lang} ${month} download failed, retrying: ${error}`);
    }
  }
}

/**
 * Monthly clicks per title (with spaces) for one month. The whole month is
 * cached as a TSV, but only `wanted` titles are kept in memory: the English
 * dumps have millions of articles.
 */
async function monthTotals(
  lang: Lang,
  month: string,
  wanted: Set<string>,
): Promise<Map<string, number>> {
  const file = path.join(CACHE_DIR, `clickstream-${lang}-${month}.tsv`);
  if (!existsSync(file)) {
    const totals = await aggregateWithRetry(lang, month);
    const lines: string[] = [];
    for (const [title, clicks] of totals) {
      if (clicks >= MIN_CLICKS) lines.push(`${title}\t${clicks}`);
    }
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(`${file}.part`, `${lines.join("\n")}\n`);
    await rename(`${file}.part`, file);
  }
  const totals = new Map<string, number>();
  for (const line of (await readFile(file, "utf8")).split("\n")) {
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const title = line.slice(0, tab).replace(/_/g, " ");
    if (wanted.has(title)) totals.set(title, Number(line.slice(tab + 1)));
  }
  return totals;
}

/**
 * Average daily clicks per article in `wanted` (titles with spaces): the
 * median of the last three monthly clickstream dumps, divided by 30.
 */
export async function fetchClickstream(
  lang: Lang,
  wanted: Set<string>,
): Promise<Map<string, number>> {
  const months = await pickMonths(lang);
  const maps: Map<string, number>[] = [];
  for (const month of months) maps.push(await monthTotals(lang, month, wanted));
  const titles = new Set<string>();
  for (const map of maps) for (const title of map.keys()) titles.add(title);
  const daily = new Map<string, number>();
  for (const title of titles) {
    const values = maps.map((map) => map.get(title) ?? 0).sort((a, b) => a - b);
    const median = values[Math.floor(values.length / 2)];
    if (median > 0) daily.set(title, median / 30);
  }
  console.log(
    `  ${lang}: ${daily.size} articles with traffic (${months.join(", ")})`,
  );
  return daily;
}
