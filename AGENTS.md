<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Database

- the project is in development; matches in the database are test data; the database follows `/data`
- migrations and seed are the agent's job: run them whenever needed, without asking
- losing data is not a problem yet, but keep what you can


## Commits

Always the same pattern: Conventional Commits, in English.

    type(scope): short imperative summary

- type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`
- scope (optional): `game`, `server`, `ui`, `app`, `data`, `i18n`
- lowercase, no final period, at most 72 characters
- a body only when the why is not obvious
- one commit per coherent piece of work; never commit `.env` files or secrets
