<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Database

- Supabase is the source of truth. `data/*.json` is an old snapshot: the app, the build and the tests never read it.
- Hand-fed tables: the library (`characters`, `character_names`, `origins`, `origin_labels`, the library's own rows of `character_images` (`created_by` null), its storage pictures) and the themes (`themes`, `theme_starters`). Never reset, truncate or bulk-delete them; back them up before a migration that touches them; change them by insert or update only (`active = false` turns a theme off). `characters.image_url` is the best picture of `character_images` and moves with players' picks (0017): change a cover by adding or hiding pictures, not by writing it.
- No seed, ever (`pnpm seed` once rewrote the library from `data/` and deleted what it lacked).
- Local mode (no Supabase keys: dev, unit tests, e2e) runs on the local backend's fixtures, never on `data/`.
- Everything else (rooms, matches, profiles, pick stats) may be lost; keep what you can.
- Migrations are the agent's job: run them when needed, without asking.
- After a migration: refresh the types (`pnpm db:types`, or the Supabase MCP `generate_typescript_types` written to `src/server/backend/supabase/database.types.ts` and formatted with Biome) and run the Supabase advisors (security and performance).

## AI

- No AI calls in the app or the build: no generated text, no API cost at runtime.
- One exception: pictures players send go through Sightengine's image moderation (`src/server/moderation.ts`), on its free plan or a paid plan the owner chose. Nothing else calls it.

## Working

- Keep the context small: read only what the task needs, and cut command output to the lines that decide.
- Tests are slow: while working, run only the tests of what changed, plus `pnpm typecheck` and `pnpm lint`. The whole suite (`pnpm test`) and e2e (`pnpm test:e2e`) run once, at the very end of a phase, and only when really needed; a browser check mid-phase is `pnpm test:e2e:smoke` (the hub and one match).
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, `pnpm knip`, the unit tests and the e2e smoke on every push. When it fails, read the failed job's log (GitHub MCP `get_job_logs`) rather than rerunning everything locally.
- `pnpm knip` lists unused files, exports and dependencies: delete them, or keep a planned export with a `/** @public */` comment.

## Commits

Conventional Commits, in English: `type(scope): short imperative summary`.

- type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`; scope (optional): `game`, `server`, `ui`, `app`, `data`, `i18n`
- lowercase, no final period, at most 72 characters; a body only when the why is not obvious
- one commit per coherent piece of work; never commit `.env` files or secrets
