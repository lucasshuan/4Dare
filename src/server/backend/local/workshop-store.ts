import "server-only";
import { randomUUID } from "node:crypto";
import type {
  BankInsert,
  StoredSuggestion,
  WorkshopStore,
} from "../community-types";
import { processSingleton, readJson, writeJson } from "./disk";

interface Saved {
  suggestions: StoredSuggestion[];
  votes: { id: string; user: string; vote: boolean }[];
  bank: BankInsert[];
  curators: string[];
}

const FILE = "workshop.json";
const WEEKLY = 3;

const monday = () => {
  const now = new Date();
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - ((now.getUTCDay() + 6) % 7),
  );
};

/** The Workshop in local mode: suggestions, votes and what went live, in .data/. Every account curates. */
export function localWorkshopStore(): WorkshopStore {
  const data = processSingleton<Saved>("workshop", () =>
    readJson<Saved>(FILE, {
      suggestions: [],
      votes: [],
      bank: [],
      curators: [],
    }),
  );
  const save = () => writeJson(FILE, data);
  const sent = (author: string) =>
    data.suggestions.filter(
      (s) => s.createdBy === author && s.createdAt >= monday(),
    ).length;
  return {
    async suggestions() {
      return [...data.suggestions].sort((a, b) => b.createdAt - a.createdAt);
    },
    async suggestion(id) {
      return data.suggestions.find((s) => s.id === id) ?? null;
    },
    async create(kind, lang, payload, translations, author) {
      if (sent(author) >= WEEKLY) return null;
      const s: StoredSuggestion = {
        id: randomUUID(),
        kind,
        status: "voting",
        lang,
        payload,
        translations,
        createdBy: author,
        yes: 0,
        no: 0,
        reason: null,
        bankId: null,
        decidedBy: null,
        decidedAt: null,
        createdAt: Date.now(),
      };
      data.suggestions.push(s);
      save();
      return s.id;
    },
    async vote(id, user, vote) {
      const s = data.suggestions.find((x) => x.id === id);
      if (s?.status !== "voting") throw new Error("closed");
      data.votes = data.votes.filter((v) => !(v.id === id && v.user === user));
      if (vote !== null) data.votes.push({ id, user, vote });
      const mine = data.votes.filter((v) => v.id === id);
      s.yes = mine.filter((v) => v.vote).length;
      s.no = mine.filter((v) => !v.vote).length;
      save();
      return { yes: s.yes, no: s.no };
    },
    async votesOf(user) {
      return new Map(
        data.votes.filter((v) => v.user === user).map((v) => [v.id, v.vote]),
      );
    },
    async sentThisWeek(author) {
      return sent(author);
    },
    async decide(id, patch) {
      const s = data.suggestions.find((x) => x.id === id);
      if (!s) return;
      s.status = patch.status;
      s.reason = patch.reason;
      s.bankId = patch.bankId;
      s.translations = patch.translations;
      s.decidedBy = patch.by;
      s.decidedAt = Date.now();
      save();
    },
    async insertBank(row) {
      data.bank.push(row);
      save();
    },
    async bankIdTaken(kind, id) {
      return data.bank.some((r) => r.kind === kind && r.id === id);
    },
    async isCurator() {
      return true;
    },
  };
}
