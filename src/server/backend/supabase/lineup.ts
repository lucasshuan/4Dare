import "server-only";
import {
  type BankExtra,
  type BankMission,
  TONES,
  type Tone,
} from "@/game/lineup/bank";
import type { PoolCard } from "@/game/lineup/deal";
import type { Lang } from "@/game/types";
import type { LineupStore } from "../types";
import { serviceClient } from "./clients";
import type { Json } from "./database.types";

/** The banks change by hand, rarely; the deck with library updates: one read per server every ten minutes. */
const TTL_MS = 10 * 60_000;

/** A card needs this many sales before its average price is worth showing. */
const PRICIEST_MIN = 20;

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

export function supabaseLineup(): LineupStore {
  const db = () => serviceClient();
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
  const pools = new Map<Lang, () => Promise<PoolCard[]>>();
  const dearest = new Map<
    Lang,
    () => Promise<{ id: string; sold: number; avg: number }[]>
  >();
  return {
    missions,
    extras,
    pool(lang) {
      let read = pools.get(lang);
      if (!read) {
        read = cached(async () => {
          const { data, error } = await db().rpc("lineup_pool", {
            p_lang: lang,
          });
          if (error) throw error;
          return (data ?? []).map((r, i) => ({
            id: r.character_id,
            gostos: r.gostos ?? [],
            rank: i + 1,
          }));
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
