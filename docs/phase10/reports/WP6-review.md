# WP6 review (commit b6fadd4)

**Verdict: passed.** No high or medium defects. One low.

## How it was checked

- Read the brief's acceptance and the report, then every file in the commit.
- `pnpm exec vitest run src/game/chat.test.ts src/server/server.test.ts src/lib/realtime.test.ts`: 3 files, 47 tests passed.
- `pnpm typecheck`: passes. `biome check` on the 13 changed TS files: clean.
- Hosted project `zooqjsrhjupqghuuipon`, read-only checks:
  - `room_messages` has RLS on; anon and authenticated have no select or insert.
  - FK `on delete cascade`, and the 3 indexes are there.
  - Both functions are `security definer` with `search_path=public`. anon and authenticated cannot execute them.
  - `add_room_message` takes the advisory lock. `reassign_room_messages` matches the file.
  - jsonb prints `"id": "…"` (key, colon, space), which is the text the reassign `replace` looks for.
  - Security advisors show nothing new (`rls_enabled_no_policy` INFO on every table, `pg_trgm` in public, leaked passwords).
- No screenshots: WP6 has no UI.

## Acceptance

| Criterion | Result |
|---|---|
| 1.7 shapes (`MAX_CHAT`, `ChatPerson`, the 4 `SystemLine`s, `ChatMessage`, `systemLines`) | ok (`systemLines` takes `showScale` as a 4th argument; the report lists this deviation) |
| System lines posted once per transition with the right `showAt` (scaled) | ok. They are posted only after a winning CAS and never on quiet writes. Every timeout goes through `dispatch`. The theme mark sits in its beat (tie and settle counted) and the order mark is per first/later. `firstTurn` is at `cast.until + turnLine`. |
| Messages never travel over broadcast | ok: `chatChanged` sends `{ id }` only |
| The multiplexer keeps the room's `changed` subscription when the chat unsubscribes | ok. It binds `{ event: "*" }`, which realtime-js 2.117.2 supports, and routes each ping by event. Tested. |
| Local polling | ok: 1.5 s `refetchInterval`, no pings |
| Close clears; prune removes old chats | ok: `→ closed` in `dispatch` (the only close path), and `openRoom` prunes past 24 h |
| The Supabase limit holds across instances | ok: an advisory lock per (room, author), then counts over 10 s and 60 s inside `add_room_message` |
| A guest who signs in keeps their messages | ok: `chat.reassign` beside `SWAP_PLAYER` in `handOverSeats`, and system lines are rewritten too |
| Secrecy | ok: no line carries a character. The theme line may come before its `showAt`, but `view.theme` already holds the theme. |
| i18n | `common.errors.rate_limited` is present in en, pt and ja |

## Defects

### Low: your own line can blink out when the server's copy replaces it

- **Where:** `src/features/chat/use-chat.ts`, the `messages` memo (`if (m.showAt <= now)`). `visibleChat` in `src/game/chat.ts` does the same.
- **Problem:** a player's text line is hidden until `showAt`. For a text line, `showAt` is the database's `now()`, while `now` is the browser's estimate of the app server's time, taken from the view's midpoint offset. That estimate can trail by up to half the round trip of the view request, and the room view is a large response. When the POST answer replaces the optimistic line (which showed at once), the saved copy can sit a few tens to hundreds of ms in the future. The line then disappears until the timer re-renders.
- **Fix:** gate only system lines by `showAt` (`m.system === null || m.showAt <= now`), in both places. Text lines have nothing to wait for.
