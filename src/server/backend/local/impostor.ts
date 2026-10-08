import "server-only";
import type { BankQuestion } from "@/game/impostor/questions";
import type { ImpostorStore, QuestionCount } from "../types";
import { readJson, writeJson } from "./disk";
import { LOCAL_QUESTIONS } from "./impostor-questions";

const STATS_FILE = "impostor-question-stats.json";

type Stats = Record<string, Omit<QuestionCount, "id" | "lang">>;

/** The whole first lot of the bank, as the table had it; counts kept on disk. */
export function localImpostor(): ImpostorStore {
  return {
    async list(): Promise<BankQuestion[]> {
      return LOCAL_QUESTIONS;
    },
    async count(rows) {
      const stats = readJson<Stats>(STATS_FILE, {});
      for (const r of rows) {
        const key = `${r.id}:${r.lang}`;
        const s = stats[key] ?? { asked: 0, silent: 0, stoodOut: 0, caught: 0 };
        stats[key] = {
          asked: s.asked + r.asked,
          silent: s.silent + r.silent,
          stoodOut: s.stoodOut + r.stoodOut,
          caught: s.caught + r.caught,
        };
      }
      writeJson(STATS_FILE, stats);
    },
  };
}
