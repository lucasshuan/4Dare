import "server-only";
import {
  type Audience,
  type BankQuestion,
  parseOptions,
} from "@/game/impostor/questions";
import { QUESTION_KINDS, type QuestionKind } from "@/game/impostor/types";
import type { ThemeSet } from "@/game/theme-sets";
import type { ImpostorStore } from "../types";
import { serviceClient } from "./clients";

/** The bank changes by hand, rarely: one read per server every ten minutes. */
const TTL_MS = 10 * 60_000;

export function supabaseImpostor(): ImpostorStore {
  const db = () => serviceClient();
  let cached: { at: number; list: Promise<BankQuestion[]> } | null = null;
  const read = async (): Promise<BankQuestion[]> => {
    const { data, error } = await db()
      .from("impostor_questions")
      .select(
        "id, kind, scope, theme_set, theme_id, audience, spice, en, es, ja, pt, options",
      )
      .eq("status", "live");
    if (error) throw error;
    return (data ?? []).flatMap((r): BankQuestion[] => {
      if (!(QUESTION_KINDS as readonly string[]).includes(r.kind)) return [];
      const kind = r.kind as QuestionKind;
      const options = parseOptions(kind, r.options);
      // a row whose options don't fit its kind is left out, never shown broken
      if (options === undefined) return [];
      return [
        {
          id: r.id,
          kind,
          scope: r.scope as BankQuestion["scope"],
          set: (r.theme_set as ThemeSet | null) ?? null,
          themeId: r.theme_id,
          audience: r.audience as Audience,
          spice: Math.min(3, Math.max(1, r.spice)) as 1 | 2 | 3,
          text: { en: r.en, es: r.es, ja: r.ja, pt: r.pt },
          options,
        },
      ];
    });
  };
  return {
    list() {
      if (!cached || Date.now() - cached.at > TTL_MS) {
        const list = read();
        cached = { at: Date.now(), list };
        // a failed read is tried again next time
        list.catch(() => {
          if (cached?.list === list) cached = null;
        });
      }
      return cached.list;
    },
    async count(rows) {
      if (!rows.length) return;
      const { error } = await db().rpc("impostor_count_questions", {
        p_rows: rows.map((r) => ({
          id: r.id,
          lang: r.lang,
          asked: r.asked,
          silent: r.silent,
          stood_out: r.stoodOut,
          caught: r.caught,
        })),
      });
      if (error) throw error;
    },
  };
}
