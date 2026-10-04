# Architecture

Next.js 16, React 19, Tailwind 4, TypeScript. pnpm, Biome, Vitest, Playwright.

## Code

- `src/game`: rules, pure. `reduce(room, event)` gives new room; `toView` hides what a player can't see (own card).
- `src/server`: actions. Load room, apply event, save only if nobody wrote first; else retry.
- `src/server/backend`: storage. Supabase keys set: `supabase` (Postgres, Realtime, Storage). Else `local` (memory, `.data/`, `local/fixtures.ts`). Builds with keys leave `local` out.
- `src/app`: pages, API. `src/features`: screens; `stage` routes them and plays scenes. `src/components/ui`: kit. `messages/<lang>`: texts (en, pt, ja).
- Motion: `m.*` only, under one strict `LazyMotion` (`domAnimation`). `layout`/`layoutId` need `<LayoutMotion>` around them (loads `domMax`). `motion/react` aliased to framer-motion barrel in `next.config.ts`.
- `data/`: old snapshot. Nothing reads it.

## Room

- Phases: lobby, voting or theming, picking, turns, finished.
- No cron: fetching a room applies due timeouts.
- Shows: scenes between steps (opening, theme and rule, draw, "for whom", cast) are beats with server times on `reveal` (`src/game/show-timing/`). Step clocks wait for show end, so every screen plays same frame. Client: `stageFrame` picks screen and backdrop, `useStageTimeline` seeks motion to server time. Lab: `/[locale]/dev/stage` (dev only).
- Sync: local polls 1 s. Supabase: Realtime ping (`src/lib/realtime.ts`, one channel per room, loaded on demand); poll 45 s joined, 10 s down.
- Cleanup: hourly `pg_cron` drops closed rooms after a day, idle ones after a week (0013).

## Themes

- `themes` table, cached 10 min per server; `active = false` hides one. Local: 60 fixture themes.
- 20 sets (`src/game/theme-sets.ts`); room's `themeSets` filter vote. Set examples: `example` 1–3 (0014, `/api/themes/examples`).
- Vote: 3 themes, 20 s (clock starts after opening), open vote. Server draws tie (wheel).
- Host mode (`theming`): host types theme (no set, no Random, no stats). 30 s, then vote.

## Characters and picks

- Library: `characters`, `character_names` (names, aliases, popularity per language), `origins`, `origin_labels`. Hand-fed: insert or update only. Browser searches whole library of its language (`/api/characters/library`); `/api/characters` until it loads.
- Draft: card saved quietly (`PUT /api/rooms/[code]/draft`, no ping). Timeout makes it the pick; new name creates character once. Empty card gets random.
- Random: theme's 20 most picked, weight picks + likes, ×0.5 per dislike, minus match picks (`theme_pick_scores`, 0006, 0007). Draw saved as draft.
- `theme_starters` (~5 per theme, 0011, rows in `supabase/seed/theme_starters.sql`, insert only): rule scene examples, base of hand (`/api/themes/[id]/picks`, 8 per theme, 5 shown, shuffled per viewer).
- Rule ✗: fiction-set themes get an athlete or musician, real-people sets a cartoon or game character, only when all the theme's starters are that set's kind; cross-cutting sets (world, jobs, family, quirks, looks, books) get ✓✓ only (`src/server/rule-examples.ts`).
- Trade-off: hand and typed names can duplicate someone's secret. Refusing would leak who holds what. Random still skips match picks, so it never deals you your own secret.

## People

- Guest: signed cookie (`src/server/auth/guest.ts`), no DB row. Proxy makes it.
- Account: Supabase Auth (Discord, Google; started server-side at `/auth/sign-in`) plus `profiles` row. Sign-in moves guest's matches, and seat (`SWAP_PLAYER`), to account.
- Match end: one record per player (`src/game/record.ts`), saved after response.

## Chat

- `room_messages` (0012; per-author limit inside insert function) via `/api/rooms/[code]/messages`. Server posts system lines at their scene. Pings carry ids only. Room close clears chat.

## Other

- SEO: `generateMetadata` per page (`src/server/seo.ts`, `messages/*/meta.json`). Share images: `opengraph-image.tsx` with `src/server/og`. `SITE_URL` sets domain.
- Tests: Vitest (engine, 300 random matches), Playwright (whole matches on a production build, two tests at a time, `@smoke` for the hub and one match; `DARE_SHOW_SCALE=0.25` speeds shows 4×, never clocks). CI runs them on every push with Biome, the typecheck and Knip (`.github/workflows/ci.yml`); Dependabot proposes dependency updates every Monday.
