import "server-only";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// Local mode keeps a little on disk (profiles, created characters, uploads) under .data/
export const DATA_DIR =
  process.env.DARE_DATA_DIR || join(process.cwd(), ".data");

export function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(DATA_DIR, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** Write to a temp file and rename, so a crash never leaves half a file behind. */
export function writeJson(file: string, value: unknown) {
  const path = join(DATA_DIR, file);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(value));
  renameSync(tmp, path);
}

/** One instance per dev server process, surviving hot reloads. */
export function processSingleton<T>(key: string, make: () => T): T {
  const g = globalThis as unknown as Record<string, T | undefined>;
  const id = `__dare_${key}`;
  if (!g[id]) g[id] = make();
  return g[id] as T;
}
