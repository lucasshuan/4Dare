# Phase 10 — server and data layer: map, plus chat / pick drafts / suggestions plumbing

Read-only study of `C:/Desenvolvimento/Guessing Game` (2026-10-03). Paths are repo-relative. Nothing in the repo was edited. I read the hosted Supabase project `zooqjsrhjupqghuuipon` with read-only MCP calls (list_tables, list_migrations, one SELECT).

---

## 0. TL;DR

1. **Room = one JSON document plus a `version`.** Every write goes through `dispatch()` (`src/server/rooms.ts:67`): read, then `reduce()`, then compare-and-swap, with up to 5 retries. After a write the server sends a *ping* (`{version}`), never the data. Browsers then refetch `GET /api/rooms/[code]`, the only read path, which also fires due timeouts. In local mode nothing is pushed: the room is polled every 1 s. On Supabase the poll runs every 10 s as a safety net.
2. **Mutations are Server Actions (`src/server/actions.ts`), and Next 16 runs them one at a time per client** (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md` §"Sequential dispatch"). Chat sends and draft autosaves must **not** be Server Actions, or they queue in front of Confirm, Random and votes. Use POST/PUT route handlers. `/api/rooms/[code]/gone` already sets that precedent.
3. **The realtime client cannot share a topic as written.** `supabase.channel(topic)` returns the *existing* channel for the same topic (`realtime-js@2.117.2 RealtimeClient.js:338`). A second `listen("room:CODE")` for chat would share the channel, and its cleanup would call `removeChannel` and silently kill the room's subscription. `src/lib/realtime.ts` must become a ref-counted per-topic multiplexer bound with `{ event: "*" }` (broadcast wildcards are supported, `RealtimeChannel.js:714`).
4. **Chat:** new table `room_messages`, RLS on with no policies, like every other table. The server writes it, and the browser reads it only through `/api/rooms/[code]/messages`. A `"chat"` ping goes out on the existing `room:CODE` topic. **The ping carries the id only, never the text.** Broadcast topics are public and room codes are listed in `/api/rooms`, private rooms included. **System lines are stored structured** (player ids plus avatar snapshots, the theme object, and a `showAt` time) so that they translate per viewer, show avatars beside names, and don't land before their scene.
5. **Rooms are never deleted.** `closed` is only a phase. The hosted DB has 145 room rows: 80 closed and 44 stale lobbies. Chat cleanup therefore needs two parts: (a) delete when `dispatch` sees the move to `closed`, and (b) a TTL prune (e.g. 24 h), because lobbies whose pages died without a beacon never close.
6. **Pick drafts: store them in `RoomState`** (`Assignment.draft`), written by a new `DRAFT` event through `dispatch` with the ping **suppressed**. Because of compare-and-swap, the timeout always sees the latest accepted draft, and no new table or local mirror is needed. On timeout, `applyDueTimeouts` turns each usable draft into a character *before* reducing; a new character is created with a stable `newId`, so racing timeouts create it once. The engine treats it as a human pick (not `auto`). Random only fills empty cards.
7. **Suggestion hand and rule examples:** `theme-picks.ts` already has everything needed (`popularPicks` → `{id, picks, likes, dislikes}`, `drawWeight`, `pickKey`, language resolution via `getMany`). Add one CDN-cacheable route, `GET /api/themes/[id]/picks?lang=&set=` → `{ hand, fits, misfit }`. It is deterministic per theme, so every player sees the same cards. **History is very sparse today** (16 matches, 47 player rows, 0 feedback rows), so the hand and the ✓ cards must degrade to "nothing / only the sentence".
8. **Migrations:** `pnpm setup:supabase` re-runs **every** file in `supabase/migrations` on every run, with no tracking (the hosted `list_migrations` is empty). New SQL must therefore be idempotent. You can also apply the same SQL with the Supabase MCP (`apply_migration`, name `0011_room_messages`). Per AGENTS.md the agent runs migrations without asking. Never Docker.

---

## 1. Map of today

### 1.1 Backend selection and stores

`src/config.ts`: `BACKEND = "supabase"` when `NEXT_PUBLIC_SUPABASE_URL` and the publishable key are set, else `"local"`. `getBackend()` (`src/server/backend/index.ts`) builds one `Backend` per process from 7 interfaces (`src/server/backend/types.ts`):

| Interface | local | supabase |
|---|---|---|
| `rooms: RoomStore` (get, create, compareAndSwap, listPublic, listActive, withPlayer) | `Map` in a `processSingleton` (survives HMR, lost on restart), `structuredClone` on read/write | table `rooms` (`code` PK, `state jsonb`, `version int`, `phase`, `visibility`, `updated_at`); CAS = `update … where code=? and version=?` |
| `matches: MatchStore` (record, reassign, popularPicks, rateDraw) | `.data/matches.jsonl` + in-memory tallies (`tallyPicks`), `.data/pick-feedback.json` | `record_match`, `reassign_matches`, `theme_pick_scores` (over `popular_picks`) RPCs, `pick_feedback` table |
| `characters: CharacterStore` | bundled `data/characters.json` + `.data/characters.json` (player-made `u-…`) + `.data/character-images.json` | `characters`, `character_names`, `origins`, `origin_labels`, view `character_entries`, RPC `search_characters` |
| `themes: ThemeSource` (via `themes(store)` in `src/server/themes.ts`) | `data/themes.json` + `.data/themes-ai.json` | `themes` table, cached 10 min per instance |
| `files: FileStore` | `.data/uploads/…` served by `/api/files/[...path]` | public buckets `characters`, `avatars` |
| `auth: AuthService` | signed guest cookie + fake test accounts | guest cookie + Supabase Auth accounts (`profiles`) |
| `notify: Notifier` (roomChanged, lobbyChanged) | **no-op** | REST broadcast `channel.httpSend("changed", payload)` |

### 1.2 Room state: persistence, versioning, concurrency

- `RoomState` (`src/game/types.ts:258`) is the whole game. `reduce(state, event, ctx)` (`src/game/engine.ts:508`) is pure: it clones and sets `updatedAt`.
- `dispatch(code, build)` (`src/server/rooms.ts:67`) works as follows:
  - Steps: `rooms.get` → `build(state)` (async, may read stores) → `reduce` → `compareAndSwap(code, version, next)` → on success `background(notify.roomChanged(code, version+1))`.
  - It saves the match once, on the move to `finished`, and pings `lobby` if `toPublicRoom` changed.
  - Up to 5 attempts, then `GameError("conflict")`.
  - **This is the single place where every state transition is observed exactly once.** That makes it the hook for chat system lines and for clearing the chat on close.
- `background(work)` (`src/server/background.ts`) is `after()` from `next/server`. Outside a request (tests, scripts) it runs at once.
- An action returns `toView(state, version, me, now)`. `useRoomAction` → `apply(view)` shows it immediately, guarded by `current.version >= view.version`.

### 1.3 Freshness, broadcast, server clock

- Push: `room:CODE` topic, event `changed`, payload `{version}`. `lobby` topic, payload `{at}` (used as a CDN cache-buster `?v=`).
- Browser (`src/lib/realtime.ts`): `listen(topic, cb)` creates a channel, binds `broadcast/changed` and subscribes. Cleanup calls `removeChannel`. Local mode returns a no-op.
- `useRoom` (`src/features/data/use-room.ts`) refreshes the room in these ways:
  - TanStack Query `["room", code]`, `refetchInterval` 1 s (local) or 10 s (Supabase), refetch on focus.
  - A ping for a version already held is ignored.
  - A timer at `deadline + 300 ms` refetches (no cron: **timeouts fire on the next read**, `applyDueTimeouts`, also from `/api/me/match` via `currentMatch`).
  - `offset = serverNow − midpoint(sent, received)`. `RoomContext.serverTime()` gives the server's time, which drives every reveal (`Reveal {kind, startsAt, until}`).
- `startStep` (`engine.ts:132`) delays a step's clock until `reveal.until` for non-turn phases, or while a `theme` reveal is up. Turn phases start at once.

### 1.4 How clients call the server

- **Mutations:** Server Actions in `src/server/actions.ts`, wrapped by `run()` → `Result<T>`, and on the client by `useAction` (toast on error) and `useRoomAction` (applies the returned `RoomView`). Next 16 docs: *"Next.js dispatches Server Actions one at a time per client"*. A 4 MB image upload or a slow AI theme draw blocks every other action from that tab.
- **Reads:** route handlers:
  - `/api/rooms/[code]` (no-store; fires timeouts, `BACK` on return)
  - `/api/rooms` and `/api/online` (CDN `s-maxage=2`)
  - `/api/me`, `/api/me/match`
  - `/api/characters` (server search fallback), `/api/characters/library` (whole index, cached for a long time), `/api/characters/extras` (15 s)
  - `/api/files/...` (local uploads)
- **A mutation already done as a route handler:** `POST /api/rooms/[code]/gone` (a `sendBeacon` on `pagehide`).
- Cookies: guest cookie `sameSite: "lax"`, `httpOnly` (`src/server/auth/guest.ts:73`). Cross-site POSTs don't carry it, which is the CSRF baseline for new POST routes. Add an `Origin` check anyway, because Server Actions get one for free.

### 1.5 Room life cycle: how rooms close and expire

- Phases: `lobby → (theming|voting) → picking → asking/answering/guessing/validating → finished → lobby` (after `RESULT_SECONDS` = 15 s, or the host).
- `closed` happens when:
  - the last player leaves a lobby or a pre-match phase (`leave`, `engine.ts:688`), or
  - `backToLobby` finds nobody present, or
  - `SWEEP` runs on a match where every present player's page has been gone for ≥ `GONE_GRACE_MS` (5 s) (`presenceDue`/`abandoned`, `src/game/helpers.ts:73`).
- Mid-match leave keeps the seat (`away`). With fewer than 2 present the match is `finish`ed, not closed.
- The gone beacon dispatches `GONE`, then schedules `applyDueTimeouts` after the grace period (`src/app/api/rooms/[code]/gone/route.ts`). If the beacon is lost (crash, mobile kill), nothing happens until someone reads the room.
- **Rows are never deleted.** Visibility is time-based instead:
  - lobbies leave the list after 15 min idle (`LOBBY_LISTED_MS`)
  - matches leave it after 20 min (`PLAYING_FRESH_MS`)
  - `withPlayer` only looks back 6 h
  - a `closed` room answers 404
- Hosted today: closed 80, lobby 44, finished 11, picking 3, asking 4, voting 2, answering 1. The oldest dates from 2026-10-02, the project switch.

### 1.6 Rate limiting

`src/server/rate-limit.ts`: `allow(key, max, windowMs)` is a sliding window in a module `Map`. It is **per server instance** (Vercel has many instances and cold starts) and never evicts keys.

Current keys:
- `create` 20/min
- `join:{id}:{code}` 10/min (password tries)
- `random` 30/min
- `rate` 30/min
- `upload` 30/min (create, replace image, avatar)
- `reroll` 30/min
- `search:{ip}` 240/min

It is soft protection ("only stops runaway loops").

### 1.7 Theme picks (what exists)

`src/server/theme-picks.ts`:
- `popularPicks(themeId, PICKS_FETCHED=100)` → `PopularPick {id (language-free: "wd-Q302" | "al-40" | "u-…"), picks, likes?, dislikes?}`, most picked first. Only human picks count (`autoPicked` and `emergency-*` are excluded).
- `drawWeight = (picks + likes) × 0.5^dislikes`.
- `pickKey()` strips the language, and `entryId(lang, id)` puts it back. `drawPopular()` does the following:
  - resolves ids into the picker's language (`characters.getMany`) and drops missing ones
  - sorts by weight and keeps the top `RANDOM_POOL=20`
  - excludes `taken` and `skip`, then does a weighted draw
- Supabase: `theme_pick_scores(p_theme, p_limit)` = `popular_picks` + `pick_feedback` counts (migrations 0006, 0007). Local: `tallyPicks` + `tallyFeedback` in memory.
- A typed theme (`set: null`) has no `themeId` and no history. `randomPick` refuses it with `not_enough_picks`.

### 1.8 Supabase schema, RLS, migrations

- Comment in `0001_init.sql`: *"The browser never reads these tables directly … RLS is on with no policies."* All 10 public tables have RLS on with no policies. RPCs `revoke execute … from public, anon, authenticated`. `character_entries`: `revoke all … from anon, authenticated`.
- `src/lib/supabase-browser.ts`: *"only for realtime pings and the OAuth redirect. Never for reading tables."* So **never use `postgres_changes`** for chat. It would need select policies for `anon`.
- `scripts/setup-supabase.ts`:
  - runs **all** `supabase/migrations/*.sql` in name order, every time, through `POSTGRES_URL_NON_POOLING` (postgres.js `unsafe`) or the Management API `/database/query` when only `SUPABASE_ACCESS_TOKEN` is set
  - then sets auth config and writes missing keys into `.env.local`
  - Hence migrations use `if not exists`, `create or replace` and `do $$ … exception when duplicate_object`.
- Hosted extensions: `pg_trgm 1.6` and `pgcrypto 1.3` are installed. `pg_cron` and `pg_net` are available, **not installed**.

---

## 2. Chat

### 2.1 Shapes (new `src/game/chat.ts`, shared by server and UI)

```ts
export const MAX_CHAT = 280; // counted in code points ([...text].length), like Postgres char_length

/** Who wrote a line or is named in one, as the room showed them then (they may have left since). */
export type ChatPerson = Pick<Identity, "id" | "isGuest" | "name" | "guestNumber" | "avatar">;

/** A system line, stored as data and written in the viewer's language. */
export type SystemLine =
  | { type: "joined"; player: ChatPerson }
  | { type: "left"; player: ChatPerson }
  | { type: "host"; player: ChatPerson }            // the room went to someone else
  | { type: "started"; round: number }              // "Match started" / "Round 2"
  | { type: "theme"; theme: Theme }                 // "🦸 Theme: Superheroes" (set emoji via themeSetEmoji)
  | { type: "order"; players: ChatPerson[] }        // "Order: Bia, Rafa, you, Leo"
  | { type: "finished" };                           // "Match over"

export interface ChatMessage {
  id: number;                 // bigint identity; per-room order = (shownAt, id)
  at: number;                 // created, ms
  showAt: number;             // server ms from which it may show (system lines wait for their scene)
  by: PlayerId | null;        // null = system line
  author: ChatPerson | null;  // snapshot; the UI prefers the live PlayerView with the same id
  text: string | null;
  system: SystemLine | null;
}
```

- **Avatar rule:** every name in a system line is a `ChatPerson`, rendered with `withNames((n) => t("chat.system.left", { name: n(person) }))`. The `Person` type in `player-name.tsx` (`Named & {avatar}`) matches `ChatPerson`. Message authors render `PlayerName`/`Avatar` from the live player when they are still seated (a reroll or profile change shows), and from the snapshot otherwise.
- **No `reaction` kind.** The proposal's notes listed message/system/reaction, but the user ruled out emoji shortcuts.

### 2.2 Migration `supabase/migrations/0011_room_messages.sql` (idempotent)

```sql
-- Room chat: what players write in the lobby and the match, and system lines
-- ("Match started", "Theme: Superheroes"). Like every table it is written and
-- read only by the server (service key): browsers hear a "chat" ping on the
-- room's Realtime topic and fetch through /api/rooms/[code]/messages. A room's
-- chat is deleted when it closes; chats of rooms that died without closing
-- are pruned after a day (see src/server/rooms.ts).

create table if not exists public.room_messages (
  id bigint generated always as identity primary key,
  room_code text not null references public.rooms (code) on delete cascade,
  author_id text,          -- null for a system line
  author jsonb,            -- the writer as the room showed them: isGuest, name, guestNumber, avatar
  body text,               -- what they wrote, 1 to 280 characters
  system jsonb,            -- a system line (src/game/chat.ts): { "type": "theme", ... }
  show_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint room_messages_kind check (
    (body is not null and system is null and author_id is not null
      and char_length(body) between 1 and 280)
    or (body is null and system is not null and author_id is null)
  )
);

create index if not exists room_messages_room on public.room_messages (room_code, created_at);
create index if not exists room_messages_created on public.room_messages (created_at);

alter table public.room_messages enable row level security;
revoke all on public.room_messages from anon, authenticated;
```

Notes:
- `on delete cascade` costs nothing today (rows are never deleted), and it makes any future room cleanup take the chat with it.
- No RPC is needed: inserts, selects and deletes go through the service client.
- Optional hardening (not v1): a `send_room_message(...)` RPC that inserts only when the author has fewer than N rows in the last 10 s. That is a DB-wide rate limit, unlike the per-instance `allow()`.

### 2.3 Backend interface (`src/server/backend/types.ts`)

```ts
export type NewChatMessage =
  | { by: PlayerId; author: ChatPerson; text: string; showAt?: number }
  | { system: SystemLine; showAt?: number };

export interface ChatStore {
  /** Saves messages in order; returns them with id and times. */
  add(code: string, items: NewChatMessage[]): Promise<ChatMessage[]>;
  /** Messages created at or after `since` (ms), oldest first, at most `limit` (the newest ones when cut). */
  list(code: string, since: number, limit: number): Promise<ChatMessage[]>;
  /** The room closed: its chat goes. */
  clear(code: string): Promise<void>;
  /** Chats of rooms that died without closing: everything older than `before` (ms). */
  prune(before: number): Promise<void>;
}

export interface Notifier {
  roomChanged(code: string, version: number): Promise<void>;
  lobbyChanged(): Promise<void>;
  /** New chat lines in the room; `id` is the newest. Best effort. */
  chatChanged(code: string, id: number): Promise<void>;
}

export interface Backend { /* … */ chat: ChatStore; }
```

- **local** (`src/server/backend/local/chat.ts`): `processSingleton("room-chat", () => new Map<string, ChatMessage[]>())` plus a `processSingleton` counter. Keep the last 200 per room and `structuredClone` on read. Memory only, like local rooms. `notify.chatChanged` is a no-op.
- **supabase** (`src/server/backend/supabase/chat.ts`): `insert(...).select()`, `select(...).eq("room_code").gte("created_at").order("created_at").limit()`, `delete().eq("room_code")`, `delete().lt("created_at")`. Map rows ↔ `ChatMessage` (timestamps → ms).
- `supabase/notify.ts`: `ping(topic, event, payload)` takes the event name (`"changed"` | `"chat"`). `chatChanged: (code, id) => ping(\`room:${code}\`, "chat", { id })`.
  - Minor: on the server, `client.channel(topic)` also dedupes by topic, so two concurrent pings to one room share a channel object, and one's `finally removeChannel` runs while the other's `httpSend` is in flight.
  - `httpSend` is plain REST (URL + apikey), so this is harmless. Fine to leave, or ping without `removeChannel` races by awaiting sequentially.

### 2.4 Send: `POST /api/rooms/[code]/messages` (route handler, not an action)

Why a route: Server Actions are sequential per tab. A chat send must not wait behind an image upload or a confirm, and must not delay them either.

```ts
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/messages">) {
  // 1. same-origin guard (Origin header === host), JSON body { text }
  // 2. code = normalizeCode(...) ; me = auth.identity(lang)
  // 3. allow(`chat:${me.id}`, 5, 10_000) && allow(`chat-min:${me.id}`, 30, 60_000) else 429 rate_limited
  // 4. text: string, trim, strip control chars except \n, collapse 3+ newlines, 1 ≤ [...t].length ≤ 280 else 400
  // 5. stored = rooms.get(code); 404 if missing/closed; seat = players.find(id); 403 unless seated && !seat.away
  // 6. [msg] = chat.add(code, [{ by: me.id, author: snapshot(seat), text }])
  // 7. background(() => notify.chatChanged(code, msg.id))
  // 8. return Response.json(msg) (no-store) — the sender replaces its optimistic line
}
```

Cost: 2 queries (room read + insert) plus one REST ping.

### 2.5 Read: `GET /api/rooms/[code]/messages?since=<ms>`

- Membership: `rooms.get` (no `applyDueTimeouts`, keep it cheap). 404 if missing or closed, 403 if not seated (send `elsewhere` like the room route only if needed).
- With no `since`: the last 50 (initial fetch when entering the room). **Suggested choice:** only lines created after the viewer's `RoomPlayer.joinedAt` (it is in `state`, not in the view), so a newcomer doesn't read the banter from before they arrived. The "joined" line marks the start. Alternatively show the last 50, which is a product call.
- **Gap-proof paging:** identity ids can commit out of order under concurrent inserts, so an `after=<id>` cursor can skip a line. Use a time overlap instead: the client asks for `since = newest.at − 3000` and merges by `id`. The rows are tiny, so the duplicates cost nothing.
- Response `{ messages: ChatMessage[] }`, `Cache-Control: no-store`.

### 2.6 System lines: pure function, called from `dispatch`

New `systemLines(before: RoomState, after: RoomState, event: GameEvent, now: number): NewChatMessage[]` in `src/game/chat.ts` (unit-testable like `matchRecord`). Rules:

| Line | Detected by | `showAt` |
|---|---|---|
| joined | id in `after.players`, not in `before` (event `JOIN`) | now |
| left | id in `before`, not in `after` (lobby `LEAVE`/`SWEEP`), or `away` false→true (mid-match leave or 2 strikes) | now |
| host | `before.hostId !== after.hostId` and not closed (optional) | now |
| started | `before.phase === "lobby"` and `after.phase ∈ {voting, theming}` | now (or the start of the intro) |
| theme | `after.round > before.round` and `after.theme` set | `reveal.startsAt + (tied>1 ? themeTieSpin : 0) + ~1000`, the moment the theme scene shows it (prototype: theme scene t0 + 1.0 s) |
| order | `before.playStartedAt == null` and `after.playStartedAt != null` | when the turn-order scene shows it (`after.stepStartsAt`, or the new pre-turn reveal's end) |
| finished | phase → `finished` | `after.reveal?.until ?? now` (after the hit reveal) |

- **Skip** `SWAP_PLAYER` (a guest signing in would otherwise read as "left" plus "joined"), `UPDATE_IDENTITY`, `GONE`/`BACK` (reload churn), `DRAFT`, `SET_READY`, `UPDATE_SETTINGS`.
- No per-turn lines ("Round 1 · Bia's turn" appears once in the prototype; per-turn lines would flood the chat).
- In `dispatch`, after a successful CAS:

```ts
const lines = systemLines(stored.state, next, event, Date.now());
if (lines.length) background(async () => {
  const saved = await chat.add(code, lines);
  await notify.chatChanged(code, saved.at(-1)!.id);
});
if (next.phase === "closed" && stored.state.phase !== "closed") background(() => chat.clear(code));
```

The CAS guarantees each transition is seen once, so each line is inserted once. `dispatch` needs the event that `build` produced, which it already has (`const event = await build(...)`).
- **Ordering in the UI:** sort by `max(at, showAt)`, then `id`. A theme line waiting for its scene then appears at the bottom when the scene shows it, instead of popping in above newer messages. The client hides a line until `serverTime() >= showAt` (`useServerClock`).
- No new leak: when the theme line arrives early, `view.theme` already carries the theme at the same moment.

### 2.7 Delivery: refactor `src/lib/realtime.ts`

```ts
type Payload = Record<string, unknown>;
const topics = new Map<string, { channel: RealtimeChannel; listeners: Set<{ event: string; cb: (p: Payload) => void }> }>();

function listen(topic: string, event: string, cb: (p: Payload) => void): () => void {
  if (BACKEND !== "supabase") return () => {};
  let t = topics.get(topic);
  if (!t) {
    const listeners = new Set<{ event: string; cb: (p: Payload) => void }>();
    const channel = browserClient()
      .channel(topic)
      .on("broadcast", { event: "*" }, (m) => {
        for (const l of listeners) if (l.event === m.event) l.cb((m.payload ?? {}) as Payload);
      })
      .subscribe();
    t = { channel, listeners };
    topics.set(topic, t);
  }
  const l = { event, cb };
  t.listeners.add(l);
  const entry = t;
  return () => {
    entry.listeners.delete(l);
    if (entry.listeners.size === 0) { topics.delete(topic); void browserClient().removeChannel(entry.channel); }
  };
}
export const subscribeRoom = (code, cb) => listen(`room:${code}`, "changed", cb);
export const subscribeChat = (code, cb) => listen(`room:${code}`, "chat", cb);
export const subscribeLobby = (cb) => listen("lobby", "changed", cb);
```

- This keeps "the realtime channel the room already uses" (same topic, one websocket) without the shared-channel removal bug.
- Optional: on `subscribe((status) => status === "SUBSCRIBED" && …)` after a reconnect, call every listener with `{}`. `useRoom` already treats a ping with no version as "refetch", and chat refetches. This covers pings missed while offline.
- **Ping only, never the message text.** Broadcast topics are public: anyone with the publishable key can join `room:CODE`, and `/api/rooms` lists every room's code, locked ones included. The room design has the same property (pings carry only `version`). The cost is one fetch per message per listener.
- Local mode has no pings, so `useChat` polls `messages?since=` every 1.5 s (local only). On Supabase: pings, a 20 s safety poll and a refetch on focus.

### 2.8 Deletion and expiry

1. On close: `dispatch` sees `→ closed` and calls `chat.clear(code)` (above). Every close path (lobby leave, sweep, back to lobby with nobody) goes through `dispatch`. `pnpm test-rooms --clear` writes rows directly, so the prune covers those.
2. TTL: in `openRoom` (every new room), `background(() => chat.prune(Date.now() - 24 * 3600_000))`. This is one indexed delete, needs no cron, and covers the stale lobbies that never close. Alternative: `pg_cron` is available on the project but not installed, and the setup script would have to install and schedule it idempotently. That is not worth it here.
3. Local: memory only, so a restart clears it. `clear` and `prune` work the same.

### 2.9 Client plumbing (for the UI work)

- Mount `<RoomChat />` in `RoomScreen` inside `RoomProvider`, as a sibling of `PhaseScreens`/`RevealOverlay`, outside the phase `AnimatePresence`, so it lives through lobby → match → podium → lobby.
- `useChat(code)`: query `["chat", code]` holding a `Map<id, ChatMessage>`.
  - Initial fetch on mount (the room view already proved membership). On `subscribeChat` ping → refetch with `since = newest.at − 3000`, debounced 100 ms.
  - Local: `refetchInterval` 1500. Supabase: 20 000.
  - `send(text)`: optimistic line with a temp id. On success replace it with the server's message. On `rate_limited`, mark it failed and show the toast via `common.errors`.
- **Unread** (browser only):
  - `seen = localStorage["4dare:chat-seen:<code>"]` (try/catch; it can be empty). On first load with nothing stored, set `seen` to the newest id so entering a room never shows a flood.
  - Unread = text lines with `id > seen` and `by !== youId` that are visible (`showAt` passed). System lines don't count and don't pop.
  - Opening the chat sets `seen` to the newest id.
  - Tab state: count, the last 3 distinct senders' faces (newest first), a 3 s bubble per new unread line (desktop), and a nudge every ~6–8 s while unread > 0 and folded (none with reduced motion). This matches the prototype's `finishChat` (`flow/shell.js:302`).
- Phone bar: "Name: text" from the newest *player* line (prototype `lineTr`), defaulting to "Room chat".

### 2.10 Tests to add

- `src/game/chat.test.ts`: `systemLines` for join, leave, lobby sweep, strike-out away, host change, start, theme (with tie offset), order, finished; SWAP_PLAYER and UPDATE_IDENTITY produce nothing.
- `src/server/server.test.ts` (local mode harness already mocks cookies):
  - send and list
  - 280-character limit in code points
  - rate limit (6th in 10 s → 429)
  - non-member → 403
  - the theme line appears after a vote with a future `showAt`
  - leaving the last seat closes the room and empties the chat
  - prune
- `e2e`: two players chatting in the lobby (local mode polls).

---

## 3. Pick drafts

### 3.1 Where to keep them

| | **A. In `RoomState` (`Assignment.draft`), quiet `DRAFT` event** | B. Separate store/table `pick_drafts` |
|---|---|---|
| Timeout sees the latest draft | Atomic: compare-and-swap orders a save against the `TIMEOUT` write | Extra read in `applyDueTimeouts`; a save racing the deadline must re-check phase/deadline itself |
| New SQL / local mirror | None | Migration plus local `Map` plus cleanup per round |
| Cleanup | Free: `beginMatch` resets `assignments`, `backToLobby` clears them | Needs hooks on round change and close |
| Write cost | `get` + CAS (2 queries), version bump; contention with ≤ 4 players' actions is handled by the 5 retries | 2 queries (room read for validation + upsert), no contention |
| Realtime noise | Avoid with `dispatch(…, { ping: false })` | None |
| Reload restores the card | `PickView.draft` comes with the room | Extra fetch |

**Recommendation: A.** It fits the "one document, one transition point" design, needs no migration, and local mode gets it for free. The only cost is version churn, which suppressing the ping neutralizes. Other tabs see the bumped version on their next poll or ping; that is harmless, since nothing treats a version bump as a visible change, and `apply` guards with `>=`.

### 3.2 Types, engine and view

```ts
// src/game/types.ts
export const MAX_CHARACTER_NAME = 60; // the limit createCharacter already uses

/** What is on the picker's card while they edit; on timeout it becomes the pick. */
export interface PickDraft {
  /** A library or player-made character the card shows (chosen, from the hand, drawn, or the live preview). */
  characterId: string | null;
  /** The name field; for a new character, its name. */
  name: string;
  /** Display snapshot for the picker's own card on reload (untrusted, never used to pick). */
  origin: string | null;
  /** A picture already uploaded for a new character (validated URL). */
  imageUrl: string | null;
  /** "u-<uuid>" the character gets if the clock has to create it, fixed at the first save. */
  newId: string | null;
}
export interface Assignment { pickerId: PlayerId; character: Character | null; auto?: true; draft?: PickDraft | null }

// GameEvent additions
| { type: "DRAFT"; playerId: PlayerId; draft: PickDraft | null }
| { type: "TIMEOUT"; themes?: Theme[]; fallbackCharacters?: Character[];
    /** Picker id → the character their draft became (made by the server before reducing). */
    drafted?: Record<PlayerId, Character> }

// PickView addition
draft: Omit<PickDraft, "newId"> | null;
```

- `engine.ts`, the `DRAFT` reducer:
  - `phase === "picking"`, else `wrong_phase`
  - find the assignment whose `pickerId === playerId`, else `not_member`
  - `already_done` if `character` is set
  - `deadline !== null && now >= deadline` → `wrong_phase` (the clock is up; `TIMEOUT` owns it now)
  - set `a.draft = draft`
- `TIMEOUT` in picking:

```ts
for (const a of Object.values(s.assignments)) {
  if (a.character) continue;
  const d = e.drafted?.[a.pickerId];
  if (d) { a.character = { ...d, aliases: [...d.aliases] }; continue; } // a person's pick: not auto, counts for theme stats
  const c = pool.shift() ?? fail("invalid_input");
  a.character = { ...c, aliases: [...c.aliases] };
  a.auto = true;
}
```

- `view.ts` `pick()`: `draft: a.draft ? { characterId, name, origin, imageUrl } : null`. Only the picker's own `PickView` has it. Nobody else (and never the target) sees it.
- `swapPlayer` copies assignments with spread, so a draft follows a guest who signs in.

### 3.3 Saving: `PUT /api/rooms/[code]/draft` and `POST /api/rooms/[code]/draft/image`

Why routes: autosave runs every keystroke burst. As Server Actions, saves would queue Confirm and Random behind them.

- `PUT` JSON `{ characterId, name, origin, imageUrl }` or `null` to clear:
  - Origin check. `allow(\`draft:${id}\`, 120, 60_000)`.
  - Validate: `name.trim()` ≤ 60 code points; `origin` ≤ 60; `characterId` ≤ 200; `imageUrl` only from our own uploads (`/api/files/characters/…` local, or `${SUPABASE_URL}/storage/v1/object/public/characters/…`) or the library's image of that `characterId`.
  - `newId` is set by the server: keep the stored one, or `u-${randomUUID()}` the first time a draft has no `characterId`.
  - `dispatch(code, () => ({ type: "DRAFT", … }), { ping: false })` → 204. Return the version, or nothing; the client's local card state is the source of truth while editing.
- `POST …/draft/image` multipart `image`:
  - `readImage()` (move it from `actions.ts` into a shared `src/server/images.ts`), `allow(\`upload:${id}\`)` (shared with `createCharacter`)
  - `files.put("characters", …)` → quiet `DRAFT` with `imageUrl`, keeping the rest → `{ imageUrl }`
  - Orphan uploads when the picture changes again are accepted, as today.
- A picture changed on a **library** character on the card still calls `replaceCharacterImage`. That changes it for future matches, as the proposal's note says.
- Client cadence:
  - debounce ~600 ms after typing
  - save at once on picking from the list, the hand or Random, or on an image
  - flush at `deadline − 1500 ms` (server clock)
  - flush on `pagehide` with `fetch(…, { keepalive: true })`
  - the draft always mirrors **what the card shows**: a name with a live preview = `{characterId: preview.id, name: typed}`; a "New!" card = `{characterId: null, name}`

### 3.4 Confirming without "Create character"

New action `confirmCard(code, form: FormData)` with fields `characterId` | `name` (+ optional `image` file or an already-uploaded `imageUrl`).

- With `characterId` → `characters.get` → `PICK`.
- Otherwise → `getOrCreateCharacter({ id: newId?, lang: me.lang, name, origin: null, imageUrl, createdBy })`, then `PICK`. This is one action instead of today's `createCharacter` → `confirmPick` (two queued actions).
- Extract `getOrCreateCharacter()` from `createCharacter` (same-name reuse via `characters.search(name, lang, 10)` + `normalizeName`) into `src/server/characters.ts`, used by `createCharacter`, `confirmCard` and the timeout.
- Keep `confirmPick` and `createCharacter` (server tests and e2e use them).

### 3.5 Timeout: `applyDueTimeouts` (picking branch)

```ts
if (state.phase === "picking") {
  const drafted = await draftedCharacters(state);          // picker id -> Character
  return { type: "TIMEOUT", drafted, fallbackCharacters: await fallbackCharacters(state, drafted) };
}
```

- `draftedCharacters`: for each assignment with no `character` and a usable draft:
  - `characterId` → `characters.get(id)`; if gone, fall through to the name
  - else `name.trim()` ≥ 2 (suggest 3) → `getOrCreateCharacter({ id: draft.newId, lang: picker.lang, name, origin: null, imageUrl: draft.imageUrl, createdBy: pickerId })`
- **Idempotent creation:** `build` can run several times (CAS retries) and on several requests at once (every client's `GET /api/rooms` after the deadline, plus `/api/me/match`). Give `NewCharacter` an optional `id`:
  - Supabase: `upsert(…, { onConflict: "id", ignoreDuplicates: true })` on `characters`, then on `character_names` (`character_id, lang`), then read back via `entry(id)`
  - Local: return the existing row if the id is already in the `Map`
- `fallbackCharacters` only for cards still empty. Suggested improvement: try the theme first (`drawPopular` with `taken` = picks plus drafted), then `randomPopular`, then `EMERGENCY`, so an empty card's random pick fits the theme when history exists. These stay `auto` (excluded from stats).
- The "Time! That's it." stamp is client-side at `deadline`. The next room fetch has `pick.confirmed` with the drafted card.

### 3.6 Edge cases

- A save that lands after the deadline but before anyone has read the room is rejected by the `now >= deadline` check. A save just before it is accepted, and the CAS puts it before the `TIMEOUT` write.
- `PICK` after a pending draft save: the draft write fails `already_done` (ignored).
- Junk risk: half-typed names become permanent `u-` characters in everyone's search (via `/api/characters/extras`). Mitigations: minimum length, prefer the live preview's library id whenever the index matches, and possibly only create a character when the name doesn't prefix-match any library name. Flag this for the user.
- A typed theme (`set: null`): drafts work the same. There is no hand and no Random, as today.

---

## 4. Suggestion hand and rule scene data

### 4.1 One cacheable route: `GET /api/themes/[id]/picks?lang=pt&set=heroes`

- `id` = `themeId(theme)` (validate `^[a-z0-9-]{1,80}$`), `lang` ∈ LANGS, `set` ∈ THEME_SET_KEYS. The client skips the call for a typed theme.
- The data is the same for everyone, with no viewer secrets: `Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=600`, like `/api/rooms`.
- Prefetch when the theme reveal starts (`view.reveal.kind === "theme"`) and preload the images (`new Image()`, `thumbUrl(url, 192)`), so the rule scene (~2.6 s into the reveal) and the hand have their pictures.

```ts
export interface ThemePicksResponse {
  /** The theme's most picked and liked characters in this language, best first (the hand under the card). */
  hand: (CharacterDTO & { picks: number; likes: number })[];   // up to 6; UI shows 5 (prototype), fewer on phones
  /** Two of the best with a picture: ✓ in the rule scene. Empty when the theme has fewer. */
  fits: CharacterDTO[];
  /** One character from a very different kind: ✗ in the rule scene. Null when unsure. */
  misfit: CharacterDTO | null;
}
```

### 4.2 Hand ranking (new `rankPopular` in `theme-picks.ts`, shared with `drawPopular`)

`popular = matches.popularPicks(id, PICKS_FETCHED)` → resolve into `lang` with `characters.getMany(entryIds)`, exactly as `drawPopular` does. Then keep `drawWeight >= 1` (drops heavily disliked ones), sort by `drawWeight`, then picture first, then id. Take 6, each with `picks` and `likes` (the heart count on each hand card).

- **Don't exclude characters already picked in the match.** During picking nobody may see cards. A hand card vanishing would hint "someone picked Spider-Man", possibly for you. A per-room list would also break the CDN cache. The engine already allows duplicates. (`randomPick` does exclude `taken`; that small leak exists today.)

### 4.3 ✓ fits and ✗ misfit

- `fits`: the first two hand entries **with a picture**. If fewer than two qualify, return `[]` and the scene shows only the sentence, as a typed theme does.
- `misfit`, deterministic per theme so every screen shows the same card:
  - Pool by theme set:
    - fiction sets (`screen, cartoons, anime, games, books, heroes, powers, myths, scifi, warriors, animals`) → a curated list of very recognizable real people
    - real-people sets (`music, celebs, sports, history`) → a curated list of iconic cartoons and fiction
    - cross-cutting sets (`world, jobs, family, quirks, looks`) → `null`, because "Characters with glasses" or "Famous duos" can fit almost anyone. The scene then plays ✓✓ only.
  - Candidates = the pool minus anything in the theme's `popular` list. Choose `candidates[hash(themeId) % n]`, resolved in `lang` via `getMany`, picture required.
  - Use a curated list rather than a library category query. The library's `category` exists in the bundled `data/characters.json` (`SeedCharacter.category`), but a category-based draw can still hit an ambiguous character (Napoleon for "Warriors"). About 8 hand-picked library ids per pool, all in 3 languages with images, is safer. Add a test that each id resolves in every language, like `theme-set-examples.test.ts`.
  - The user said "from a very different theme". If a future history makes it worthwhile, prefer the top pick of a theme in a distant set (would need a `set_pick_scores(p_set, p_limit)` RPC grouping `matches.theme->>'set'`, plus a local tally by set). Not needed for v1.

### 4.4 Sparse history (important for testing)

Hosted: 16 matches, 47 player rows, 0 feedback rows. Most themes return an empty hand and no fits, so the UI must:
- hide the hand and its label when it is empty, and show what exists when there are 1–4 cards
- play the rule scene sentence-only when `fits` is empty

To see the full scene in local mode, play a few matches on one theme first. The `server.test.ts` "random pick by theme" block shows how. Don't seed fake history into Supabase; AGENTS.md treats matches as test data, but faking stats skews the Random button.

---

## 5. Adjacent engine and timeline points (for whoever owns the scenes)

- **Vote 20 s:**
  - `VOTE_SECONDS = 20` (`src/game/types.ts:124`). `engine.test.ts` uses the constant.
  - `PRODUCT.md` line 14 (step times) gains "the theme vote 20 s".
  - `ARCHITECTURE.md` still says "3 themes, 8 s" (stale) → 20 s.
  - ROADMAP item already listed.
- **"Choose a theme together" plus dealing before the vote clock:**
  - Give `beginVote`/`beginTheming` a new reveal (`Reveal.kind` += `"intro"`, `until = now + INTRO_MS`, longer when `state.round === 0`, the cold open). `startStep` already waits for `reveal.until` in non-turn phases, so the vote clock starts after it.
  - `view.reveal()` must map the new kind (it currently returns `null` for kinds other than theme, answers and guess, via the `plays` lookup).
  - Decide whether `vote()` gets `guardStep` (`too_early`) while the cards are being dealt.
- **Theme reveal → rule → draw → "for whom":** one longer `revealTheme(ms)`. Today it is `REVEAL_TIMING.theme` 3000 + tie spin 2000. Split the constants: spotlight + rule (first match only; the rule "doesn't repeat") + draw + for-whom. `startStep(PICK)` already waits for it. The chat "Theme" line's `showAt` must use the same constants.
- **"Your character" + turn order before the first question:** `startTurns` → `goToTurn` puts the room in `asking`, a turn phase. `startStep` waits only for a `theme` reveal there (`engine.ts:133`). Add a new reveal kind (e.g. `"deal"`) set in `startTurns` and include it in `waits`. `guardStep` then answers `too_early` to an early ask.
- **"Rafa picked yours":** `PlayerView.pickedById` is null for yourself until `finished` (`view.ts:328`). The picker ring is fixed by `order`: the picker of X is the player before X in `order`, and `turnOrder` is in the view from picking on. So the data is already derivable on the client. Exposing `pickedById` for yourself from the deal scene on loses no secrecy.
- **Avatars:** chat system lines and every new scene text with names → `withNames`/`PlayerName` (`src/components/ui/player-name.tsx`).

---

## 6. Migrations: how they are applied

- Write `supabase/migrations/0011_room_messages.sql` (above). It must be idempotent, because **every run re-applies every file**.
- Apply it with either:
  - `pnpm setup:supabase`. Needs `NEXT_PUBLIC_SUPABASE_URL` plus `POSTGRES_URL_NON_POOLING` (or `SUPABASE_ACCESS_TOKEN`) in `.env.local`; `vercel env pull .env.local` brings them. It also re-PATCHes auth settings when a token is present.
  - The Supabase MCP: `apply_migration(project_id: "zooqjsrhjupqghuuipon", name: "0011_room_messages", query: <file contents>)`. This records an entry in Supabase's migration history, which is empty today because the script doesn't track. Harmless, since the SQL is idempotent.
- Then verify with `list_tables` (expect `public.room_messages`, RLS on) and `get_advisors(security)`.
- AGENTS.md: migrations and seed are the agent's job, run whenever needed without asking. Losing test data is fine, but keep what you can (this migration only adds). Memory: never Docker or `supabase start`. Never print `.env` secrets.
- No Realtime configuration is needed: pings are REST broadcasts on public topics, with no `postgres_changes` and no publication changes.

---

## 7. File-by-file change list (data and server side)

New:
- `supabase/migrations/0011_room_messages.sql`
- `src/game/chat.ts` (+ `chat.test.ts`): `MAX_CHAT`, `ChatPerson`, `SystemLine`, `ChatMessage`, `systemLines()`
- `src/server/backend/local/chat.ts`, `src/server/backend/supabase/chat.ts`
- `src/app/api/rooms/[code]/messages/route.ts` (GET, POST)
- `src/app/api/rooms/[code]/draft/route.ts` (PUT), `src/app/api/rooms/[code]/draft/image/route.ts` (POST)
- `src/app/api/themes/[id]/picks/route.ts` (GET)
- `src/server/characters.ts` (`getOrCreateCharacter`), `src/server/images.ts` (`readImage` moved), a small `sameOrigin(request)` helper
- `src/server/theme-scene.ts` or more in `theme-picks.ts`: `rankPopular`, `ruleExamples`, curated misfit pools (+ tests)
- client: `src/features/chat/use-chat.ts` (+ UI by the design work)

Changed:
- `src/server/backend/types.ts`: `ChatStore`, `Backend.chat`, `Notifier.chatChanged`, `NewCharacter.id?`
- `src/server/backend/index.ts`: wire chat; local notify gains `chatChanged: async () => {}`
- `src/server/backend/supabase/notify.ts`: event name parameter
- `src/server/backend/{local,supabase}/characters.ts`: `create` honours `id`, idempotent
- `src/server/rooms.ts`:
  - `dispatch(code, build, { ping = true })`
  - system lines + `chat.clear` on close
  - `openRoom` → `chat.prune`
  - `applyDueTimeouts` picking → `drafted` + theme-aware fallback
- `src/server/actions.ts`: `confirmCard`; `createCharacter` uses `getOrCreateCharacter`
- `src/game/types.ts`: `VOTE_SECONDS = 20`, `PickDraft`, `Assignment.draft`, `DRAFT`, `TIMEOUT.drafted`, `PickView.draft` (+ the new reveal kinds if adopted)
- `src/game/engine.ts`: `DRAFT`; picking `TIMEOUT` uses `drafted`
- `src/game/view.ts`: `PickView.draft`
- `src/lib/realtime.ts`: multiplexer, `subscribeChat`
- `messages/{en,pt,ja}/room.json`: `chat.*`, `chat.system.*`
- Docs (English): `ARCHITECTURE.md` (chat, drafts, vote 20 s, fix "8 s"), `PRODUCT.md` (vote time)

---

## 8. Risks and open questions

1. **Chat text over broadcast:** don't. Topics are public and codes are listed. Ping, then fetch through the authorized route.
2. **Shared realtime topic:** without the multiplexer, chat's cleanup silently unsubscribes the room's pings (`channel()` dedupe).
3. **Server Actions are sequential:** chat and drafts as Server Actions would delay Confirm and Random. Use route handlers with an Origin check.
4. **Junk characters from timed-out drafts** enter the shared library (`extras`). Set a minimum length and prefer the library preview. Ask the user whether a half-typed name should be created.
5. **Sparse history:** the hand and ✓ cards will mostly be empty for now. The UI must handle 0–4 cards gracefully, and the rule scene must handle sentence-only.
6. **Rooms are never deleted:** the chat needs both a clear on close and a TTL prune. Deleting old `rooms` rows themselves is out of scope (the FK cascade will follow if it is added).
7. **The rate limit is per instance:** it is fine for spam loops. Add the DB-side check (RPC) only if abuse shows up.
8. **SWAP_PLAYER:** messages sent as a guest keep the guest's `author_id`, so after signing in they show from the snapshot and not as "mine". Optional: `chat.reassign(code, from, to)` in background on `SWAP_PLAYER`.
9. **Newcomers:** show history since `joinedAt` (suggested) or the last 50. This is a product call.
10. **Draft version churn:** each autosave bumps `version` without a ping. Check that nothing in the UI treats a version change as "something visible changed". (`useRoom`/`apply` compare with `>=`, so this is fine.)
