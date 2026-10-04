# WP6 report: chat storage, routes, system lines, realtime, `useChat`

## Files

Created: `supabase/migrations/0012_room_messages.sql`, `src/game/chat.ts` (+ `chat.test.ts`), `src/server/backend/local/chat.ts`, `src/server/backend/supabase/chat.ts`, `src/app/api/rooms/[code]/messages/route.ts`, `src/features/chat/use-chat.ts`.
Changed: `src/server/backend/types.ts` (`ChatStore`, `Backend.chat`, `Notifier.chatChanged`), `src/server/backend/index.ts`, `src/server/backend/supabase/notify.ts` (`ping(topic, event, payload)`), `src/server/rooms.ts` (dispatch hook, prune in `openRoom`, `chat.reassign` in `handOverSeats`), `src/lib/realtime.ts` (+ `realtime.test.ts`), `src/server/server.test.ts` (new `room chat` block at the end).

## What was built (API for later packages)

- **`@/game/chat`**: `MAX_CHAT` (280 code points), `CHAT_PAGE` (50), `CHAT_OVERLAP_MS` (3000), `CHAT_LIMITS` (5/10 s, 30/60 s). Types: `ChatPerson`, `SystemLine` (`started`, `theme`, `order`, `firstTurn`: only those four), `ChatMessage`, `NewChatMessage`. Functions:
  - `systemLines(before, after, now, showScale = 1)`;
  - `cleanChatText(raw)`: string or null;
  - `chatOrder`;
  - `visibleChat(msgs, now)`: hidden until `showAt`, sorted by `max(at, showAt)`, then id;
  - `countUnread(msgs, seen, you, now)`: text lines from others only, visible, with `id > seen`;
  - `reassignMessage`, `chatPerson`.
- **System lines** (plan 1.7): `started` at `opening.startsAt`; `theme` at the theme beat's start + `themeLine` (scaled, clamped into the beat), so the tie spin and the settle are already counted; `order` at the order beat's start + `orderLine[first|later]` (scaled); `firstTurn` at `cast.until + turnLine`, where `n` is the match number. They are posted in `dispatch` after a winning CAS, never for a `quiet` write: `background(chat.add, then notify.chatChanged(code, newestId))`. On `→ closed`, `background(chat.clear)`. `openRoom` runs `background(chat.prune(now − 24 h))`.
- **`ChatStore`** `{ add, list(code, since, limit), clear, prune(before), reassign(from, to) }`. A text line over the limit makes `add` throw `GameError("rate_limited")`.
  - Local: `processSingleton`, last 200 per room, exact limit.
  - Supabase: `add_room_message` RPC, which enforces the limit under an advisory lock per (room, author), so it holds across instances; `reassign_room_messages` RPC; plain deletes for `clear` and `prune`.
- **Route** `/api/rooms/[code]/messages`:
  - `GET ?since=<ms>`: seated players only (403 otherwise, 404 if the room is missing or closed). Without `since` it returns the last 50; with it, up to 200. Answers `{ messages }`, `no-store`. Lines still waiting for their scene are sent too; the client hides them.
  - `POST { text }`: same-origin check → `allow(chat:id 5/10 s)` and `allow(chat-min:id 30/60 s)` → `cleanChatText` (400) → seated and not away (403) → `chat.add` (429 if the store refuses) → id-only ping → returns the saved `ChatMessage`.
- **Realtime**: `subscribeChat(code, ({ id }) => …, onStatus?)` sits beside `subscribeRoom` (same signature as before) and `subscribeLobby`. Each topic has one channel bound to `{ event: "*" }`, and every listener gets only its own event. The current file's linger, lazy client and status watchers are unchanged. Unsubscribing the chat leaves the room's `changed` pings working (tested).
- **`useChat(code)`** (use it under `RoomProvider`) → `{ messages: ChatLine[], send(text): boolean, retry(id), status }`.
  - `ChatLine` = `ChatMessage` + `state: "sent" | "sending" | "failed"`. Optimistic lines have negative ids.
  - `messages` holds only the lines visible now, in chat order. A timer re-renders the hook when the next waiting line's `showAt` arrives.
  - Data lives in React Query `["chat", code]` (`chatKey`), merged by id with a 3 s overlap.
  - Refreshes: on a ping (debounced 100 ms, skipped when the id is already known), on (re)join, on focus, and on a poll (1.5 s local; 20 s on Supabase while joined, 5 s while the channel is down).
  - A 429 toasts `common.errors.rate_limited`.

## Deviations from the plan

1. **`systemLines` takes `showScale` as a 4th argument.** The marks are scaled like the beats, which the 3-argument signature can't do. `dispatch` passes `ctx().showScale`.
2. **Reconnect refetch uses the existing `onStatus` callback (join or rejoin → refetch), not by calling every listener with `{}`.** Calling the listeners too would make `useRoom` refetch twice, and the lead asked to keep the current file's behaviour.
3. **The Supabase safety poll drops to 5 s while the channel is down**, the same way `useRoom` polls faster when disconnected. It stays at 20 s while joined.
4. **Quiet writes post no system lines.** They can't cause a transition anyway (WP5).
5. **The `author` snapshot keeps `id`** (`ChatPerson`), so `reassign` rewrites it along with `author_id`. In `system`, the id is replaced as the text `"id": "<from>"`.
6. **Unread state (localStorage) and its UI are not in `useChat`.** The 3.1 API leaves them out. WP11 builds them on top of `countUnread` and the ids in `messages`.

## Requests

- **WP11:**
  - Render `useChat(code).messages` as they come: already filtered and ordered.
  - Tap-to-retry calls `retry(line.id)` when `line.state === "failed"`.
  - `send` returns false for empty or too-long text. Disable the send button with `cleanChatText`, or count length as `[...text].length`.
  - Prefer the live `PlayerView` for `by` / `ChatPerson.id`, and fall back to the snapshot.
  - The lab has no messages route (`useChat` will get a 404 there). Feed fixtures to the components, not to the hook.
- **WP12:** `ARCHITECTURE.md`: the chat (table, RPCs, id-only pings, prune and clear). `server-data.md`'s "0011_room_messages" is stale: the migration is 0012.

## Verification

- `pnpm exec vitest run src/game/chat.test.ts src/server/server.test.ts src/lib/realtime.test.ts`: **3 files, 47 tests passed**. These cover send/list, 280 vs 281 code points, the 6th line → 429 from the route and from the store, non-member 403, the theme line's `showAt` in the future, order/firstTurn, close clears, prune, reassign, the multiplexer, and the id-only ping.
- `pnpm typecheck`: passes on the whole tree.
- `pnpm exec biome check` on my 13 files: clean.
- Supabase:
  - `apply_migration 0012_room_messages`: success.
  - `list_tables`: `public.room_messages`, RLS on.
  - `get_advisors(security)`: nothing new. Only `rls_enabled_no_policy` (INFO, the same on every table), plus the existing `pg_trgm` in public and leaked-password warnings.
  - Checked in a rolled-back DO block: 5 lines inserted and the 6th `rate_limited`; reassign rewrote `author_id`, `author.id` and the `firstTurn` player; anon has no execute on `add_room_message`.
- Dev server (3100): `GET /api/rooms/ZZZZZ/messages` → 404; a cross-origin POST → 403.
- Screenshots: none. WP6 has no UI (the hook only); the chat UI is WP11's.
