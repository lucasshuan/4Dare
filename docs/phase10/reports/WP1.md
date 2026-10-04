# WP1 report: engine (shows, vote 20 s, drafts, view)

## Files

Created:
- `src/game/show-timing/{opening,theme,draw,pick,cast,index}.ts`: section 2 defaults. Each scene file exports its lengths (`OPENING`, `THEME`, `DRAW`, `PICK`, `CAST`) and its marks (`OPENING_MARKS`, `THEME_MARKS`, `DRAW_MARKS`, `CAST_MARKS`). `index.ts` merges them into `SHOW_TIMING` and `SHOW_MARKS` (key names exactly as in plan 1.4). From wave 4 on, each scene WP owns its own file.

Changed:
- `src/game/types.ts`: `VOTE_SECONDS = 20`, `MAX_CHARACTER_NAME = 60`, re-export of `SHOW_TIMING`/`SHOW_MARKS`, `BEAT_KINDS`/`BeatKind`/`Beat`/`ShowKind`, `ExampleCard`/`RuleExamples`, `Reveal` (`beats`, `first`, `rule`, `prev`), `ThemeVote.examples`, `PickDraft`, `Assignment.draft`, the `START.examples`/`DRAFT`/`TIMEOUT.examples|drafted` events, `Ctx.showScale`, `ShowView` (replaces the bare `theme` member of `RevealView`), `PickView.draft`, and doc updates (`pickedById`, `pick`, `playStartedAt`). `REVEAL_TIMING` keeps only `answers*`/`guess*`.
- `src/game/engine.ts`: `isShow`, `stage()`, `startStep` holds the clock for any show, opening in `beginTheme`/`beginTheming`/`beginVote`, `showTheme`, `startTurns(how)`, `beginMatch` keeps the reveal and no longer starts the clock, `finish` drops a running show, `leave` back to the lobby clears the reveal, the `DRAFT` reducer, `PICK` clears the draft, the picking `TIMEOUT` order (drafted, then provisional, then fallback), and the theming → vote fallback with `[entrance]` only.
- `src/game/view.ts`: `ShowView` (back-compat for legacy `theme` reveals without beats; `prev` only while it runs), `voteView` unchanged (it already follows `kind === "theme"`), `pick()` during picking **and** a running cast, `PickView.draft` for the picker only, `pickedById` for everyone from picking on, your own included.
- `src/game/test-utils.ts`: `skipShow()`, `Game.showScale`, `start()` lets the opening play before voting.
- Tests: `engine.test.ts`, `view.test.ts`, `simulation.test.ts`, `record.test.ts`, `src/server/server.test.ts` (timing fixes only).
- `src/server/rooms.ts`: `ctx()` adds `showScale: Number(process.env.DARE_SHOW_SCALE) || 1`.
- Compile fixes: `src/features/room/reveal-overlay.tsx` shows only `answers`/`guess`. `src/features/vote/vote-screen.tsx` reads the tie spin length from the show (see deviations).
- e2e: `e2e/helpers.ts`, `e2e/theme.spec.ts`, `e2e/tab.spec.ts`, `playwright.config.ts` (`DARE_SHOW_SCALE: "0.25"`).
- `PRODUCT.md`: "(the theme vote always gets 20 s, picking 120 s)".

## What was built

- **Shows.** `Reveal` now carries three shows: `opening`, `theme` and `cast`. Their beats sit back to back with absolute server times. `stage()` queues a new show after a running one, `startsAt = max(now, running.until)`, and keeps the running one as `prev` (one level deep only). It scales beats by `ctx.showScale` and drops beats of length 0.
  - Opening: `[curtain, intro|round, entrance(vote|theming)]`, with `n = round + 1` and `first = round === 0`. The theming → vote fallback stages `[entrance(vote)]` only.
  - Theme show: `[tie_spin?, settle?(voted only), theme(withRule|alone), rule?(first match: cards|sentence), draw, target, entrance(pick)]`. On the first match `reveal.rule` holds the chosen option's cards, or `null` for a typed theme or a theme without examples. On later matches there is no `rule` key.
  - Cast: `[picked(confirmed first|later, or timeout), received, order, entrance(turn)]`. `playStartedAt` is the cast's `until`. Turn 1's clock starts there, and `ASK` gets `too_early` through the existing `guardStep`.
