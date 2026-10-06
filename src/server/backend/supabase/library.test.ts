import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type LibraryRow,
  readLibrary,
  supabaseLibrary,
  toLibraryItem,
} from "./library";

const row = (n: number): LibraryRow => ({
  character_id: `wd-Q${n}`,
  name: `Hero ${n}`,
  origin: null,
  image_url: null,
  aliases: [],
  other_names: [],
});

/**
 * A stand-in for the client: serves `rows` (already in the database's order)
 * through .range(), at most `cap` per page like PostgREST's max rows, notes
 * every call, fails while `fail` says so.
 */
function fakeDb(rows: LibraryRow[], fail = () => false, cap = 1000) {
  const ranges: [number, number][] = [];
  const calls: string[] = [];
  const query = {
    select(columns: string) {
      calls.push(`select ${columns}`);
      return this;
    },
    eq(column: string, value: unknown) {
      calls.push(`eq ${column} ${value}`);
      return this;
    },
    not(column: string, op: string, value: unknown) {
      calls.push(`not ${column} ${op} ${value}`);
      return this;
    },
    order(
      column: string,
      { ascending, nullsFirst }: { ascending: boolean; nullsFirst?: boolean },
    ) {
      calls.push(
        `order ${column} ${ascending ? "asc" : "desc"}${nullsFirst === false ? " nulls last" : ""}`,
      );
      return this;
    },
    async range(from: number, to: number) {
      ranges.push([from, to]);
      if (fail()) return { data: null, error: new Error("offline") };
      return {
        data: rows.slice(from, Math.min(to + 1, from + cap)),
        error: null,
      };
    },
  };
  const db = {
    from(table: string) {
      calls.push(`from ${table}`);
      return query;
    },
  } as unknown as SupabaseClient;
  return { db, ranges, calls };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("library from Supabase", () => {
  it("reads the view's whole library, ranked first, id breaking ties", async () => {
    const { db, calls } = fakeDb([]);
    expect(await readLibrary(db, "pt")).toEqual([]);
    expect(calls).toEqual([
      "from character_entries",
      "select character_id, name, origin, image_url, aliases, other_names",
      "eq lang pt",
      "eq shadowed false",
      "not character_id like u-%",
      "order popularity desc nulls last",
      "order character_id asc",
    ]);
  });

  it("pages 1000 rows at a time until an empty page, keeping the order", async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => row(i + 1));
    const { db, ranges } = fakeDb(rows);
    const items = await readLibrary(db, "en");
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
      [2500, 3499],
    ]);
    expect(items.map((item) => item[0])).toEqual(
      rows.map((r) => `en-${r.character_id}`),
    );
  });

  it("asks once more when the last page is full, and stops at the empty one", async () => {
    const { db, ranges } = fakeDb(
      Array.from({ length: 2000 }, (_, i) => row(i)),
    );
    expect(await readLibrary(db, "en")).toHaveLength(2000);
    expect(ranges).toHaveLength(3);
  });

  it("still gets every row when the server hands out fewer per page", async () => {
    const rows = Array.from({ length: 700 }, (_, i) => row(i));
    const { db, ranges } = fakeDb(rows, () => false, 300);
    const items = await readLibrary(db, "en");
    expect(ranges.map(([from]) => from)).toEqual([0, 300, 600, 700]);
    expect(items.map((item) => item[0])).toEqual(
      rows.map((r) => `en-${r.character_id}`),
    );
  });

  it("turns a row into the same search item the browser gets", () => {
    expect(
      toLibraryItem("pt", {
        character_id: "wd-Q79037",
        name: "Homem-Aranha",
        origin: "Marvel",
        image_url: "https://example.com/spider.png",
        aliases: ["Peter Parker"],
        other_names: ["Spider-Man", "スパイダーマン"],
      }),
    ).toEqual([
      "pt-wd-Q79037",
      "Homem-Aranha",
      "Marvel",
      "https://example.com/spider.png",
      "homemaranha",
      " homem aranha peterparker spiderman すぱいだーまん",
      ["Peter Parker", "Spider-Man", "スパイダーマン"],
    ]);
    expect(
      toLibraryItem("ja", {
        ...row(7),
        aliases: null,
        other_names: null,
        name: "マリオ",
      }),
    ).toEqual(["ja-wd-Q7", "マリオ", null, null, "まりお", "", []]);
  });

  it("keeps each language an hour, and loads it once for requests that meet", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { db, ranges } = fakeDb([row(1), row(2)]);
    // a read is a page of rows then an empty one: count reads by their first page
    const reads = () => ranges.filter(([from]) => from === 0).length;
    const library = supabaseLibrary(() => db);
    const [a, b] = await Promise.all([library("en"), library("en")]);
    expect(a).toBe(b);
    expect(reads()).toBe(1);
    await library("pt");
    expect(reads()).toBe(2);
    vi.advanceTimersByTime(59 * 60_000);
    expect(await library("en")).toBe(a);
    expect(reads()).toBe(2);
    vi.advanceTimersByTime(2 * 60_000);
    expect(await library("en")).not.toBe(a);
    expect(reads()).toBe(3);
  });

  it("does not keep a failed read", async () => {
    let down = true;
    const { db, ranges } = fakeDb([row(1)], () => down);
    const library = supabaseLibrary(() => db);
    await expect(library("en")).rejects.toThrow("offline");
    down = false;
    expect(await library("en")).toHaveLength(1);
    expect(ranges).toEqual([
      [0, 999],
      [0, 999],
      [1, 1000],
    ]);
  });

  it("keeps the last index when a refresh fails, and tries again next time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    let down = false;
    const { db, ranges } = fakeDb([row(1)], () => down);
    const library = supabaseLibrary(() => db);
    const first = await library("en");
    vi.advanceTimersByTime(61 * 60_000);
    down = true;
    expect(await library("en")).toBe(first);
    down = false;
    const fresh = await library("en");
    expect(fresh).not.toBe(first);
    expect(fresh).toEqual(first);
    expect(ranges.filter(([from]) => from === 0)).toHaveLength(3);
  });
});
