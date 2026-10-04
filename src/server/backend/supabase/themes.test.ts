import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { readStarters, supabaseStarters } from "./themes";

interface Row {
  theme_id: string;
  character_id: string;
  position: number;
  characters: { kind: "fictional" | "human" | null } | null;
  themes: { theme_set: string | null; active: boolean } | null;
}

const row = (n: number, active = true): Row => ({
  theme_id: `theme-${String(Math.floor(n / 5)).padStart(4, "0")}`,
  character_id: `wd-Q${n}`,
  position: (n % 5) + 1,
  characters: { kind: n % 2 ? "human" : "fictional" },
  themes: { theme_set: "heroes", active },
});

/** Serves `rows` (in the database's order) through .range(), at most `cap` per page; notes the calls. */
function fakeDb(rows: Row[], cap = 1000, fail = () => false) {
  const calls: string[] = [];
  const query = {
    select(columns: string) {
      calls.push(`select ${columns}`);
      return this;
    },
    order(column: string, { ascending }: { ascending: boolean }) {
      calls.push(`order ${column} ${ascending ? "asc" : "desc"}`);
      return this;
    },
    async range(from: number, to: number) {
      calls.push(`range ${from} ${to}`);
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
  return { db, calls };
}

describe("theme starters from Supabase", () => {
  it("reads every page, by theme then position, with kinds and sets", async () => {
    const rows = Array.from({ length: 1700 }, (_, i) => row(i));
    const { db, calls } = fakeDb(rows, 600);
    const starters = await readStarters(db);
    expect(starters).toHaveLength(1700);
    expect(starters[1]).toEqual({
      themeId: "theme-0000",
      set: "heroes",
      characterId: "wd-Q1",
      position: 2,
      kind: "human",
    });
    expect(calls.slice(0, 4)).toEqual([
      "from whoami_theme_starters",
      "select theme_id, character_id, position, characters(kind), themes:whoami_themes(theme_set, active)",
      "order theme_id asc",
      "order position asc",
    ]);
    // a server capping pages at 600 still gives them all, then one empty page ends it
    expect(calls.filter((c) => c.startsWith("range"))).toEqual([
      "range 0 999",
      "range 600 1599",
      "range 1200 2199",
      "range 1700 2699",
    ]);
  });

  it("leaves out themes no longer drawn", async () => {
    const { db } = fakeDb([row(0), row(1, false), row(2)]);
    expect((await readStarters(db)).map((s) => s.characterId)).toEqual([
      "wd-Q0",
      "wd-Q2",
    ]);
  });

  it("keeps the list a while and keeps the last one when a read fails", async () => {
    let offline = false;
    const { db, calls } = fakeDb([row(0)], 1000, () => offline);
    const read = supabaseStarters(() => db, 1000);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await read()).toHaveLength(1);
    expect(await read()).toHaveLength(1);
    // one read (its first page) for both
    expect(calls.filter((c) => c === "range 0 999")).toHaveLength(1);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 2000);
    offline = true;
    expect(await read()).toHaveLength(1);
    vi.useRealTimers();
    // never read at all: nothing, rather than an error
    expect(await supabaseStarters(() => db)()).toEqual([]);
    warn.mockRestore();
  });
});
