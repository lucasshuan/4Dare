// Fills the room list with test rooms: lobbies (open, full, private) and
// matches going on, hosted and played by made-up guests.
// Run: pnpm test-rooms            makes a fresh set (and closes the old one)
//      pnpm test-rooms --keep     the same, then keeps them listed until Ctrl+C
//      pnpm test-rooms --hold     keeps the current ones listed until Ctrl+C
//      pnpm test-rooms --clear    closes every test room
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.
// Test players' ids start with "test-", which is how --clear finds their rooms.
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createRoom, reduce } from "../src/game/engine";
import { randomGuestNumber } from "../src/game/guest-names";
import type { ThemeSet } from "../src/game/theme-sets";
import {
  type Character,
  DEFAULT_SETTINGS,
  type GameEvent,
  type Identity,
  type Lang,
  type RoomSettings,
  type RoomState,
  type Theme,
} from "../src/game/types";
import { entryId } from "../src/server/backend/seed-format";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY first.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const rooms = () => db.from("rooms");

/** Lobbies leave the list after 15 minutes without a change, matches after 20: refresh well before. */
const KEEP_EVERY_MS = 4 * 60_000;
const PASTELS = [
  "#F3D3B8",
  "#BFE6C8",
  "#D9C7F4",
  "#F4C7D9",
  "#C8DDF6",
  "#F6E3A1",
];

const pick = <T>(items: readonly T[]) =>
  items[Math.floor(Math.random() * items.length)];

function guest(lang: Lang): Identity {
  return {
    id: `test-${randomUUID()}`,
    isGuest: true,
    name: null,
    guestNumber: randomGuestNumber(),
    avatar: {
      kind: "critter",
      seed: randomBytes(5).toString("hex"),
      color: pick(PASTELS),
    },
    lang,
  };
}

/** The themes a vote may draw, read from the database once per run. */
let themes: Theme[] = [];
/** Per language, well-known characters with a picture, for the matches' picks. */
const characters = new Map<Lang, Character[]>();

async function loadData(langs: Lang[]) {
  const listed = await db
    .from("whoami_themes")
    .select("en, pt, ja, theme_set")
    .eq("active", true);
  if (listed.error) throw listed.error;
  themes = listed.data.map(({ theme_set, ...t }) => ({
    ...t,
    set: theme_set as ThemeSet | null,
  }));
  for (const lang of new Set(langs)) {
    const { data, error } = await db
      .from("character_entries")
      .select("character_id, name, image_url")
      .eq("lang", lang)
      .not("image_url", "is", null)
      .not("character_id", "like", "u-%")
      .order("popularity", { ascending: false })
      .limit(300);
    if (error) throw error;
    characters.set(
      lang,
      data.map((c) => ({
        id: entryId(lang, c.character_id),
        lang,
        name: c.name,
        origin: null,
        imageUrl: c.image_url,
        aliases: [],
      })),
    );
  }
}

const character = (lang: Lang): Character => pick(characters.get(lang) ?? []);

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () =>
  Array.from({ length: 5 }, () => pick([...CODE_CHARS])).join("");

/** How far into a match a test room has gone. */
type Stage = "lobby" | "voting" | "picking" | "asking";

interface Plan {
  lang: Lang;
  players: number;
  stage: Stage;
  settings?: Partial<RoomSettings>;
  /** Players (besides the host) who pressed "I'm ready". */
  ready?: number;
}

const PLANS: Plan[] = [
  { lang: "pt", players: 1, stage: "lobby" },
  {
    lang: "pt",
    players: 2,
    stage: "lobby",
    ready: 1,
    settings: { name: "Noite de pizza" },
  },
  { lang: "pt", players: 3, stage: "lobby", ready: 1 },
  { lang: "en", players: 2, stage: "lobby", settings: { seats: 2 } },
  {
    lang: "pt",
    players: 2,
    stage: "lobby",
    settings: { visibility: "private", password: "1234", name: "Só a família" },
  },
  { lang: "ja", players: 1, stage: "lobby", settings: { seats: 3 } },
  {
    lang: "en",
    players: 3,
    stage: "lobby",
    ready: 2,
    settings: { name: "Friday crew", askSeconds: 120, answerSeconds: 120 },
  },
  { lang: "pt", players: 3, stage: "voting" },
  {
    lang: "pt",
    players: 4,
    stage: "picking",
    settings: { name: "Galera do trampo" },
  },
  { lang: "en", players: 2, stage: "asking" },
  { lang: "pt", players: 4, stage: "asking" },
];

