import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { supabaseLineup } from "./lineup";

type PoolRow = { character_id: string; gostos: string[]; popularity: number };

const row = (n: number): PoolRow => ({
  character_id: `wd-Q${n}`,
  gostos: ["anime"],
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
  const db = { rpc: () => query } as unknown as SupabaseClient;
  return { db, ranges, orders };
}

describe("what for?'s deck from Supabase", () => {
  it("reads the whole deck a page at a time, ranked, the id breaking ties", async () => {
    const rows = Array.from({ length: 2269 }, (_, i) => row(i + 1));
    const { db, ranges, orders } = fakeDb(rows);
    const pool = await supabaseLineup(() => db).pool("pt");
    expect(pool).toHaveLength(2269);
    expect(pool.at(-1)).toEqual({
      id: "wd-Q2269",
      gostos: ["anime"],
      rank: 2269,
    });
    expect(ranges.map(([from]) => from)).toEqual([0, 1000, 2000, 2269]);
    expect(orders.slice(0, 2)).toEqual(["popularity desc", "character_id asc"]);
  });

  it("still gets every card when the server hands out fewer per page", async () => {
    const rows = Array.from({ length: 700 }, (_, i) => row(i));
    const { db } = fakeDb(rows, 300);
    const pool = await supabaseLineup(() => db).pool("en");
    expect(pool.map((c) => c.rank)).toEqual(rows.map((_, i) => i + 1));
  });
});
