# Phase 10 handoff

Working folder for ROADMAP Phase 10, "The match presents itself": building the approved "4Dare em cena" proposal into the game. Delete this folder when Phase 10 is done (WP12).

## Where things are

- **Approved design:** https://claude.ai/artifact/XwqNSpQWeXC1rrNyKKW4or. Its source is copied to `prototype/`; open `prototype/flow.html` in a browser to play it. It is a GSAP prototype; the game uses motion/react.
- **`plan.md`:** the final plan. It covers the architecture, the timing table, files, strings, work packages WP1–WP12 in five waves, tests, risks and a critique log. Read its header rules first.
- **`spec-a.md`, `spec-b.md`, `spec-c.md`:** scene-by-scene specs of the prototype compared with today's code.
- **`engine.md`, `server-data.md`, `ui-flow.md`, `ui-turn-lobby-style.md`:** maps of the code the plan is built on.
- **`plan-critique.md`:** the adversarial review of the plan. The plan's "Critique log" answers every point.
- **`reports/WPn.md`:** what each package built, its deviations from the plan and its requests to later packages. Read them before building on a package.
- **`wave-workflow.js`:** the workflow script that runs one wave (see "Next").

## Status (2026-10-03)

The work lives on the branch **`phase-10`**. Do not merge it into `main` or deploy it before the scene packages land. With only WP1 in, the live app shows today's vote result through the whole theme show and silently refuses "Ask" during the cast.

Done and committed:
- **Roadmap:** the Phase 10 items, plus the starters item.
- **`theme_starters`** (migration `0011` and `supabase/seed/theme_starters.sql`):
  - About five famous, common characters per theme. They are the base for the ✓ examples and the pick hand, kept apart from picks and likes.
  - Applied and seeded on the hosted project: 1666 rows covering all 337 active themes.
  - Three library entries were added by hand (insert only): Tyrannosaurus rex `wd-Q14332`, Rex from Toy Story `wd-Q2152060`, Romeo and Juliet `wd-Q83186`.
- **WP1, engine** (`feat(game): server-timed shows, 20 s theme vote and pick drafts`): shows timed by the server, 20 s vote, pick drafts, views. See `reports/WP1.md`.
- **WP2, design kit** (`feat(ui): stage design kit, step backdrops and phase 10 strings`): tokens, eases, backdrop, mini card, logo mark, every new string in en, pt and ja. See `reports/WP2.md`.

Checks at hand-off:
- `pnpm test`: 191 passed.
- `pnpm typecheck`: passes.
- `pnpm lint`: clean apart from 3 old warnings in `globals.css`.
- `pnpm test:e2e`: 13 of 13 passed.

WP1's adversarial review was stopped before it reported, so no WP1 findings were recorded. WP2's review passed with two low findings, carried below.

Open low findings:
- **Light turn screen contrast:** small muted text sits on the 20% step wash ("Play 1", the ask helper, the 0/140 counter). It measures 4.42–4.45:1 on seats 1, 3 and 4, under the 4.5:1 it needs. Fix it in WP4 or WP12 with a darker muted token on washes or text on a surface.
- **Dark seat-ink near the glow:** in dark mode, seat-ink drops to about 2.8:1 near the backdrop's corner glows. WP8 keeps the "for whom" name centred, away from them.
- **Requests from WP1:** see "Requests for WP12 and later packages" in `reports/WP1.md`.

## Next

The waves are batches of packages. Packages in the same wave run in parallel; each wave builds on the one before.

1. **Wave 2:** WP3 (stage runtime and lab) ∥ WP5 (server: drafts, confirm, rule examples, hand) ∥ WP9a (pick card form).
2. **Wave 3:** WP4 (room shell, header, history on the left, backdrop, guards) ∥ WP6 (chat server).
3. **Wave 4:** WP7 (opening, vote, theme and rule) ∥ WP8 (draw, for whom) ∥ WP9b (pick table, drafts, timeout) ∥ WP10 (your character, turn order) ∥ WP11 (chat UI).
4. **Wave 5:** WP12 (integration, live matches on desktop and phone, docs, the final list for Jean).

How to run a wave: use the Workflow tool with `scriptPath: "docs/phase10/wave-workflow.js"` and args such as:

```json
{
  "wave": 2,
  "wps": ["WP3", "WP5", "WP9a"],
  "e2e": true,
  "extra": {
    "WP5": "theme_starters already exists and is seeded (plan 1.6); only read it."
  }
}
```

After each wave:
1. Read the reports and the review files.
2. Run the checks yourself.
3. Commit one commit per package.
4. Tick the ROADMAP items it finished.
5. Push `phase-10`.

A quick re-review of WP1 before wave 2 is cheap insurance: run only the review part, or ask a reviewer agent with `plan.md` and `reports/WP1.md`.

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
- **Playwright:** install it with `pnpm exec playwright install chromium` before e2e.
- **e2e timing:** e2e needs a calm machine. Under heavy CPU load the timing-based tests fail for that reason alone. `DARE_SHOW_SCALE=0.25` speeds up the shows in e2e (only the shows, never the clocks).