- **Clock.** `startStep` waits for any show, in any phase. A vote that closes during the opening queues the theme show at `opening.until`, and the pick clock starts at the theme show's `until`. Picking during both shows queues the cast behind the theme show, with `prev = theme` and `prev.prev = null`.
- **Drafts.** The `DRAFT` reducer checks, in this order: `wrong_phase` (not picking) → `not_member` → `already_done` → `wrong_phase` past the deadline → `invalid_input` (name ≤ 60, `characterId` ≤ 200, `imageUrl` ≤ 500, `newId` ≤ 200, runtime type checks because the route sends JSON). `null` empties the card, and `PICK` clears the draft. On a picking `TIMEOUT`, each card without a character gets, in order:
  1. `e.drafted[pickerId]`;
  2. otherwise a provisional character, if the draft name is non-empty after trimming. Its id is `newId ?? draft-<code>-<round>-<target>`, its lang is the picker's, `origin` is null, and it keeps the draft's `imageUrl`. It is not marked `auto`;
  3. otherwise the next fallback (`auto`), skipping ids already used (drafts included).

  Then every draft is cleared and the cast starts with `picked.timeout`.
- **View.** Shows go through as `ShowView`. Everyone gets `pickedById` from picking on. The pick table stays in the view during the cast. The draft only goes to its picker's own `PickView`, without `newId`.

## Deviations from the plan

1. **`vote-screen.tsx`:** the tie spin length comes from the show's `tie_spin` beat (`until − startsAt`) instead of `SHOW_TIMING.tieSpin`. It stays right at `DARE_SHOW_SCALE=0.25` and needs no import. A legacy theme reveal has no `tie_spin` beat, so it doesn't spin.
2. **Provisional character on timeout:** it needs a non-empty trimmed name. The name is trimmed and runs of spaces squashed. A draft with a `characterId` but an empty name (and no `drafted` entry) falls back to the pool. Per the 1.5 table, a draft with a `characterId` always carries a name (the full name or the typed one), so this case doesn't happen in practice. It avoids a character with an empty name.
3. `stage()` returns the show's `until`. `startTurns` uses it for `playStartedAt`, so no non-null assertion is needed.
4. `START`/theming-`TIMEOUT` `examples`, when given, must have `THEME_OPTIONS` entries, else `invalid_input`. The vote stores a `structuredClone`.
5. `PickView.draft` is `null` once the card is confirmed.
6. When a match ends during picking (someone leaves), drafts stay in state. They are harmless: no view exposes them after picking, and `backToLobby` wipes assignments.
7. `test-utils` `start()` now lets the opening finish (`skipShow`) before voting, so test votes land inside the vote clock. Tests that vote *during* the opening do it explicitly.
8. `e2e/helpers.ts` had a Biome format error at HEAD (`startMatch`). I fixed it, since I own the file.
9. `voteAll` also checks that each card is enabled (15 s), as the plan says. It no longer waits for any heading.
10. **`newPlayer()` in `e2e/helpers.ts` now closes the contexts that earlier tests opened** before it opens a new one. It tracks them by `test.info().testId`. This was not in the plan. Before, every test's pages stayed open and kept polling `/api/rooms/*` for the rest of the run. In a full run, about 30 contexts were still alive by the rooms specs, the dev server averaged 3.2 s per request (250 of 842 requests over 3 s), and a lobby-only test (`rooms.spec` "one room at a time") timed out every time in full runs while passing alone in 9.5 s. With the change the full suite is green and twice as fast (4.3 min against 9.2 min).

## Verification

- `pnpm test`: **14 files, 174 tests passed** at first. The final rerun, with WP2's new tests in the tree, gave **17 files, 191 tests passed**. The game suites alone have 120 tests, including:
  - new engine tests for opening variants, the vote during the opening (queue + `prev`), theme show variants (first/later × voted/typed × tie × cards/sentence), cast confirmed/timeout, `too_early` before the cast's end, the first active player, `GIVE_UP` during the cast, the match ending mid-show, `LEAVE` back to the lobby during the opening, `SWAP_PLAYER` keeping shows and drafts, legacy theme reveals, `showScale`, and the draft errors/clear/timeout order/record;
  - new view tests;
  - the simulation, which now checks every show is contiguous with lengths from `SHOW_TIMING`, sends random `DRAFT`s and `drafted` maps, checks draft secrecy, and asserts that drafts were saved and taken.
- `pnpm typecheck`: passes (`next typegen && tsc --noEmit`).
- `pnpm lint` (Biome) on my files: clean. The full `pnpm lint` still reports problems in files I don't own:
  - `src/app/globals.css` `noImportantStyles` ×3 (WP2, in progress);
  - `data/characters.json` (pre-existing, not read);
  - `tsconfig.json` format, while WP2's `next dev` (`.next-wp2`) had rewritten it. It was back to HEAD later, and the final `pnpm lint` shows only the `globals.css` and `data/characters.json` findings.
