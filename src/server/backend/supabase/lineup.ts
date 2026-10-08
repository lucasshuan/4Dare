import "server-only";
import {
  type BankExtra,
  type BankMission,
  TONES,
  type Tone,
} from "@/game/lineup/bank";
import { DECK_PER_GOSTO, DECK_TOP, type PoolCard } from "@/game/lineup/deal";
import type { Lang } from "@/game/types";
import type { LineupStore } from "../types";
import { type Db, serviceClient } from "./clients";
import type { Json } from "./database.types";

/** The banks change by hand, rarely; the deck with library updates: one read per server every ten minutes. */
const TTL_MS = 10 * 60_000;

/** A card needs this many sales before its average price is worth showing. */
const PRICIEST_MIN = 20;

/** Rows asked for per request; PostgREST hands out at most its "max rows" (1000) at once. */
const PAGE = 1000;

/** A read kept for TTL_MS; a failed one is tried again next time. */
function cached<T>(read: () => Promise<T>) {
  let kept: { at: number; value: Promise<T> } | null = null;
  return () => {
    if (!kept || Date.now() - kept.at > TTL_MS) {
      const value = read();
      kept = { at: Date.now(), value };
      value.catch(() => {
        if (kept?.value === value) kept = null;
      });
    }
    return kept.value;
  };
}

export function supabaseLineup(db: () => Db = serviceClient): LineupStore {
  const missions = cached(async (): Promise<BankMission[]> => {
    const { data, error } = await db()
      .from("lineup_missions")
      .select("id, tone, heavy, en, es, ja, pt")
      .eq("status", "live");
    if (error) throw error;
    return (data ?? []).flatMap((r) =>
      (TONES as readonly string[]).includes(r.tone)
        ? [
            {
              id: r.id,
              tone: r.tone as Tone,
              heavy: r.heavy,
              text: { en: r.en, es: r.es, ja: r.ja, pt: r.pt },
            },
          ]
        : [],
    );
  });
  const extras = cached(async (): Promise<BankExtra[]> => {
    const { data, error } = await db()
      .from("lineup_extras")
      .select("id, emoji, tint, en, es, ja, pt")
      .eq("status", "live");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      emoji: r.emoji,
      tint: r.tint,
      name: { en: r.en, es: r.es, ja: r.ja, pt: r.pt },
    }));
  });
  const blocked = cached(async () => {
    const { data, error } = await db()
      .from("lineup_blocked")
      .select("character_id");
    if (error) throw error;
    return new Set((data ?? []).map((r) => r.character_id));
  });
  const pools = new Map<Lang, () => Promise<PoolCard[]>>();
  const dearest = new Map<
    Lang,
    () => Promise<{ id: string; sold: number; avg: number }[]>
  >();
  return {
    missions,
    extras,
    blocked,
    pool(lang) {
      let read = pools.get(lang);
      if (!read) {
        // as deep as a room reaches (DECK_TOP, each gosto's DECK_PER_GOSTO:
        // deckOf, in SQL), a page at a time (the id breaking popularity ties) until an
        // empty page: PostgREST hands out a thousand rows at most
        read = cached(async () => {
          const cards: PoolCard[] = [];
          for (;;) {
            const from = cards.length;
            const { data, error } = await db()
              .rpc("lineup_pool", {
                p_lang: lang,
                p_top: DECK_TOP,
                p_per_gosto: DECK_PER_GOSTO,
              })
              .order("popularity", { ascending: false })
              .order("character_id", { ascending: true })
              .range(from, from + PAGE - 1);
            if (error) throw error;
            if (!data?.length) break;
            for (const r of data)
              cards.push({
                id: r.character_id,
                gostos: r.gostos ?? [],
                rank: cards.length + 1,
              });
          }
          return cards;
        });
        pools.set(lang, read);
      }
      return read();
    },
    priciest(lang) {
      let read = dearest.get(lang);
      if (!read) {
        read = cached(async () => {
          const { data, error } = await db().rpc("lineup_priciest", {
            p_lang: lang,
            p_min: PRICIEST_MIN,
            p_limit: 8,
          });
          if (error) throw error;
          return (data ?? []).map((r) => ({
            id: r.card_id,
            sold: r.sold,
            avg: Number(r.avg_price),
          }));
        });
        dearest.set(lang, read);
      }
      return read();
    },
    async count(missionRows, cardRows) {
      const [m, c] = await Promise.all([
        missionRows.length
          ? db().rpc("lineup_count_missions", {
              p_rows: missionRows as unknown as Json,
            })
          : null,
        cardRows.length
          ? db().rpc("lineup_count_cards", {
              p_rows: cardRows as unknown as Json,
            })
          : null,
      ]);
      if (m?.error) throw m.error;
      if (c?.error) throw c.error;
    },
  };
}
