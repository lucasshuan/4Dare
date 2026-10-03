<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Database

- Supabase is the source of truth; `data/*.json` is an old snapshot the app, the build and the tests must not read (ROADMAP_BUILD.md removes the last uses)
- the character library (`characters`, `character_names`, `origins`, `origin_labels` and its pictures in storage) was fed by hand: never reset, truncate or bulk-delete it, and back it up before any migration that touches it
- never run `pnpm seed`: it rewrites the library from `data/` and deletes what the files lack
- everything else (rooms, matches, themes, profiles, pick stats) may be lost, but keep what you can
- migrations are the agent's job: run them whenever needed, without asking

## AI

- no AI calls in the app or the build: no generated text, no API cost at runtime

## Commits

Always the same pattern: Conventional Commits, in English.

    type(scope): short imperative summary

- type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`
- scope (optional): `game`, `server`, `ui`, `app`, `data`, `i18n`
- lowercase, no final period, at most 72 characters
- a body only when the why is not obvious
- one commit per coherent piece of work; never commit `.env` files or secrets
