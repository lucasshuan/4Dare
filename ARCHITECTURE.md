# Architecture

Next.js 16 + React 19 + Tailwind 4, all TypeScript.

## Folders

- `src/game`: the rules, pure. `reduce(room, event)` returns the new room. `toView` hides what each player can't see (like their own card).
- `src/server`: player actions (server actions). Each one loads the room, applies the event and saves only if nobody changed it first; if someone did, it tries again.
- `src/server/backend`: where things live. `local` = memory + the `.data` folder. `supabase` = Postgres, Realtime and Storage. Supabase key set? Supabase. Otherwise local.
- `src/app`: pages and API. `/api/rooms/[code]` returns the room as you may see it.
- `src/features`: the screens (home, lobby, vote, pick, turn, end).
- `src/components/ui`: buttons, cards, clock and such.
- `messages/<lang>`: the texts.
- `data`: themes and characters.

## Details

- Clock without cron: when someone fetches the room, the server applies the timeouts already due.
- Realtime: local fetches the room every 1 s. On Supabase a ping arrives through Realtime.
- Matches: when one ends, it becomes one record per player (`src/game/record.ts`), saved after the response. A guest is only a signed cookie (`src/server/auth/guest.ts`: id, name number, critter), never a database row; the proxy makes it on the first page. Accounts are Supabase Auth users (Discord/Google; `auth.users`, `auth.identities`, `auth.sessions`) with a row in `profiles`. Signing in hands the guest's matches to the account, and their seat too when it happens in a room (`SWAP_PLAYER`).
- Theme: a match starts with the `voting` phase: 3 themes, 8 s, open vote (players can change it until everyone voted); a tie is drawn on the server and the wheel on screen follows the server clock, so everyone sees the same spin. Then the theme stays up 3 s. In half the votes one of the 3 is made by Claude when `ANTHROPIC_API_KEY` is set; the rest come from the list (337 in `data/themes.json`). On Supabase the list is the `themes` table (`pnpm seed` loads it), read every 10 min; `active = false` turns a theme off.
- Theme sets: each theme has a `set` (20 of them in `src/game/theme-sets.ts`, names in `messages/*/common.json`; `theme_set` on Supabase, migration 0009). The room's `themeSets` say which ones the vote draws from; the AI picks one of them too. With `themeMode: "host"` the room goes to `theming` instead: the host types the theme (`set: null`, the same text in every language, no "Random" pick, no stats); after 30 s it falls back to a vote among every set. The create screen keeps the last setup in `localStorage`.
- Characters: `data/characters.json` has one entry per character, with name, aliases and popularity per language; `origin` is a key (`wd:Q8337` = Harry Potter, `job:actress`) translated in `data/origins.json`; `category` is a fixed list (anime, sports, mythology...) translated in `messages/*/common.json`. On Supabase they become `characters`, `character_names`, `origins` and `origin_labels`. Built by `scripts/library/build.ts`; popularity = median of 6 months of Wikipedia reads spread over 2 years, so a film or a World Cup doesn't skew it.
- Random pick: each match saves its theme (`themeId`) and what everyone picked; the button draws among the 20 most picked for that theme, weighted by count, leaving out the ones already picked in the match and the ones the clock picked. One available in the language is enough. After a draw the player says if they liked it: the weight is (picks + likes) × 0.5 per 👎, for that theme only. Local counts in memory from `.data/matches.jsonl` and `.data/pick-feedback.json`; Supabase uses `theme_pick_scores` over `popular_picks` and `pick_feedback` (migrations 0006 and 0007).
- Search and sharing: each page has `generateMetadata` (texts in `messages/*/meta.json`, helpers in `src/server/seo.ts`). Share images are drawn by `opengraph-image.tsx` files with `src/server/og` (fonts in `assets/fonts`). `SITE_URL` sets the domain in links.
- Tab: `useTabTitle` keeps "step · code · Ludodare" in a room and blinks the title and icon while a move waits on you in another tab.
- Tests: `vitest` on the engine (including 300 random matches) and `playwright` with whole matches.
