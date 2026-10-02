// Images from the Wikimedia Action API, only for the shortlisted entries:
// each article's lead image (50 titles per request) and Commons thumbnails
// for Wikidata P18 files (50 files per request). Results are cached per title
// or file, so reruns only ask for what is new.
import { chunk, HttpError, KeyStore, mapLimit, request } from "./http";
import { cleanImageUrl } from "./text";
import type { Lang } from "./types";

/** Standard thumbnail bucket; non-standard widths are rejected by Wikimedia. */
export const THUMB_WIDTH = 500;

export interface PageImage {
  image: string | null;
  disambiguation: boolean;
}

interface QueryResponse {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: {
      title: string;
      missing?: boolean;
      invalid?: boolean;
      thumbnail?: { source: string };
      pageprops?: Record<string, string>;
      imageinfo?: { url: string; thumburl?: string; mime?: string }[];
    }[];
  };
}

async function query(
  url: string,
  params: Record<string, string>,
): Promise<QueryResponse | null> {
  const body = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    ...params,
  }).toString();
  try {
    const text = await request(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    return JSON.parse(text) as QueryResponse;
  } catch (error) {
    if (!(error instanceof HttpError) && !(error instanceof SyntaxError)) {
      throw error;
    }
    // Not stored, so the next run retries this batch.
    console.warn(`  ! batch skipped: ${String(error).slice(0, 140)}`);
    return null;
  }
}

/** Follow normalisation and redirect hops to the final page title. */
function resolver(json: QueryResponse) {
  return (title: string) => {
    let current = title;
    for (const step of [json.query?.normalized, json.query?.redirects]) {
      const hop = step?.find((entry) => entry.from === current);
      if (hop) current = hop.to;
    }
    return current;
  };
}

/** Lead image (~500px) of each article, keyed by the requested title. */
export async function fetchPageImages(
  lang: Lang,
  titles: Iterable<string>,
): Promise<Map<string, PageImage>> {
  const store = await new KeyStore<PageImage | null>(`images-${lang}`).load();
  const wanted = [...new Set(titles)];
  const missing = wanted.filter((title) => !store.has(title)).sort();
  const batches = chunk(missing, 50);
  console.log(
    `  ${lang}.wikipedia images: ${wanted.length} titles, ${batches.length} requests`,
  );
  let done = 0;
  await mapLimit(batches, 2, async (batch) => {
    const json = await query(`https://${lang}.wikipedia.org/w/api.php`, {
      prop: "pageimages|pageprops",
      ppprop: "disambiguation",
      piprop: "thumbnail",
      pithumbsize: String(THUMB_WIDTH),
      pilicense: "any",
      pilimit: "50",
      redirects: "1",
      titles: batch.join("|"),
    });
    if (!json) return;
    const follow = resolver(json);
    const byTitle = new Map<string, PageImage>();
    for (const page of json.query?.pages ?? []) {
      if (page.missing || page.invalid) continue;
      byTitle.set(page.title, {
        image: page.thumbnail ? cleanImageUrl(page.thumbnail.source) : null,
        disambiguation: page.pageprops?.disambiguation !== undefined,
      });
    }
    await store.add(
      batch.map((title) => [title, byTitle.get(follow(title)) ?? null]),
    );
    done++;
    if (done % 20 === 0) {
      console.log(`  ${lang}.wikipedia images: ${done}/${batches.length}`);
    }
  });
  const result = new Map<string, PageImage>();
  for (const title of wanted) {
    const info = store.get(title);
    if (info) result.set(title, info);
  }
  return result;
}

/** Direct ~500px thumbnail URLs for Commons file names (from P18). */
export async function resolveCommonsFiles(
  files: Iterable<string>,
): Promise<Map<string, string>> {
  const store = await new KeyStore<string | null>("commons").load();
  const wanted = [...new Set(files)];
  const missing = wanted.filter((name) => !store.has(name)).sort();
  const batches = chunk(missing, 50);
  console.log(`  commons: ${wanted.length} files, ${batches.length} requests`);
  let done = 0;
  await mapLimit(batches, 2, async (batch) => {
    const json = await query("https://commons.wikimedia.org/w/api.php", {
      prop: "imageinfo",
      iiprop: "url|mime",
      iiurlwidth: String(THUMB_WIDTH),
      titles: batch.map((name) => `File:${name}`).join("|"),
    });
    if (!json) return;
    const follow = resolver(json);
    const byTitle = new Map<string, string>();
    for (const page of json.query?.pages ?? []) {
      const info = page.imageinfo?.[0];
      if (page.missing || !info) continue;
      if (info.mime && !/^image\//.test(info.mime)) continue;
      byTitle.set(page.title, cleanImageUrl(info.thumburl ?? info.url));
    }
    await store.add(
      batch.map((name) => [name, byTitle.get(follow(`File:${name}`)) ?? null]),
    );
    done++;
    if (done % 20 === 0) console.log(`  commons: ${done}/${batches.length}`);
  });
  const result = new Map<string, string>();
  for (const name of wanted) {
    const url = store.get(name);
    if (url) result.set(name, url);
  }
  return result;
}
