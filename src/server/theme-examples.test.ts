import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { THEME_SET_KEYS } from "@/game/theme-sets";
import {
  groupExamples,
  themeExamples,
  themeExamplesSource,
} from "./theme-examples";

const row = (en: string, theme_set: string) => ({
  en,
  pt: `${en} (pt)`,
  ja: `${en} (ja)`,
  theme_set,
});

/** A stand-in for the client: answers the examples query with `rows`, or fails while `fail` says so. */
function fakeDb(rows: ReturnType<typeof row>[], fail = () => false) {
  const calls: string[] = [];
  let reads = 0;
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
    order(column: string) {
      calls.push(`order ${column}`);
      return this;
    },
    // biome-ignore lint/suspicious/noThenProperty: the client's queries are awaited
    then(resolve: (r: unknown) => void) {
      reads++;
      resolve(
        fail()
          ? { data: null, error: new Error("offline") }
          : { data: rows, error: null },
      );
    },
  };
  const db = {
    from(table: string) {
      calls.push(`from ${table}`);
      return query;
    },
  } as unknown as SupabaseClient;
  return { db, calls, reads: () => reads };
}

describe("theme examples", () => {
  it("groups the marked themes by set, in order, three at most", () => {
    expect(
      groupExamples([
        row("Pirates", "warriors"),
        row("Ninjas", "warriors"),
        row("Robots", "scifi"),
        row("Knights", "warriors"),
        row("Samurai", "warriors"),
      ]),
    ).toEqual({
      warriors: [row("Pirates", ""), row("Ninjas", ""), row("Knights", "")].map(
        ({ theme_set: _, ...t }) => t,
      ),
      scifi: [{ en: "Robots", pt: "Robots (pt)", ja: "Robots (ja)" }],
    });
  });

  it("reads the active examples once an hour, and keeps the last on a failed read", async () => {
    let offline = false;
    const { db, calls, reads } = fakeDb(
      [row("Robots", "scifi")],
      () => offline,
    );
    let now = 0;
    const realNow = Date.now;
    Date.now = () => now;
    try {
      const examples = themeExamplesSource(() => db, 1000);
      const [a, b] = await Promise.all([examples(), examples()]);
      expect(a).toBe(b);
      expect(reads()).toBe(1);
      expect(calls).toEqual([
        "from whoami_themes",
        "select en, pt, ja, theme_set",
        "eq active true",
        "not example is null",
        "order theme_set",
        "order example",
      ]);
      now = 2000;
      offline = true;
      expect(await examples()).toBe(a);
      expect(reads()).toBe(2);
    } finally {
      Date.now = realNow;
    }
  });

  it("local mode shows three of its own themes for every set", async () => {
    const examples = await themeExamples();
    for (const set of THEME_SET_KEYS) expect(examples[set]).toHaveLength(3);
  });
});
