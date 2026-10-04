# Build roadmap

A lighter build, a smaller bill, and Supabase as the only source of data. Ticked item = done and committed.

Where we start (production build of `36fa787`, 2026-10-03):

- Server functions weigh 11–21 MB; `data/characters.json` (7.9 MB) is inside almost all of them
- The Anthropic SDK is inside every function, and half the theme votes call Claude Opus
- The home page loads 1.49 MB of JS (~430 KB gzip) and 80 KB gzip of CSS, 64 KB of it the Japanese font
- A signed-in player in a room costs 1 Auth call + 2 database reads every 10 s, even with realtime on

After the first quick wins (same day): API functions ~2 MB, pages ~9 MB, share images ~7 MB; no `data/` file and no Anthropic SDK in any trace.

## Phase 1 — Supabase is the law

- [x] AGENTS.md: the character library is protected, `pnpm seed` is off, no AI in the app
- [x] The app never reads `data/*.json`: library, search and themes come from Supabase, local mode from `local/fixtures.ts` (43 characters, 60 themes)
- [x] Library index per language read from the database and cached (an hour per server, a day on the CDN), not built from the files
- [x] `/api/characters/extras` stops pulling the library in
- [x] Search before the index arrives uses `search_characters` in the database
- [x] `data/` out of every server function (`outputFileTracingExcludes`)
- [x] Themes only from the `themes` table, no bundled list (read as a server starts; three fallback themes until it lands)
- [x] Theme set examples (hover) from the `themes` table, not a hand copy (`example` column, migration 0014 with a backup in `backup.themes_before_0014`)
- [x] Tests stop importing `data/*.json`
- [x] `.vercelignore` leaves `data/` out of the deploy; Biome blocks `data/` imports in `src/`
- [x] `pnpm seed` retired (it deleted rows the files lacked); library and theme changes go straight to the database, insert or update only; `pnpm test-rooms` reads Supabase
- [x] Local mode (dev and e2e without Supabase) decided: small fixtures in the local backend (Jean, 2026-10-04); with `.env.local` dev uses Supabase as before
- [x] `themes` and `theme_starters` protected like the library in AGENTS.md (Jean, 2026-10-04)

## Phase 2 — No AI in the app

- [x] AI theme drawing removed (`drawWithAI` called Claude Opus in half the votes)
- [x] `@anthropic-ai/sdk` out of the dependencies
- [x] `ANTHROPIC_API_KEY` out of `.env.example` and the docs
- [ ] `ANTHROPIC_API_KEY` deleted from the Vercel env (dashboard)
- [x] No AI package left in the app, the build or the scripts

No AI theme was ever saved (0 rows with source `ai`).

## Phase 3 — Lighter server functions

- [x] Local backend never in the production bundle: one entry (`@/server/backend/local`), swapped for a stub by `turbopack.resolveAlias` when the build has the Supabase keys (no fixture left in the server output)
- [x] Japanese share-image font cut to the glyphs the images use (3.8 MB → 86 KB, `pnpm og:font`), with a test that checks coverage
- [x] `getClaims()` instead of `getUser()` on every request: local JWT check, no Auth round trip
- [x] Every function under ~3 MB of app code (checked with the build's `.nft.json` traces): pages 2.7–2.96 MB, share images 0.87 MB, API 0.3–0.6 MB. Locally the traces also hold sharp's libvips (18.7 MB); Next leaves it out on Vercel (`NOW_BUILDER`)

## Phase 4 — Lighter pages

Rule: switching language or opening a menu never waits on a download; fonts swap in when ready.

- [x] Zen Maru Gothic only on Japanese pages: en/pt pages link 17 KB gzip of CSS instead of 81 KB (its 245 `@font-face` are a chunk of `ja-font.tsx`, linked only where it renders)
- [x] Critter avatars as SVG from a cached route (`/api/critter/<seed>/<rrggbb>`), no DiceBear in the browser: home 391 → 361 KB gzip of JS
- [x] Browser Supabase only for realtime, loaded on demand; OAuth starts on the server (`/auth/sign-in`): home 457 → 391 KB gzip of JS
- [x] Menus, dialogs and selects loaded on demand (Base UI + floating-ui, ~240 KB): the header's (language, user menu, match badge) load when idle or when reached for, behind look-alikes (`useDeferred`); the game's name and thumbnail left the game select's module. Home 361 → 297 KB gzip of JS, no Base UI. Screens built around one (rooms filters, lobby, settings) keep theirs
- [ ] `LazyMotion` + `m`; full motion features only where `layoutId` is used
- [ ] Guest names resolved on the server (−24 KB)
- [ ] Each page gets only its message namespaces
- [x] `/new` and `/rooms` static (query read in the browser): served from the CDN, no function per visit
- [x] Game sounds re-encoded mono 80 kbps (371 KB → 118 KB)
- [ ] Home under ~250 KB gzip of JS

## Phase 5 — Cheaper at scale

- [x] Room poll every 45 s while its realtime channel is joined, 10 s only when it drops; a join or rejoin refetches once (pings sent meanwhile are lost); one shared channel per topic
- [x] `/api/me/match` every 60 s with no match, 30 s during one (no ping carries it; coming back to the tab refetches), was 15 s
- [x] Room list reads only what it shows, not every room's whole state: six JSON paths instead of a new column (`src/server/listing.ts`; a test fails if `toPublicRoom` starts reading more)
- [x] ~~`player_ids` column with a GIN index for "rooms I sit in"~~ not needed: the query takes 1.4 ms on the `updated_at` index, and the hourly cleanup keeps the table small
- [x] Old rooms deleted by `pg_cron` (hourly: closed a day ago, or a week without a write; migration 0013, applied)
- [ ] The `gone` beacon no longer keeps a function alive for 5 s
- [x] Speed Insights with a `sampleRate` (half the visits)
- [ ] Vercel project checked: Fluid compute, Node version, memory

## Phase 6 — Cleanup

- [ ] Old-data compatibility removed: `withoutLegacy`, initial/person avatars, "absent in older rooms" fields, old room list defaults, old picture keys, `ANON_KEY`/`SERVICE_ROLE_KEY` fallbacks (rooms reset and old avatars migrated first)
- [x] Unused packages removed: `nanoid`, `@iconify-json/circle-flags`, `@iconify-json/logos`
- [x] `engines.node` set to Vercel's Node (24.x), `@types/node` to match
- [x] Patch updates: next-intl, react-query, lucide
- [ ] React 19.3, Biome 2.5, motion 14 and TypeScript 7 after Phase 10, changelogs first
- [x] Unused `public/brand/logo-dark.svg` removed
- [ ] AI leftovers in the game files after Phase 10: `ThemeStore.add`, `.data/themes-ai.json`, `THEME_SETS[].about`, old comments
