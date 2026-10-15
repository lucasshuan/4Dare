import "server-only";
import type { GameKey } from "@/game/games";
import { levelOf } from "@/game/profile/xp";
import { LANGS, type Lang } from "@/game/types";
import { voteWeight } from "@/game/workshop-rules";
import { adminOnly } from "@/server/auth/roles";
import { getBackend } from "../backend";
import type { StoredSuggestion } from "../backend/community-types";
import type { PersonRef } from "../backend/people-types";
import type { Pieces, StarterCard, WorkshopDraft } from "../community-contract";
import type { Role } from "../contract";
import { cardsOf, piecesOf, priorities } from "../workshop";

/** A suggestion as the panel's list shows it. */
export interface AdminSuggestion {
  id: string;
  kind: StoredSuggestion["kind"];
  status: StoredSuggestion["status"];
  lang: Lang;
  title: string;
  games: GameKey[];
  author: string | null;
  yes: number;
  no: number;
  priority: number;
  /** Languages with every piece written (the original counts). */
  langs: Lang[];
  /** Every text, for the search. */
  texts: string;
  createdAt: number;
  decidedAt: number | null;
  reason: string | null;
}

export interface WorkshopPerson {
  id: string;
  role: Role | null;
  level: number;
  suggestions: number;
  live: number;
  refused: number;
  last: number;
  votes: number;
  weight: number;
}

export interface AdminWorkshop {
  suggestions: AdminSuggestion[];
  people: PersonRef[];
  authors: WorkshopPerson[];
  voters: WorkshopPerson[];
  votesWeek: number;
  /** Staff: who can review (curators and the admin). */
  staff: { id: string; role: Role }[];
}

const draftOf = (s: StoredSuggestion) =>
  ({ kind: s.kind, [s.kind]: s.payload }) as WorkshopDraft;

const gamesOf = (d: WorkshopDraft): GameKey[] =>
  d.kind === "theme"
    ? (d.theme.games as GameKey[])
    : d.kind === "question"
      ? ["impostor"]
      : ["lineup"];

function langsDone(s: StoredSuggestion, pieces: Pieces): Lang[] {
  const keys = Object.keys(pieces);
  return LANGS.filter(
    (l) =>
      l === s.lang ||
      keys.every((k) => (s.translations[l]?.[k] ?? "").trim().length > 0),
  );
}

/** The whole Workshop: every suggestion, who suggests, who votes. */
export async function adminWorkshop(): Promise<AdminWorkshop> {
  await adminOnly();
  const { workshop, people } = getBackend();
  const [all, votes, users] = await Promise.all([
    workshop.suggestions(),
    workshop.votes(),
    people.users(),
  ]);
  const score = await priorities(all);
  const byUser = new Map(users.map((u) => [u.id, u]));
  const live = new Map<string, number>();
  for (const s of all)
    if (s.status === "live" && s.createdBy)
      live.set(s.createdBy, (live.get(s.createdBy) ?? 0) + 1);
  const suggestions = all.map((s): AdminSuggestion => {
    const d = draftOf(s);
    const pieces = piecesOf(d);
    return {
      id: s.id,
      kind: s.kind,
      status: s.status,
      lang: s.lang,
      title: pieces.name ?? pieces.text ?? "",
      games: gamesOf(d),
      author: s.createdBy,
      yes: s.yes,
      no: s.no,
      priority: score.get(s.id) ?? 0,
      langs: langsDone(s, pieces),
      texts: [
        ...Object.values(pieces),
        ...Object.values(s.translations).flatMap((t) => Object.values(t ?? {})),
      ].join(" "),
      createdAt: s.createdAt,
      decidedAt: s.decidedAt,
      reason: s.reason,
    };
  });
  const person = (id: string): WorkshopPerson => {
    const u = byUser.get(id);
    const mine = all.filter((s) => s.createdBy === id);
    const level = levelOf(u?.xp ?? 0).level;
    const role = u?.role ?? null;
    return {
      id,
      role,
      level,
      suggestions: mine.length,
      live: live.get(id) ?? 0,
      refused: mine.filter((s) => s.status === "refused").length,
      last: Math.max(0, ...mine.map((s) => s.createdAt)),
      votes: votes.filter((v) => v.user === id).length,
      weight: voteWeight({
        level,
        live: live.get(id) ?? 0,
        staff: !!role && role !== "player",
      }),
    };
  };
  const authorIds = [
    ...new Set(all.flatMap((s) => (s.createdBy ? [s.createdBy] : []))),
  ];
  const voterIds = [...new Set(votes.map((v) => v.user))];
  const staffIds = users.filter((u) => u.role !== "player").map((u) => u.id);
  const refs = await people.people([...authorIds, ...voterIds, ...staffIds]);
  return {
    suggestions,
    people: refs,
    authors: authorIds
      .map(person)
      .sort((a, b) => b.live - a.live || b.suggestions - a.suggestions),
    voters: voterIds.map(person).sort((a, b) => b.weight - a.weight),
    votesWeek: votes.filter((v) => Date.now() - v.at < 7 * 864e5).length,
    staff: users
      .filter((u) => u.role !== "player")
      .map((u) => ({ id: u.id, role: u.role })),
  };
}

/** One suggestion, all the drawer shows of it. */
export interface SuggestionFile {
  suggestion: StoredSuggestion & { draft: WorkshopDraft };
  pieces: Pieces;
  starters: StarterCard[];
  priority: number;
  votes: {
    user: string;
    yes: boolean;
    weight: number;
    level: number;
    at: number;
  }[];
  people: PersonRef[];
  authorLive: number;
}

export async function suggestionFile(
  id: string,
): Promise<SuggestionFile | null> {
  await adminOnly();
  const { workshop, people } = getBackend();
  const s = await workshop.suggestion(id);
  if (!s) return null;
  const [all, votes] = await Promise.all([
    workshop.suggestions(),
    workshop.votes(),
  ]);
  const mine = votes.filter((v) => v.suggestion === id);
  const voters = new Map(
    (await people.voters(mine.map((v) => v.user))).map((v) => [v.id, v]),
  );
  const live = (u: string) =>
    all.filter((x) => x.createdBy === u && x.status === "live").length;
  const draft = draftOf(s);
  const score = await priorities([s]);
  return {
    suggestion: { ...s, draft },
    pieces: piecesOf(draft),
    starters:
      draft.kind === "theme" ? await cardsOf(draft.theme.starters, s.lang) : [],
    priority: score.get(id) ?? 0,
    votes: mine
      .map((v) => {
        const who = voters.get(v.user);
        const level = levelOf(who?.xp ?? 0).level;
        return {
          user: v.user,
          yes: v.vote,
          level,
          weight: voteWeight({
            level,
            live: live(v.user),
            staff: !!who && who.role !== "player",
          }),
          at: v.at,
        };
      })
      .sort((a, b) => b.weight - a.weight),
    people: await people.people([
      ...(s.createdBy ? [s.createdBy] : []),
      ...mine.map((v) => v.user),
    ]),
    authorLive: s.createdBy ? live(s.createdBy) : 0,
  };
}
