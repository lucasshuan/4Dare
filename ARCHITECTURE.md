# Architecture

Next.js 16, React 19, Tailwind 4, TypeScript. pnpm, Biome, Vitest, Playwright.

## Code

- `src/game`: rules, pure. `reduce(room, event)` gives new room; `toView` hides what a player can't see (own card).
- `src/server`: actions. Load room, apply event, save only if nobody wrote first; else retry.
- `src/server/backend`: storage. Supabase keys set: `supabase` (Postgres, Realtime, Storage). Else `local` (memory, `.data/`, `local/fixtures.ts`). Builds with keys leave `local` out.
- `src/app`: pages, API. `src/features`: screens; `stage` routes them and plays scenes. `src/components/ui`: kit. `messages/<lang>`: texts (en, es, ja, pt).
- Motion: `m.*` only, under one strict `LazyMotion` (`domAnimation`). `layout`/`layoutId` need `<LayoutMotion>` around them (loads `domMax`). `motion/react` aliased to framer-motion barrel in `next.config.ts`.
- `data/`: old snapshot. Nothing reads it.

## Room

- Phases: lobby, voting or theming, picking, turns, finished.
- No cron: fetching a room applies due timeouts.
- Shows: scenes between steps (opening, theme and rule, draw (skipped with 2 players), "for whom", cast) are beats with server times on `reveal` (`src/game/show-timing/`). Step clocks wait for show end, so every screen plays same frame. A guess's result and a pass are scenes too (`reveal` kinds `guess`, `pass`; `GuessScene`, full screen in the guesser's colour, no close): the next turn waits for them, and its handoff band covers their end. Only the answers reveal is a closable modal over a running step. Client: `stageFrame` picks screen and backdrop, `useStageTimeline` seeks motion to server time. Lab: `/[locale]/dev/stage` (dev only).
- Sync: local polls 1 s. Supabase: Realtime ping (`src/lib/realtime.ts`, one channel per room, loaded on demand); poll 45 s joined, 10 s down.
- Cleanup: hourly `pg_cron` drops closed rooms after a day, idle ones after a week (0013).

## Themes

- `whoami_themes` table (0018), cached 10 min per server; `active = false` hides one. Local: 60 fixture themes.
- 20 sets (`src/game/theme-sets.ts`); room's `themeSets` filter vote. Set examples: `example` 1–3 (0014, `/api/themes/examples`).
- Vote: 4 themes, 40 s by default (set per room; clock starts after opening), open vote; each first vote cuts the time split among the voters. Server draws tie (wheel).
- Host mode (`theming`): host types theme (no set, no Random, no stats). 30 s, then vote.

## Characters and picks

- Library: `characters`, `character_names` (names, aliases, popularity per language), `origins`, `origin_labels`. Hand-fed: insert or update only. Ids `wd-Q…` (Wikidata), `al-…` (AniList), `hand-<slug>` (added by hand, 0024; works `topic:<slug>`). Every language searches the whole library (0029): its popularity only orders it, unranked last; a missing name there is the English one. An unranked row stays out (`shadowed`) when a ranked one of its language shares name and category (one character under two ids). Spanish (`es`, 0025–0028) is a full language: names and tiers in `supabase/seed/library_es.sql`, themes' `es` column. Hand curation lives in `supabase/seed/library_*.sql` (other languages' characters, names and tiers, hand-added ones). Browser searches whole library of its language (`/api/characters/library`); `/api/characters` until it loads. Aliases include the other languages' names (`other_names`, 0021). A row shows the alias typed, one row per character (`shownName`); the pick keeps that name, its own joins the aliases for guesses (`knownAs`).
- Draft: card saved quietly (`PUT /api/rooms/[code]/draft`, no ping). Timeout makes it the pick; new name creates character once. Empty card gets random.
- Pictures: `character_images` (0017), many per character. Sent from the card (`POST /api/rooms/[code]/draft/image`), checked by Sightengine first (`src/server/moderation.ts`: sex in any style, nudity in photos, gore unless drawn), kept as `pending` when it can't tell (only its author sees it). The card's draft carries the chosen picture; the pick wears it for that match. One pick per player per picture, chosen (tray, upload) or kept (cover as shown); `characters.image_url` is the best active one (`score` = `bonus` (20 for the library's own) + chosen + √kept − 2 per report, 0022). Tray: `/api/characters/[id]/pictures`; 3 reports hide one (`/api/pictures/[id]/report`). Daily Vercel cron (`/api/cron/pictures`): checks `pending` again, deletes pictures of names that never became characters.
- Theme fit, per language (`rankTheme` in `src/server/theme-picks.ts`, 0022): starters' head start (fades as history grows), pickers once each (`whoami_theme_pickers`; hand or dice picks ×0.5), "fits the theme?" votes after a draw or a discovery (`whoami_fit_votes`), all read through `whoami_theme_stats`. Other languages' history ×0.25. Score = (picks + fits + head start) × fit chance² (votes from a prior); voted out at 3 "no"s and under ⅓. Feeds hand, random and clock fills.
- Random: theme's 20 best fits, weight score, minus match picks. Draw saved as draft (marked suggested).
- `whoami_theme_starters` (~5 per theme, 0011/0018/0022, insert only): `lang` `all` (shared, `supabase/seed/whoami_theme_starters.sql`) or a language's own (`_pt.sql`, `_ja.sql`), ranked first for its players, shared close behind. Rule scene examples (shared only), base of hand (`/api/themes/[id]/picks`, 8 per theme, 5 shown, shuffled per viewer).
- Rule ✗: fiction-set themes get an athlete or musician, real-people sets a cartoon or game character, only when all the theme's starters are that set's kind; cross-cutting sets (world, jobs, family, quirks, looks, books) get ✓✓ only (`src/server/rule-examples.ts`).
- Trade-off: hand and typed names can duplicate someone's secret. Refusing would leak who holds what. Random still skips match picks, so it never deals you your own secret.

## People

- Guest: signed cookie (`src/server/auth/guest.ts`), no DB row. Proxy makes it.
- Account: Supabase Auth (Discord, Google; started server-side at `/auth/sign-in`) plus `profiles` row. Sign-in moves guest's matches, and seat (`SWAP_PLAYER`), to account.
- Names: server sends them ready in reader's language (`?lang=` on routes, request locale in actions; `displayName`). `guestNumber` never leaves server; guest name lists load only in stage lab.
- Match end: one record per player (`src/game/record.ts`), saved after response.

## Chat

- `room_messages` (0012; per-author limit inside insert function) via `/api/rooms/[code]/messages`. Server posts system lines at their scene. Pings carry ids only. Room close clears chat.

## Other

- SEO: `generateMetadata` per page (`src/server/seo.ts`, `messages/*/meta.json`). Share images: `opengraph-image.tsx` with `src/server/og`. `SITE_URL` sets domain.
- Tests: Vitest (engine, 300 random matches), Playwright (whole matches on a production build, two tests at a time, `@smoke` for the hub and one match; `DARE_SHOW_SCALE=0.25` speeds shows 4×, never clocks). CI: `ci.yml` every push (Biome, types, Knip, all unit tests); `e2e.yml` smoke only when a push changes the app, every spec by hand ("all"). Vercel skips deploys of pushes touching only docs, tests, CI, scripts or migrations (`scripts/skip-deploy.sh`). Dependabot proposes dependency updates every Monday.
