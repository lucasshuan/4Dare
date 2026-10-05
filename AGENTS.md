<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Database

- Supabase is the source of truth. `data/*.json` is an old snapshot nothing reads; local mode (no keys: dev, unit tests, e2e) uses the local backend's fixtures.
- Hand-fed, so insert or update only, never reset, truncate or bulk-delete, and back up before a migration touching them: the library (`characters`, `character_names`, `origins`, `origin_labels`, the library's own `character_images` rows (`created_by` null) and their storage pictures) and the themes (`whoami_themes`, `whoami_theme_starters`; `active = false` turns one off). `characters.image_url` follows picks (0017): add or hide pictures, never write it.
- No seed, ever. Rooms, matches, profiles and pick stats may be lost; keep what you can.
- Migrations are yours, without asking. After one: `pnpm db:types` (or MCP `generate_typescript_types` into `src/server/backend/supabase/database.types.ts`, Biome-formatted) and the Supabase advisors.

## AI

- No AI calls in the app or the build. Only exception: Sightengine checks pictures players send (`src/server/moderation.ts`).

## Working

- Small context: read only what the task needs, cut output to what decides.
- Locally: `pnpm check` (Biome, types, knip: delete what it lists, or mark a planned export `/** @public */`) and `pnpm test:changed` (`origin/main` once committed). Never the whole suite or the e2e to wrap up: CI runs them (`ci.yml` every push; `e2e.yml` smoke when the app changes, every spec by hand with "all"). Red CI: read `get_job_logs`.
- A local e2e only for a changed browser flow unit tests can't reach, one spec: `pnpm test:e2e e2e/<name>.spec.ts` (cloud: `PW_CHROMIUM=/opt/pw-browsers/chromium-*/chrome-linux/chrome`).
- Vercel skips pushes of docs, tests, CI, scripts or migrations alone (`scripts/skip-deploy.sh`).

## Commits

- Conventional Commits in English: `type(scope): summary`, lowercase, no final period, at most 72 characters. Types `feat fix refactor test docs chore style perf`; optional scopes `game server ui app data i18n`. A body only when the why is not obvious.
- One commit per coherent piece of work; never `.env` files or secrets.
