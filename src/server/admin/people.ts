import "server-only";
import { GameError } from "@/game/types";
import { adminOnly } from "@/server/auth/roles";
import type { Role } from "@/server/contract";
import { getBackend } from "../backend";
import type {
  AdminReport,
  AdminUser,
  AdminUserDetail,
  PersonRef,
  Sanction,
  SanctionKind,
} from "../backend/people-types";
import { forgetSanctions, standingOf } from "../sanctions";

/** A sanction in force (a ban or a mute), or the last decision. */
export interface Standing {
  /** The ban or the mute in force. */
  active: Sanction | null;
  /** The newest decision of any kind (an archive too). */
  last: Sanction | null;
}

const standing = (list: Sanction[]): Standing => {
  const s = standingOf(list);
  return { active: s.ban ?? s.mute, last: list[0] ?? null };
};

/** Reports after the last decision are open. */
const isOpen = (r: AdminReport, last: Sanction | null) =>
  !last || r.at > last.upTo;

const byPerson = <T extends { person: string }>(list: T[]) => {
  const m = new Map<string, T[]>();
  for (const x of list) m.set(x.person, [...(m.get(x.person) ?? []), x]);
  return m;
};

export interface UserRow extends AdminUser {
  standing: Standing;
  reportsIn: number;
  open: number;
}

/** Every account, with what was decided about it and its reports. */
export async function adminUsers(): Promise<UserRow[]> {
  await adminOnly();
  const { people } = getBackend();
  const [users, sanctions, reports] = await Promise.all([
    people.users(),
    people.sanctions(),
    people.reports(),
  ]);
  const sByPerson = byPerson(sanctions);
  return users.map((u) => {
    const st = standing(sByPerson.get(u.id) ?? []);
    const about = reports.filter((r) => r.targetId === u.id);
    return {
      ...u,
      standing: st,
      reportsIn: about.length,
      open: about.filter((r) => isOpen(r, st.last)).length,
    };
  });
}

export interface ReportGroup {
  person: PersonRef;
  reports: AdminReport[];
  open: number;
  last: number;
  standing: Standing;
}

/** Reports by the person they are about, the ones still open first. */
export async function adminReports(): Promise<ReportGroup[]> {
  await adminOnly();
  const { people } = getBackend();
  const [reports, sanctions] = await Promise.all([
    people.reports(),
    people.sanctions(),
  ]);
  const ids = [...new Set(reports.map((r) => r.targetId))];
  const refs = new Map((await people.people(ids)).map((p) => [p.id, p]));
  const sByPerson = byPerson(sanctions);
  return ids
    .map((id) => {
      const list = reports.filter((r) => r.targetId === id);
      const st = standing(sByPerson.get(id) ?? []);
      return {
        person: refs.get(id) ?? {
          id,
          account: false,
          name: null,
          handle: null,
          guestNumber: null,
          avatar: null,
        },
        reports: list,
        open: list.filter((r) => isOpen(r, st.last)).length,
        last: Math.max(...list.map((r) => r.at)),
        standing: st,
      };
    })
    .sort((a, b) => b.open - a.open || b.last - a.last);
}

/** Everything the person drawer shows. */
export interface PersonFile {
  person: PersonRef;
  user: AdminUserDetail | null;
  sanctions: Sanction[];
  standing: Standing;
  /** Reports about them, newest first, and whether each is still open. */
  reports: (AdminReport & { open: boolean })[];
  /** How many reports they made. */
  made: number;
  /** The people the reports name (who made them). */
  names: PersonRef[];
}

export async function personFile(id: string): Promise<PersonFile> {
  await adminOnly();
  if (typeof id !== "string" || !id || id.length > 80)
    throw new GameError("invalid_input");
  const { people } = getBackend();
  const [user, sanctions, reports] = await Promise.all([
    people.user(id),
    people.sanctions(id),
    people.reports(),
  ]);
  const about = reports.filter((r) => r.targetId === id);
  const st = standing(sanctions);
  const names = await people.people([id, ...about.map((r) => r.reporterId)]);
  const person = names.find((p) => p.id === id) as PersonRef;
  return {
    person,
    user,
    sanctions,
    standing: st,
    reports: about.map((r) => ({ ...r, open: isOpen(r, st.last) })),
    made: reports.filter((r) => r.reporterId === id).length,
    names,
  };
}

export const BAN_FOR = {
  "1d": 864e5,
  "7d": 7 * 864e5,
  "30d": 30 * 864e5,
  ever: null,
} as const;
export const MUTE_FOR = { "1h": 36e5, "1d": 864e5, "7d": 7 * 864e5 } as const;

export interface SanctionInput {
  person: string;
  kind: SanctionKind;
  /** A ban's or a mute's length (BAN_FOR, MUTE_FOR). */
  length?: string;
  reason: string;
  wipe?: boolean;
}

/** Warns, mutes, bans (and maybe takes down what they sent) or archives the person's reports. */
export async function sanction(input: SanctionInput): Promise<number> {
  const me = await adminOnly();
  const { people, admin } = getBackend();
  const reason = String(input.reason ?? "")
    .trim()
    .slice(0, 300);
  if (!input.person || input.person === me.id)
    throw new GameError("invalid_input");
  if (!["warn", "mute", "ban", "none"].includes(input.kind))
    throw new GameError("invalid_input");
  if (input.kind !== "none" && !reason) throw new GameError("invalid_input");
  let until: number | null = null;
  if (input.kind === "ban" || input.kind === "mute") {
    const table: Record<string, number | null> =
      input.kind === "ban" ? BAN_FOR : MUTE_FOR;
    if (!input.length || !(input.length in table))
      throw new GameError("invalid_input");
    const span = table[input.length];
    until = span === null ? null : Date.now() + span;
  }
  const wipe = input.kind === "ban" && input.wipe === true;
  const id = await people.addSanction({
    person: input.person,
    kind: input.kind,
    until,
    reason: reason || null,
    wipe,
    author: me.id,
  });
  const wiped = wipe ? await people.wipe(input.person) : 0;
  forgetSanctions(input.person);
  await admin
    .audit({
      actor: me.id,
      action: `sanction.${input.kind}`,
      target: input.person,
      after: { id, until, reason, wipe, wiped },
    })
    .catch(() => {});
  return id;
}

/** Lifts a ban or a mute. */
export async function lift(id: number, person: string): Promise<void> {
  const me = await adminOnly();
  if (!Number.isSafeInteger(id)) throw new GameError("invalid_input");
  const { people, admin } = getBackend();
  await people.liftSanction(id);
  forgetSanctions(person);
  await admin
    .audit({
      actor: me.id,
      action: "sanction.lift",
      target: person,
      after: { id },
    })
    .catch(() => {});
}

/** Player or curator; the admin stays the only admin. */
export async function setRole(id: string, role: Role): Promise<void> {
  const me = await adminOnly();
  if (role !== "player" && role !== "curator")
    throw new GameError("invalid_input");
  if (id === me.id) throw new GameError("invalid_input");
  const { people, admin } = getBackend();
  const before = (await people.user(id))?.role;
  if (!before) throw new GameError("not_found");
  if (before === "admin") throw new GameError("unauthorized");
  await people.setRole(id, role);
  await admin
    .audit({ actor: me.id, action: "role", target: id, before, after: role })
    .catch(() => {});
}
