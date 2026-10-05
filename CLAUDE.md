<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Rules

- Style: caveman ultra (`caveman-pt`) in own words, thinking, subagent prompts and returns (ask subagents for it). Repo text (code, comments, docs, commits): plain prose.
- Context min: read only what task needs, cut output to deciding lines. Facts: `ARCHITECTURE.md`.
- Hand-fed: library (`characters`, `character_names`, `origins`, `origin_labels`, library's `character_images` rows (`created_by` null) + their storage pics) and themes (`whoami_themes`, `whoami_theme_starters`). Insert/update only, never reset/truncate/bulk-delete, back up before a migration touching them. Never write `characters.image_url`: add/hide pictures. No seed, ever. Rest (rooms, matches, profiles, pick stats) losable.
- Migrations: run them, no asking. After: `pnpm db:types` (or MCP `generate_typescript_types` → `src/server/backend/supabase/database.types.ts`, Biome) + Supabase advisors.
- No AI calls in app/build; only Sightengine (player pictures).
- Verify: `pnpm check` + `pnpm test:changed` (`origin/main` once committed). Whole suite and e2e: CI only; red → `get_job_logs`. Local e2e only for a changed browser flow units can't reach, one spec: `pnpm test:e2e e2e/<name>.spec.ts` (cloud: `PW_CHROMIUM=/opt/pw-browsers/chromium-*/chrome-linux/chrome`).
- knip findings: delete, or `/** @public */` on a planned export.
- Commits: Conventional, English, `type(scope): summary`, lowercase, no period, ≤72 chars. Types feat fix refactor test docs chore style perf; scopes (opt) game server ui app data i18n. Body only if why unclear. One per coherent change; never `.env`/secrets.