- `pnpm test:e2e`:
  - **Run 1:** cold server, machine at about 90 % CPU from other sessions (`next build` in worktrees, `next start` on 3150, WP2's dev server on 3200 and its screenshot script). Result: 9 passed, 4 failed. Every failure was a timeout from slowness: API polls took 5–21 s, the third phone's page load took 23 s, and theme.spec timed out while still in the lobby (the guest's poll lagged), before any match code ran. In the 3-phone test the votes landed after the 20 s vote clock (`wrong_phase` toast).
  - **Rerun of the failed specs against a warm 3100 server** with the same env: `theme.spec` 2/2 passed (33 s), `match.spec` + `rooms.spec` 5/5 passed (5.8 min).
  - **Run 2, full suite, warm server:** 11 passed, 2 failed. Both failures came from leftover lobbies of my back-to-back reruns in `.data/e2e`: "Pizza night" was listed twice (strict-mode violation in rooms.spec), and a public room was missing from the list in home.spec. These are room-list tests that the engine doesn't touch.
  - **Runs 3 and 4 (warm server with a fresh data dir, then the plain command on a calm machine):** 12 passed, 1 failed each time. The failure was `rooms.spec` "one room at a time", a lobby-only test that timed out at 120 s while it passes alone in 9.5 s. The trace showed the cause: the pages of earlier tests were never closed and kept polling (deviation 10).
  - **Run 5, plain `pnpm test:e2e` after deviation 10:** **`13 passed (4.3m)`, `exit 0`.**
- tsconfig: the e2e server did not change `tsconfig.json`; it already lists `.next-e2e`. At the end `git diff tsconfig.json` was empty (WP2 had restored its own change). The servers I started on 3100 are stopped and port 3100 is free. I deleted my temporary data dir `.data/e2e-wp1`.
- **Side effect on WP2:** Playwright empties `test-results/` at the start of every run, and `test-results/` is now empty. WP2's screenshots in `test-results/wp2/` (`backdrop-*.png`) were removed by my runs. WP2, or the lead, should regenerate them, or move them out of `test-results/`, before citing those paths.

## Screenshots

None: WP1 is engine-only and its verification lists none.

## Requests for WP12 and later packages (shared files I could not edit)

- `src/features/room/room-screen.tsx` (WP3/WP4): it still routes `reveal.kind === "theme"` to the vote/theme screen for the **whole** theme show (up to 21 s on a first match), and the cast runs on today's turn screen. That is the interim state the plan expects. `stageFrame` replaces it.
- `src/features/turn/turn-screen.tsx` (WP4/WP12): your own card's meta now reads "Picked by {name}" (`pickedById` for self). The `turn.card.pickedSecretly` fallback is effectively dead during turns. WP12 can drop the key after a grep.
- `src/server/rooms.ts` (WP5): `fallbackCharacters(state)` still asks for every unpicked card. The engine only uses fallbacks for empty cards, so extra ones are ignored. WP5 builds `drafted` (keyed by **picker id**) and should only ask fallbacks for the rest.
- e2e (WP9b, WP12): `newPlayer()` now closes earlier tests' contexts (deviation 10); keep that when editing `pickAll`. `.data/e2e` keeps lobbies whose pages died without closing listed for up to 15 min. Now that pages close, they should leave the list at once, but back-to-back runs used to trip the room-list specs ("Pizza night" listed twice).
- Scene WPs: stage-shots and screenshot scripts should not write under `test-results/`, since every e2e run empties it.
- `server.test.ts` "random pick by theme" still imports `data/characters.json`. That is pre-existing and ROADMAP_BUILD Phase 1 removes it. I didn't touch it and didn't read the JSON.

## Notes for Jean

- **Interim state:** between WP1 and the scene WPs, the live app shows today's vote result for the whole theme show (about 19–21 s on the first match, 10.5 s later), and today's turn screen during the cast. The Ask button is refused (silently) until the cast ends, about 11 s on the first match and 7 s later. The vote screen also shows the cards during the opening (about 10 s on the first match), with the timer refilling. Fine for development, **not for a deploy**.
- The theme vote now lasts 20 s, and its clock starts after the opening.
- e2e runs need a calm machine: under heavy CPU load from other sessions the cold dev server answered polls in 5–20 s, and the timing-based tests failed for that reason alone.
