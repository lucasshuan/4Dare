// Polite HTTP for the library builder: per-host pacing, retries with
// exponential backoff on 429/5xx/network errors, and an on-disk cache of raw
// responses so reruns only hit the network for what is missing.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Contact (email or URL) for the User-Agent. Wikimedia allows clients that
 * identify themselves with one 200 API requests per minute; without it the
 * limit is 10 per minute, so the builder paces itself much slower.
 */
const CONTACT = process.env.LIBRARY_CONTACT?.trim();

export const USER_AGENT = `DareCharacterLibrary/1.0 (${
  CONTACT ?? "starter character list builder for the 4Dare party game"
}) node`;

export const CACHE_DIR =
  process.env.LIBRARY_CACHE_DIR ?? path.join(tmpdir(), "dare-library-cache");

/**
 * Hosts are paced in groups: Wikimedia enforces one API budget per client
 * across all its wikis, so those hosts share a single queue.
 */
function groupOf(host: string): string {
  const wikimediaApi = [
    /\.wikipedia\.org$/,
    /^(commons|www|meta)\.wikimedia\.org$/,
    /^wikimedia\.org$/,
    /^www\.wikidata\.org$/,
  ];
  if (wikimediaApi.some((pattern) => pattern.test(host))) {
    return "wikimedia-api";
  }
  return host;
}

/** Minimum gap between two requests in the same group, in ms. */
const GROUP_GAP: Record<string, number> = {
  "wikimedia-api": CONTACT ? 400 : 6500,
  "query.wikidata.org": 1500,
  "graphql.anilist.co": 2200,
  "dumps.wikimedia.org": 1000,
};
const DEFAULT_GAP = 250;
/** How many requests may be in flight per group at once. */
const GROUP_CONCURRENCY: Record<string, number> = {
  "wikimedia-api": CONTACT ? 2 : 1,
  "query.wikidata.org": 1,
  "graphql.anilist.co": 1,
  "dumps.wikimedia.org": 1,
};
const DEFAULT_CONCURRENCY = 3;

interface GroupState {
  active: number;
  last: number;
  queue: (() => void)[];
}
const groups = new Map<string, GroupState>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquire(host: string) {
  const group = groupOf(host);
  let state = groups.get(group);
  if (!state) {
    state = { active: 0, last: 0, queue: [] };
    groups.set(group, state);
  }
  const current = state;
  const limit = GROUP_CONCURRENCY[group] ?? DEFAULT_CONCURRENCY;
  if (current.active >= limit) {
    await new Promise<void>((resolve) => current.queue.push(resolve));
  }
  current.active++;
  const gap = GROUP_GAP[group] ?? DEFAULT_GAP;
  const wait = current.last + gap - Date.now();
  current.last = Math.max(Date.now(), current.last + gap);
  if (wait > 0) await sleep(wait);
  return () => {
    current.active--;
    current.queue.shift()?.();
  };
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    url: string,
  ) {
    super(`HTTP ${status} for ${url.slice(0, 160)}: ${body.slice(0, 200)}`);
  }
}

export interface RequestOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  /** Attempts before giving up (default 6). */
  attempts?: number;
  /** Per-request timeout in ms (default 90s). */
  timeout?: number;
}

/** Fetch text with pacing and retries. Throws HttpError on a final failure. */
export async function request(
  url: string,
  options: RequestOptions = {},
): Promise<string> {
  const host = new URL(url).host;
  const attempts = options.attempts ?? 6;
  let delay = 2000;
  let throttled = 0;
  for (let attempt = 1; ; attempt++) {
    const release = await acquire(host);
    let status = 0;
    let body = "";
    let retryAfter = 0;
    try {
      const res = await fetch(url, {
        method: options.method ?? "GET",
        headers: { "User-Agent": USER_AGENT, ...options.headers },
        body: options.body,
        signal: AbortSignal.timeout(options.timeout ?? 90_000),
      });
      status = res.status;
      body = await res.text();
      retryAfter = Number(res.headers.get("retry-after")) || 0;
      if (res.ok) return body;
    } catch (error) {
      body = String(error);
    } finally {
      release();
    }
    // Rate limiting says nothing about the request itself: wait it out
    // (up to 8 times) without spending the attempts meant for real failures.
    if (status === 429 && throttled < 8) {
      throttled++;
      attempt--;
    }
    const retryable = status === 0 || status === 429 || status >= 500;
    if (!retryable || attempt >= attempts)
      throw new HttpError(status, body, url);
    const wait = Math.max(delay, retryAfter * 1000);
    console.warn(
      `  ! ${status || "network error"} from ${host}, retry ${attempt}/${attempts - 1} in ${Math.round(wait / 1000)}s`,
    );
    await sleep(wait);
    delay = Math.min(delay * 2, 120_000);
  }
}

function cachePath(namespace: string, key: string) {
  const hash = createHash("sha1").update(key).digest("hex");
  return path.join(CACHE_DIR, namespace, hash.slice(0, 2), `${hash}.json`);
}

/**
 * Cached JSON request: the raw response body is stored under
 * CACHE_DIR/<namespace>, keyed by `key` (defaults to url + body).
 */
export async function cachedJson<T>(
  namespace: string,
  url: string,
  options: RequestOptions & { key?: string } = {},
): Promise<T> {
  const file = cachePath(
    namespace,
    options.key ?? `${url}\n${options.body ?? ""}`,
  );
  if (existsSync(file)) {
    return JSON.parse(await readFile(file, "utf8")) as T;
  }
  const text = await request(url, options);
  let parsed: T;
  try {
    parsed = JSON.parse(text) as T;
  } catch {
    // e.g. a SPARQL result cut off when the server times out mid-stream.
    throw new HttpError(200, `invalid JSON: ${text.slice(-120)}`, url);
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
  return parsed;
}

/** Run `fn` over `items` with at most `limit` promises in flight. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

/**
 * Append-only key/value cache (one JSON line per key) for results fetched in
 * batches: only keys missing from the store hit the network, so a different
 * candidate set still reuses everything fetched before.
 */
export class KeyStore<T> {
  private readonly file: string;
  private readonly values = new Map<string, T>();
  private loaded = false;
  private writing: Promise<void> = Promise.resolve();

  constructor(name: string) {
    this.file = path.join(CACHE_DIR, `${name}.jsonl`);
  }

  async load(): Promise<this> {
    if (this.loaded) return this;
    this.loaded = true;
    if (!existsSync(this.file)) return this;
    const text = await readFile(this.file, "utf8");
    for (const line of text.split("\n")) {
      if (!line) continue;
      try {
        const [key, value] = JSON.parse(line) as [string, T];
        this.values.set(key, value);
      } catch {
        // A line cut short by an interrupted run; it is fetched again.
      }
    }
    return this;
  }

  has(key: string): boolean {
    return this.values.has(key);
  }

  get(key: string): T | undefined {
    return this.values.get(key);
  }

  /** Keep entries in memory and append them to disk (writes are serialised). */
  add(entries: [string, T][]): Promise<void> {
    for (const [key, value] of entries) this.values.set(key, value);
    const lines = entries.map((entry) => `${JSON.stringify(entry)}\n`).join("");
    this.writing = this.writing.then(async () => {
      await mkdir(path.dirname(this.file), { recursive: true });
      await appendFile(this.file, lines);
    });
    return this.writing;
  }
}
