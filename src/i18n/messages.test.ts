import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { LANGS } from "@/game/types";
import { NAMESPACES } from "./request";

// request.ts builds next-intl's config; only its list of namespaces matters here.
vi.mock("next-intl", () => ({ hasLocale: () => true }));
vi.mock("next-intl/server", () => ({ getRequestConfig: (f: unknown) => f }));
vi.mock("next-intl/routing", () => ({ defineRouting: (c: unknown) => c }));

const DIR = fileURLToPath(new URL("../../messages/", import.meta.url));

type Tree = { [key: string]: string | Tree };

const load = (lang: string, ns: string): Tree =>
  JSON.parse(readFileSync(`${DIR}${lang}/${ns}.json`, "utf8"));

/** Every string in a namespace, by its dotted key. */
function leaves(tree: Tree, prefix = "", out = new Map<string, string>()) {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else leaves(value, path, out);
  }
  return out;
}

/** The end of the `{…}` that opens at `from`. */
function closing(text: string, from: number) {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return i;
  }
  return text.length;
}

/**
 * The ICU arguments a message uses (`{name}`, `{count, plural, …}`), inside
 * plural branches too. `silent` gets the ones that only choose a branch and
 * are never shown (no `#`): a language without plurals may leave those out.
 */
function args(
  text: string,
  out = new Set<string>(),
  silent = new Set<string>(),
) {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;
    const end = closing(text, i);
    const [name, type, ...rest] = text.slice(i + 1, end).split(",");
    out.add(name.trim());
    if (/^\s*(plural|selectordinal|select)\s*$/.test(type ?? "")) {
      const branches = rest.join(",");
      if (!branches.includes("#")) silent.add(name.trim());
      for (let j = 0; j < branches.length; j++) {
        if (branches[j] !== "{") continue;
        const stop = closing(branches, j);
        args(branches.slice(j + 1, stop), out, silent);
        j = stop;
      }
    }
    i = end;
  }
  return out;
}

describe("messages", () => {
  it("has a file per registered namespace in every language, and no stray file", () => {
    for (const lang of LANGS) {
      const files = readdirSync(`${DIR}${lang}`)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.slice(0, -".json".length))
        .sort();
      expect(files, lang).toEqual([...NAMESPACES].sort());
    }
  });

  it.each([...NAMESPACES])(
    "%s: same keys and arguments in every language",
    (ns) => {
      const [first, ...others] = LANGS;
      const base = leaves(load(first, ns));
      for (const lang of others) {
        const other = leaves(load(lang, ns));
        expect([...other.keys()].sort(), `${ns} ${lang} keys`).toEqual(
          [...base.keys()].sort(),
        );
        for (const [key, text] of base) {
          const silent = new Set<string>();
          const wanted = args(text, new Set(), silent);
          const got = args(other.get(key) ?? "");
          // never an argument the code doesn't pass; never one dropped that is shown
          expect(
            [...got].filter((a) => !wanted.has(a)),
            `${ns}.${key} (${lang}) extra`,
          ).toEqual([]);
          expect(
            [...wanted].filter((a) => !got.has(a) && !silent.has(a)),
            `${ns}.${key} (${lang}) missing`,
          ).toEqual([]);
        }
      }
    },
  );

  it("reads ICU arguments, plural branches included", () => {
    expect([
      ...args("{name} picked {count, plural, one {# by {who}} other {#}}"),
    ]).toEqual(["name", "count", "who"]);
  });
});