function build(plan: Plan, now: number): RoomState {
  const ctx = { now, random: Math.random };
  const people = Array.from({ length: plan.players }, () => guest(plan.lang));
  const [host, ...others] = people;
  let s = createRoom(
    newCode(),
    host,
    { ...DEFAULT_SETTINGS, ...plan.settings },
    ctx,
  );
  const apply = (e: GameEvent) => {
    s = reduce(s, e, ctx);
  };
  for (const p of others)
    apply({ type: "JOIN", player: p, password: plan.settings?.password });
  for (const p of others.slice(0, plan.ready ?? 0))
    apply({ type: "SET_READY", playerId: p.id, ready: true });
  if (plan.stage === "lobby") return s;

  const options = Array.from({ length: 3 }, () => pick(themes));
  apply({ type: "START", playerId: host.id, themes: options });
  if (plan.stage === "voting") {
    apply({ type: "VOTE", playerId: host.id, option: 0 });
    return s;
  }
  for (const p of people)
    if (s.phase === "voting")
      apply({ type: "VOTE", playerId: p.id, option: 1 });
  if (plan.stage === "picking") {
    const [first] = Object.values(s.assignments);
    if (first)
      apply({
        type: "PICK",
        playerId: first.pickerId,
        character: character(plan.lang),
      });
    return s;
  }
  for (const a of Object.values(s.assignments))
    apply({
      type: "PICK",
      playerId: a.pickerId,
      character: character(plan.lang),
    });
  return s;
}

/** Every test room still listed or playable. */
async function testRooms() {
  const { data, error } = await rooms()
    .select("code, state, version")
    .neq("phase", "closed")
    .like("state->>hostId", "test-%");
  if (error) throw error;
  return (data ?? []) as { code: string; state: RoomState; version: number }[];
}

async function save(code: string, version: number, next: RoomState) {
  const { error } = await rooms()
    .update({
      state: next,
      version: version + 1,
      phase: next.phase,
      visibility: next.settings.visibility,
      updated_at: new Date().toISOString(),
    })
    .eq("code", code)
    .eq("version", version);
  if (error) throw error;
}

async function clear() {
  const old = await testRooms();
  for (const r of old)
    await save(r.code, r.version, {
      ...r.state,
      phase: "closed",
      deadline: null,
      stepStartsAt: null,
      updatedAt: Date.now(),
    });
  return old.length;
}

/** Marks every test room as just changed, so the list keeps showing it. */
async function keep() {
  for (const r of await testRooms())
    await save(r.code, r.version, { ...r.state, updatedAt: Date.now() });
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const holding = () => {
    console.log(
      "Keeping them listed; Ctrl+C to stop (pnpm test-rooms --clear closes them).",
    );
    void keep();
    setInterval(
      () => void keep().catch((e) => console.error(e)),
      KEEP_EVERY_MS,
    );
  };
  if (args.has("--hold")) return holding();
  const closed = await clear();
  if (closed) console.log(`Closed ${closed} old test room(s).`);
  if (args.has("--clear")) process.exit(0);

  await loadData(PLANS.map((p) => p.lang));
  const now = Date.now();
  for (const plan of PLANS) {
    const state = build(plan, now);
    const { error } = await rooms().insert({
      code: state.code,
      state,
      version: 1,
      phase: state.phase,
      visibility: state.settings.visibility,
    });
    if (error) throw error;
    const label = state.settings.name || "(named after the host)";
    console.log(
      `${state.code}  ${state.phase.padEnd(8)} ${state.players.length}/${state.settings.seats}  ${plan.lang}  ${label}`,
    );
  }

  if (args.has("--keep")) holding();
  else {
    console.log(
      "Lobbies stay listed 15 minutes, matches 20. Use --keep to hold them longer.",
    );
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
