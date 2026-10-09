import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { DECK_PER_TASTE, DECK_TOP } from "@/game/lineup/deal";
import { supabaseLineup } from "./lineup";

type PoolRow = { character_id: string; tastes: string[]; popularity: number };

const row = (n: number): PoolRow => ({
  character_id: `wd-Q${n}`,
  tastes: ["anime"],
  popularity: 100_000 - n,
});

/**
 * A stand-in for the client's lineup_pool call: serves `rows` (already in
 * order) through .range(), at most `cap` a page like PostgREST's max rows.
 */
function fakeDb(rows: PoolRow[], cap = 1000) {
  const ranges: [number, number][] = [];
  const orders: string[] = [];
  const query = {
    order(column: string, { ascending }: { ascending: boolean }) {
      orders.push(`${column} ${ascending ? "asc" : "desc"}`);
      return this;
    },
    async range(from: number, to: number) {
      ranges.push([from, to]);
      return {
        data: rows.slice(from, Math.min(to + 1, from + cap)),
        error: null,
      };
    },
  };
  const args: unknown[] = [];
  const db = {
    rpc: (_name: string, a: unknown) => {
      args.push(a);
      return query;
    },
  } as unknown as SupabaseClient;
  return { db, ranges, orders, args };
}

describe("what for?'s deck from Supabase", () => {
  it("reads the whole deck a page at a time, ranked, the id breaking ties", async () => {
    const rows = Array.from({ length: 1228 }, (_, i) => row(i + 1));
    const { db, ranges, orders, args } = fakeDb(rows);
    const pool = await supabaseLineup(() => db).pool("pt");
    expect(args[0]).toEqual({
      p_lang: "pt",
      p_top: DECK_TOP,
      p_per_taste: DECK_PER_TASTE,
    });
    expect(pool).toHaveLength(1228);
    expect(pool.at(-1)).toEqual({
      id: "wd-Q1228",
      tastes: ["anime"],
      rank: 1228,
    });
    expect(ranges.map(([from]) => from)).toEqual([0, 1000, 1228]);
    expect(orders.slice(0, 2)).toEqual(["popularity desc", "character_id asc"]);
  });

  it("pages when the server hands out fewer at once, and stops at the end", async () => {
    const rows = Array.from({ length: 700 }, (_, i) => row(i));
    const { db, ranges } = fakeDb(rows, 300);
    const pool = await supabaseLineup(() => db).pool("en");
    expect(pool.map((c) => c.rank)).toEqual(rows.map((_, i) => i + 1));
    expect(ranges.map(([from]) => from)).toEqual([0, 300, 600, 700]);
  });
});
