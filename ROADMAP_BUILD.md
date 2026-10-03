# Build roadmap

A lighter build, a smaller bill, and Supabase as the only source of data. Ticked item = done and committed.

Where we start (production build of `36fa787`, 2026-10-03):

- Server functions weigh 11–21 MB; `data/characters.json` (7.9 MB) is inside almost all of them
- The Anthropic SDK is inside every function, and half the theme votes call Claude Opus
- The home page loads 1.49 MB of JS (~430 KB gzip) and 80 KB gzip of CSS, 64 KB of it the Japanese font
- A signed-in player in a room costs 1 Auth call + 2 database reads every 10 s, even with realtime on

## Phase 1 — Supabase is the law

- [x] AGENTS.md: the character library is protected, `pnpm seed` is off, no AI in the app
- [ ] The app never reads `data/*.json`: library, search, themes and local mode come from Supabase
- [ ] Library index per language read from the database and cached (ISR/CDN), not rebuilt by a function on every cold start
- [ ] `/api/characters/extras` stops pulling the library in
- [ ] Search before the index arrives uses `search_characters` in the database
- [ ] Themes only from the `themes` table, no bundled list
- [ ] Theme set examples (hover) from the `themes` table, not a hand copy
- [ ] Tests stop importing `data/*.json`
- [ ] `.vercelignore` leaves `data/` out of the deploy; Biome blocks `data/` imports in `src/`
- [ ] `pnpm seed` retired for the library (it deletes rows the files lack); library changes go straight to the database, insert or update only
- [ ] Local mode (dev and e2e without Supabase) decided: small fixtures in test code, or Supabase for dev too

## Phase 2 — No AI in the app

- [ ] AI theme drawing removed (`drawWithAI` called Claude Opus in half the votes)
- [ ] `@anthropic-ai/sdk` out of the dependencies
- [ ] `ANTHROPIC_API_KEY` out of `.env.example`, the docs and the Vercel env
- [ ] AI only in separate scripts (devDependencies), run by hand

No AI theme was ever saved (0 rows with source `ai`).

## Phase 3 — Lighter server functions

- [ ] Local backend never in the production bundle
- [ ] Japanese share-image font cut to the glyphs the images use (3.8 MB → tens of KB), with a test that checks coverage
- [ ] `getClaims()` instead of `getUser()` on every request: local JWT check, no Auth round trip
- [ ] Every function under ~3 MB of app code (checked with the build's `.nft.json` traces)

## Phase 4 — Lighter pages

Rule: switching language or opening a menu never waits on a download; fonts swap in when ready.

- [ ] Zen Maru Gothic only on Japanese pages (245 `@font-face` blocking every page today)
- [ ] Critter avatars as SVG from a cached route, no DiceBear in the browser (152 KB)
- [ ] Browser Supabase only for realtime, loaded on demand; OAuth starts on the server (−110 KB)
- [ ] Menus, dialogs and selects loaded on demand (Base UI + floating-ui, ~240 KB)
- [ ] `LazyMotion` + `m`; full motion features only where `layoutId` is used
- [ ] Guest names resolved on the server (−24 KB)
- [ ] Each page gets only its message namespaces
- [ ] `/new` and `/rooms` static (query read in the browser)
- [ ] Ticking clock sound re-encoded (232 KB → ~60 KB)
- [ ] Home under ~250 KB gzip of JS

## Phase 5 — Cheaper at scale

- [ ] Room poll every 30–60 s while realtime is connected, 10 s only when it drops
- [ ] `/api/me/match` polled by the same rule
- [ ] Room list reads a small `listing` column, not every room's whole state
- [ ] `player_ids` column with a GIN index for "rooms I sit in"
- [ ] Old rooms deleted by `pg_cron`
- [ ] The `gone` beacon no longer keeps a function alive for 5 s
- [ ] Speed Insights with a `sampleRate`
- [ ] Vercel project checked: Fluid compute, Node version, memory

## Phase 6 — Cleanup

- [ ] Old-data compatibility removed: `withoutLegacy`, initial/person avatars, "absent in older rooms" fields, old room list defaults, old picture keys, `ANON_KEY`/`SERVICE_ROLE_KEY` fallbacks (rooms reset and old avatars migrated first)
- [ ] Unused packages removed: `nanoid`, `@iconify-json/circle-flags`, `@iconify-json/logos`
- [ ] `engines.node` set to Vercel's Node, `@types/node` to match
- [ ] Safe updates: patches, React 19.3, Biome 2.5; motion 14 and TypeScript 7 after reading their changelogs
- [ ] Unused `public/brand/logo-dark.svg` removed
- [ ] `tsconfig.json` without the `.next-e2e` paths
