import type { GameKey } from "@/game/games";
import type { Avatar, Lang } from "@/game/types";
import type { Role } from "../contract";

/** What the panel did about a person (sanctions, 0058_moderation.sql). */
export type SanctionKind = "warn" | "mute" | "ban" | "none";

export interface Sanction {
  id: number;
  /** An account's id, or a guest's browser id. */
  person: string;
  kind: SanctionKind;
  /** Ms; null: for good (a ban), or not timed (a warning, an archive). */
  until: number | null;
  /** What the person reads (an archive's: the panel's own note). */
  reason: string | null;
  wipe: boolean;
  /** The reports made until then are settled by it. */
  upTo: number;
  author: string | null;
  at: number;
  liftedAt: number | null;
  /** A warning: when the person read it. */
  seenAt: number | null;
}

export type NewSanction = Pick<
  Sanction,
  "person" | "kind" | "until" | "reason" | "wipe" | "author"
>;

/** Someone a report or a list names: an account, or a guest by their number. */
export interface PersonRef {
  id: string;
  account: boolean;
  name: string | null;
  handle: string | null;
  guestNumber: number | null;
  avatar: Avatar | null;
}

export type ReportKind = "room" | "mural" | "pic" | "alias";

/** A report about a person, from any of the four tables. */
export interface AdminReport {
  /** "<kind>:<row>". */
  id: string;
  kind: ReportKind;
  /** Who it is about, and who made it. */
  targetId: string;
  reporterId: string;
  at: number;
  /** A room's report: the reason, the reporter's note, the room and what the person wrote there. */
  reason?: "spam" | "offensive" | "cheating" | "other";
  note?: string | null;
  room?: string;
  lines?: { at: number; text: string }[];
  /** A line, a picture or a nickname: what it is, where it is, how many reported it, whether it is hidden. */
  text?: string;
  where?: string;
  img?: string;
  count?: number;
  hidden?: boolean;
}

/** An account as the panel's list shows it. */
export interface AdminUser {
  id: string;
  name: string | null;
  handle: string | null;
  avatar: Avatar | null;
  role: Role;
  /** The languages they say they speak (profile's about). */
  langs: Lang[];
  providers: { provider: string; name: string | null; at: number | null }[];
  plays: number;
  xp: number;
  wins: number;
  perGame: Partial<Record<GameKey, number>>;
  firstAt: number | null;
  lastAt: number | null;
  /** Last sign-in (auth.users). */
  seenAt: number | null;
  createdAt: number;
}

/** An account, all the panel shows of it. */
export interface AdminUserDetail extends AdminUser {
  quote: string | null;
  accent: string | null;
  about: unknown;
  privacy: unknown;
  theme: string | null;
  badges: { badge: string; game: string | null; at: number }[];
  contrib: {
    pics: number;
    chars: number;
    muralIn: number;
    muralOut: number;
    suggestions: number;
    live: number;
    votes: number;
  };
}

/** The panel's people: accounts, reports and sanctions. */
export interface PeopleStore {
  users(): Promise<AdminUser[]>;
  user(id: string): Promise<AdminUserDetail | null>;
  /** Whoever `ids` are: accounts by their profile, guests by what reports and matches kept of them. */
  people(ids: string[]): Promise<PersonRef[]>;
  reports(): Promise<AdminReport[]>;
  /** Every sanction, newest first; only `person`'s when given. */
  sanctions(person?: string): Promise<Sanction[]>;
  addSanction(s: NewSanction): Promise<number>;
  liftSanction(id: number): Promise<void>;
  /** A warning was read. */
  seeSanction(id: number): Promise<void>;
  /** Hides what the person sent (mural lines, pictures, nicknames); how many. */
  wipe(person: string): Promise<number>;
  setRole(id: string, role: Role): Promise<void>;
  /** Voters' XP and role, for what their Workshop votes weigh. */
  voters(ids: string[]): Promise<{ id: string; xp: number; role: Role }[]>;
  /** A guest signed in: their sanctions become the account's. */
  reassign(from: string, to: string): Promise<void>;
}
