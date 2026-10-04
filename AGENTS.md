<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Database

- Supabase is the source of truth. `data/*.json` is an old snapshot: the app, the build and the tests never read it.
- Hand-fed tables: the library (`characters`, `character_names`, `origins`, `origin_labels`, its storage pictures) and the themes (`themes`, `theme_starters`). Never reset, truncate or bulk-delete them; back them up before a migration that touches them; change them by insert or update only (`active = false` turns a theme off).
- No seed, ever (`pnpm seed` once rewrote the library from `data/` and deleted what it lacked).
- Local mode (no Supabase keys: dev, unit tests, e2e) runs on the local backend's fixtures, never on `data/`.
- Everything else (rooms, matches, profiles, pick stats) may be lost; keep what you can.
- Migrations are the agent's job: run them when needed, without asking.

## AI

- No AI calls in the app or the build: no generated text, no API cost at runtime.

## Working

- Keep the context small: read only what the task needs, and cut command output to the lines that decide.
- Tests are slow: while working, run only the tests of what changed, plus `pnpm typecheck` and `pnpm lint`. The whole suite (`pnpm test`) and e2e (`pnpm test:e2e`) run once, at the very end of a phase, and only when really needed.

## Commits

Conventional Commits, in English: `type(scope): short imperative summary`.

- type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`; scope (optional): `game`, `server`, `ui`, `app`, `data`, `i18n`
- lowercase, no final period, at most 72 characters; a body only when the why is not obvious
- one commit per coherent piece of work; never commit `.env` files or secrets
