# Phase 10 handoff

Working folder for ROADMAP Phase 10, "The match presents itself": building the approved "4Dare em cena" proposal into the game. Delete this folder when Phase 10 is done (WP12).

## Where things are

- **Approved design:** https://claude.ai/artifact/XwqNSpQWeXC1rrNyKKW4or. Its source is copied to `prototype/`; open `prototype/flow.html` in a browser to play it. It is a GSAP prototype; the game uses motion/react.
- **`plan.md`:** the final plan. It covers the architecture, the timing table, files, strings, work packages WP1–WP12 in five waves, tests, risks and a critique log. Read its header rules first.
- **`spec-a.md`, `spec-b.md`, `spec-c.md`:** scene-by-scene specs of the prototype compared with today's code.
- **`engine.md`, `server-data.md`, `ui-flow.md`, `ui-turn-lobby-style.md`:** maps of the code the plan is built on.
- **`plan-critique.md`:** the adversarial review of the plan. The plan's "Critique log" answers every point.
- **`reports/WPn.md`:** what each package built, its deviations from the plan and its requests to later packages. Read them before building on a package.
- **`briefs/`:** one brief per package, cut verbatim from the plan, the specs and the reports by `briefs/make.py`. An engineer reads only its brief.
- **`wave-workflow.js`:** the workflow script that builds packages from their briefs, or reviews committed ones (see "Next").

## Status (2026-10-04)

The work lives on the branch **`phase-10`**. Do not merge it into `main` or deploy it before the scene packages land: until then the live app shows today's vote result through the whole theme show and silently refuses "Ask" during the cast.

Done and committed:
- **Roadmap:** the Phase 10 items, plus the starters item (ticked).
- **`theme_starters`** (migration `0011` and `supabase/seed/theme_starters.sql`): about five famous characters per theme, 1666 rows over all 337 active themes on the hosted project. They back the ✓ examples and the hand. Three library entries were added by hand (insert only): `wd-Q14332`, `wd-Q2152060`, `wd-Q83186`.
- **WP1, engine:** shows timed by the server, 20 s vote, pick drafts, views. Re-reviewed in wave 2: no high or medium finding; the four lows are fixed (`fix(game): keep the vote through a queued cast…`).
- **WP2, design kit:** tokens, eases, backdrop, mini card, logo mark, every new string in en, pt and ja.
- **WP3, stage runtime and lab:** `stageFrame`, `stageLook`, `useStageTimeline`, the clock context, `RoomStage`, the lab at `/[locale]/dev/stage` and the screenshot runner.
- **WP5, server:** draft routes, `confirmCard`, rule examples from the starters, the hand route.
- **`build-roadmap` merged** (local mode on fixtures, themes from the table, realtime on demand, critters on the server). The lab takes its themes from `src/server/backend/local/fixtures.ts`.

Checks after the merge: `pnpm test` 281 passed, `pnpm typecheck` passes, `pnpm lint` clean apart from 3 old warnings in `globals.css`, `pnpm test:e2e` 13 of 13.

Open:
- **WP9a** (pick card) has not started. Its brief is ready.
- **WP3 and WP5 have had no review yet:** run one review each (below) when the next packages start.
- **Light turn screen contrast:** small muted text on the 20% step wash measures 4.42–4.45:1 on seats 1, 3 and 4 (needs 4.5). Fix it in WP4 or WP12.
- **Dark seat-ink near the glow:** about 2.8:1 near the backdrop's corner glows; WP8 keeps the "for whom" name centred.
- **Requests to later packages:** in each report's "Requests" section (the briefs carry them).

## Next

1. **WP9a** (pick card form), then **wave 3:** WP4 (room shell, header, history on the left, backdrop, guards) ∥ WP6 (chat server). WP9a can run beside them.
2. **Wave 4:** WP7 (opening, vote, theme and rule) ∥ WP8 (draw, for whom) ∥ WP9b (pick table, drafts, timeout) ∥ WP10 (your character, turn order) ∥ WP11 (chat UI).
3. **Wave 5:** WP12 (integration, live matches on desktop and phone, the screenshot matrix, docs, the final list for Jean).

