import "server-only";
import type { Lang } from "@/game/types";
import type {
  AdminReport,
  AdminUser,
  PeopleStore,
  Sanction,
} from "../people-types";
import type { NewReport } from "../types";
import { saveTestAccounts, testAccounts } from "./auth";
import { processSingleton } from "./disk";

/** Local mode: the test accounts are the accounts, the room reports the only reports; sanctions in memory. */
export function localPeople(): PeopleStore {
  const accounts = testAccounts();
  const reports = processSingleton("player-reports", () => [] as NewReport[]);
  const kept = processSingleton("sanctions", () => [] as Sanction[]);
  const user = (id: string): AdminUser | null => {
    const a = accounts.get(id);
    if (!a) return null;
    return {
      id,
      name: a.name,
      handle: a.handle ?? null,
      avatar: a.avatar,
      role: a.role ?? "admin",
      langs: ((a.about as { langs?: Lang[] } | undefined)?.langs ??
        []) as Lang[],
      providers: [
        { provider: a.provider, name: a.name, at: a.createdAt ?? null },
      ],
      plays: 0,
      xp: 0,
      wins: 0,
      perGame: {},
      firstAt: null,
      lastAt: null,
      seenAt: null,
      createdAt: a.createdAt ?? 0,
    };
  };
  return {
    async users() {
      return [...accounts.keys()].flatMap((id) => user(id) ?? []);
    },
    async user(id) {
      const u = user(id);
      const a = accounts.get(id);
      if (!u || !a) return null;
      return {
        ...u,
        quote: a.quote ?? null,
        accent: a.accent ?? null,
        about: a.about ?? null,
        privacy: a.privacy ?? null,
        theme: null,
        badges: [],
        contrib: {
          pics: 0,
          chars: 0,
          muralIn: 0,
          muralOut: 0,
          suggestions: 0,
          live: 0,
          votes: 0,
        },
      };
    },
    async people(ids) {
      return [...new Set(ids)].map((id) => {
        const a = accounts.get(id);
        if (a)
          return {
            id,
            account: true,
            name: a.name,
            handle: a.handle ?? null,
            guestNumber: a.guestNumber ?? null,
            avatar: a.avatar,
          };
        const seen = reports.find((r) => r.target.id === id)?.target;
        return {
          id,
          account: false,
          name: seen?.name ?? null,
          handle: null,
          guestNumber: seen?.guestNumber ?? null,
          avatar: seen?.avatar ?? null,
        };
      });
    },
    async reports() {
      return reports
        .map(
          (r, i): AdminReport => ({
            id: `room:${i + 1}`,
            kind: "room",
            targetId: r.target.id,
            reporterId: r.reporterId,
            at: r.lines.at(-1)?.at ?? 0,
            reason: r.reason,
            note: r.note,
            room: r.room,
            lines: r.lines.map((l) => ({ at: l.at, text: l.text ?? "" })),
          }),
        )
        .reverse();
    },
    async sanctions(person) {
      return kept
        .filter((s) => !person || s.person === person)
        .sort((a, b) => b.at - a.at);
    },
    async addSanction(s) {
      const id = kept.length + 1;
      const now = Date.now();
      kept.push({
        ...s,
        id,
        upTo: now,
        at: now,
        liftedAt: null,
        seenAt: null,
      });
      return id;
    },
    async liftSanction(id) {
      const s = kept.find((x) => x.id === id);
      if (s && !s.liftedAt) s.liftedAt = Date.now();
    },
    async seeSanction(id) {
      const s = kept.find((x) => x.id === id);
      if (s && !s.seenAt) s.seenAt = Date.now();
    },
    async wipe() {
      return 0;
    },
    async setRole(id, role) {
      const a = accounts.get(id);
      if (!a) return;
      a.role = role;
      saveTestAccounts();
    },
    async reassign(from, to) {
      for (const s of kept) if (s.person === from) s.person = to;
    },
  };
}