How to run packages (the lean flow; the first wave-2 run took about 45 minutes per package, mostly an xhigh model working, its own e2e and screenshot matrices, and review loops):
1. `python3 docs/phase10/briefs/make.py WP4 WP6` writes the briefs, with the reports so far.
2. Start one dev server on 3100 with the e2e env (`NEXT_DIST_DIR=.next-e2e DARE_DATA_DIR=.data/e2e DARE_SHOW_SCALE=0.25`, Supabase variables empty). Every agent shares it; Playwright reuses it.
3. Start one Workflow run per package (a run gets only CPUs − 2 agent slots), with `scriptPath: "docs/phase10/wave-workflow.js"` and args such as `{"mode": "build", "wps": ["WP4"], "others": ["WP6"], "env": "<machine notes>", "extra": {"WP4": "<lead notes>"}}`. Engineers run at effort high, verify only their unit tests, typecheck, lint and a few screenshots, and write a short report.
4. When an engineer returns: run `pnpm typecheck`, `pnpm lint` and the package's own test files, read the report, commit the package, tick its ROADMAP items, push.
5. Then one review per committed package in the background: `{"mode": "review", "wps": ["WP4"], "commits": {"WP4": "<sha>"}}`. Fix what it confirms in a small `fix(...)` commit.
6. Tests (Jean's call): no e2e and no whole unit suite until the end of Phase 10. WP12 runs `pnpm test`, `pnpm test:e2e` and the screenshot matrix once, and fixes what they find.

## Decisions Jean made (do not reopen)

**Screens and flow**
- The lobby stays as it is; it only gains the chat.
- **Chat** (lobby and match):
  - A tab at the bottom right, about 16 px from the edge and 340 px wide. Folded it is 56 px tall (60 px on phones).
  - A click on its top opens it upward over the screen to about 62% of the height (66% on phones); another click folds it.
  - Unread messages turn the tab blue, with a count and the senders' faces, a 3 s bubble, and a nudge until it is opened.
  - No who's-in-the-room row, no emoji shortcuts; messages and system lines only.
  - On phones it is a bottom bar with the last message.
- **History** exists only during turns. A button left of the theme opens a full-height bar on the left; it pushes the screen on desktop and covers it over a scrim on phones.

**Vote and draw**
- The theme vote lasts 20 s. "Now, choose a theme together" shows alone for 0.8 s, rises into the title, the cards are dealt, then the clock starts.
- **Draw:** the avatars hop into the butter-yellow 4 of the logo, it shakes like a jar and spits out a slip. The slip comes out straight, at its final size and place, and becomes the "for whom" screen. No "Para Leo" / "De Rafa" badges anywhere.

**Picking**
- The card is the form: no "Create" button, and a "New!" seal for names not in the library.
- A hand of suggestions sits under the card, with a big Random beside Confirm.
- On timeout the card's draft is used; random only for an empty card.
- When confirmed, the card grows to 1.08×, straight and centred, from its top.
- The backgrounds are coloured per step, and by the target player while picking.
- `theme_starters` is the base for the ✓ examples and the hand. Random keeps using play history only.

**Timing and defaults**
- The fixed scenes come to about 42 s on a room's first match and 21 s later. Jean tunes the numbers by playing; each scene's numbers live in `src/game/show-timing/`.
- The open questions in `plan.md` section 8 keep their defaults.

## Jean's working rules

- **Language:** talk to Jean in Portuguese, short and direct. Everything written in the repo is in English.
- **Commits:** commit each finished, verified package right away, in Conventional Commits (AGENTS.md). Subagents never commit.
- **ROADMAP:**
  - Every request becomes one short item, ticked in the commit that finishes it.
  - Repo docs stay short and casual.
- **Avatars:** every player name shows its avatar beside it, phones included (`PlayerName` / `useWithNames` in `src/components/ui/player-name.tsx`).
- **Home carousel:** keep its look (game cards with animated previews).
- **Library and database** (AGENTS.md):
  - The library is protected: inserts only.
  - Never run `pnpm seed` or `pnpm setup:supabase`, and never use Docker.
  - Run migrations one at a time with the Supabase MCP, project `zooqjsrhjupqghuuipon`.
- **No AI:** no AI calls in the app or the build.
- **`tsconfig.json`:** `next dev` with a new `NEXT_DIST_DIR` rewrites it. Reuse `.next-e2e`, or restore the file by hand.
- **ROADMAP_BUILD.md:** that work (Supabase as the only data source, lighter bundles) lands on `main` in parallel. Merge `main` into `phase-10` now and then, and stay out of its areas.

## Cloud setup

- **Environment:** set the variables of `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `POSTGRES_URL_NON_POOLING`, …) in the cloud environment. Never commit them.
- **Supabase MCP:** connect it for migrations and SQL checks.
- **Node:** the container ships Node 22 first on `PATH`; the repo pins 24. `nvm install 24` (nvm lives in `/opt/nvm`), then prefix commands with `export PATH=/opt/nvm/versions/node/v24.21.0/bin:$PATH`.
- **Playwright:** don't install browsers; set `PW_CHROMIUM=/opt/pw-browsers/chromium` and `playwright.config.ts` launches that binary instead of Edge.
- **Without Supabase env vars** the app, unit tests and e2e run in local mode; check Supabase-side SQL read-only with the MCP.
- **e2e timing:** e2e needs a calm machine. Under heavy CPU load the timing-based tests fail for that reason alone. `DARE_SHOW_SCALE=0.25` speeds up the shows in e2e (only the shows, never the clocks).
