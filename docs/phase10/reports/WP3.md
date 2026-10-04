# WP3 report: stage runtime and lab

## Files

Created:
- `src/features/stage/stage.ts`: pure stage logic (`stageFrame`, `stageLook`, `showAt`, `beatAt`, `beatOf`, `markAt`, `markOf`, `isShow`; types `StageFrame`, `StageArea`, `StageScreen`; re-exports `Look`, `Tone`, `Glyphs` from `stage-backdrop.tsx`).
- `src/features/stage/stage.test.ts`: 21 tests on views built by the real engine.
- `src/features/stage/stage-context.tsx`: `StageProvider`, `useStage()`.
- `src/features/stage/use-stage-timeline.ts`: `useStageTimeline`, `layoutRect`, `PHONE`, `TimelineInfo`.
- `src/features/stage/lab/`:
  - `scenarios.ts` (`labRoom`, `labTime`, `labFixtures`, `LabRoom`), `scenarios.test.ts` (27 tests);
  - `params.ts` (`LabParams`, `LAB_DEFAULTS`, `LAB_SHOWS`, `parseLabParams`, `labSearch`);
  - `fixtures.ts` (`SceneFixtures`, `portrait`, `labCharacter`, `exampleCard`, `labPlayers`, `labThemes`, `LAB_CHARACTERS`, `LAB_EXAMPLES`);
  - `lab-screen.tsx` (`LabScreen`), `timeline-demo.tsx` (`TimelineDemo`);
  - `scenarios/{opening,theme,draw,pick,cast,chat}.ts`: the per-scene stubs, each `scenario(params): SceneFixtures` returning `{}`.
- `src/app/[locale]/dev/stage/page.tsx`: the lab route, `notFound()` in production.
- `src/features/room/room-stage.tsx`: `RoomStage` and `RoomProblem`, extracted from `room-screen.tsx`.
- `e2e/stage-shots.spec.ts`: the screenshot matrix, skipped unless `STAGE_SHOTS=1`.

Changed:
- `src/lib/hooks/use-server-clock.ts`: `ServerClock`, `ServerClockContext`, `useClock()`. `useServerClock` reads the context clock when there is one.
- `src/features/data/room-context.tsx`: `RoomProvider` provides the clock and takes an optional `clock` prop. `serverTime()` reads that clock.
- `src/features/room/room-screen.tsx`: renders `<RoomProvider><RoomStage/></RoomProvider>`. The joining logic stays. `PhaseScreens`, `useRoomTab`, `useStepSound`, `usePreloadCards` and `RoomProblem` moved to `room-stage.tsx` unchanged.

No other file touched. `tsconfig.json` was rewritten by my dev server and is back to HEAD. `.next-wp3` and my data dirs are removed.

## What was built (API for later WPs)

### Clock (`use-server-clock.ts`, `room-context.tsx`)
- `ServerClock = { now(): number; frozen: boolean; rate: number }`.
- `RoomProvider` provides `{ now: () => Date.now() + offset, frozen: false, rate: 1 }`, or the `clock` it is given (the lab's).
- `useServerClock(offset, everyMs)` keeps its signature. Under a room it reads the room clock. A frozen clock re-renders only when it is moved, and is read at render time.
- `useClock(offset?)` returns the clock itself, for code that needs `frozen` or `rate`.

### `stageFrame(view, now)` (`stage.ts`)
Returns the `StageFrame` of plan 1.2. Choices the plan left open:
- **Routing** follows the 1.2 table, `reveal.prev` included. Shows only count in match phases.
- **`show` before its first beat:** when the clock reads a hair before a queued show (skew only), `show` is that show with `beat: null`, and its first beat's screen is used.
- **`themeFrom`:**
  - While a theme show is in the view (current or `prev`): its theme beat + `themeTag`, clamped.
  - After it: `0`, meaning always.
  - `null` outside the match area or with no theme.
- **`clockFrom` / `clockPops`:**
  - A show in the view holds the clock: `clockFrom = stepStartsAt`, `clockPops: true`.
  - Under an answers or guess reveal: `clockFrom` is the reveal's start, for today's recharge.
  - `null` outside the match area or without a deadline.
- **`historyFrom`:** turn screen only. With a cast in the view: entrance + `historyIn`. Otherwise `0`.
- **`next`:** the earliest of every beat edge, show edge, look mark, `themeFrom`, `clockFrom`, `historyFrom`, the end of an answers or guess reveal and `stepStartsAt`, after `now`.

### `stageLook(view, now)` (`stage.ts`)
Plan 1.9 row by row. The marks come from `SHOW_MARKS` (`curtainWash`, `themeWash`, `targetWash`, `orderSpot`), so a scene WP retiming a wash needs no edit here.
- Glyphs and colours:
  - brand: `"q"` in `var(--brand-butter)`;
  - butter: `"q"` in `var(--on-butter)`;
  - theme and seat-with-set: `"set"` in `var(--ink)`, or for a typed theme `"typed"` in `var(--sky)`;
  - seat-with-"?": WP2's `seatLook(seat, 1)`, so it matches today's turn screen exactly.
- Fallbacks: if the target or picker is unknown, the theme look; with no turn, the canvas.

### `StageProvider` / `useStage()` (`stage-context.tsx`)
- One `setTimeout` to `frame.next`, at the clock's rate, plus a catch-up on `visibilitychange`.
- The frame is worked out in render; an equal frame keeps its identity.
- A timer that fires a hair early still advances, because it records the moment it was set for.
- A stopped clock sets no timer.

### `useStageTimeline({ startsAt, build, deps })` (`use-stage-timeline.ts`)
Plan 1.3, with these mechanics:
- `build(scope, { reduced, phone })` → `createScopedAnimate({ scope })(sequence)` → paused → `sync`.
- `sync` pauses before any seek, so a seek to the end never finishes the animation and drops its frame.
  - Before `startsAt`: held at 0, with a timer to play on time.
  - Past the end, or with a frozen clock: held at the clamped time.
  - Otherwise: `speed = clock.rate`, seek only when off by more than 0.25 s or not running, then play.
- Re-sync every 1 s and on `visibilitychange`.
- **Rebuild** when `deps`, reduced motion or the phone breakpoint change, on a resize of the scope (debounced 150 ms) and once on `document.fonts.ready`.
  - The rebuild cancels the old timeline and builds and seeks the new one in the same task, so no frame shows the gap. The same holds for React's dev double mount.
- `reduced` comes from `useReducedMotionConfig()`, so `MotionConfig` decides.
- `PHONE = "(max-width: 639.98px)"`.
- **`layoutRect(el, scope)`:** an element's box inside the scope from layout only (the `offsetParent` chain). Transforms and scaled parents don't change it. Scene authors should measure with it rather than with `getBoundingClientRect`.

### The lab (`/[locale]/dev/stage`, dev only)
- **The room** (`labRoom(params)`): a whole match played by the real engine on a fixed clock, every state kept with its time:
  - lobby, opening, vote (or the host typing), theme show, picks (or a timeout with the viewer's draft), cast;
  - a turn: question, answers reveal, hit;
  - give-ups, then the podium.
  - `view(now)` is `toView` of the state at that time, for the chosen viewer.
- **Marks:** `lobby, opening, vote, theme, pick, cast, turn, result`. `show` + `at` (seconds, may be negative) picks any moment.
- **URL params:**
  - From the plan: `show, at, players (2-4), you (0-3), match (first|later), rule (cards|sentence), typed, tie, set, play, names (short|long), theme (light|dark)`.
  - Added: `timeout, speed (1|0.5|0.25), ui, backdrop, demo, reduced`.
  - The URL follows every change (`history.replaceState`), so every moment is a link.
- **Rendering:** the room's own `RoomStage` inside a `RoomProvider` with the lab clock, frozen or running.
  - The page renders in the browser only: the clock is the page's own, and data-URI pictures load before hydration and would miss `onLoad`.
  - `StageProvider` drives the HUD, and a `StageBackdrop` shows `frame.look` (see requests for WP4).
  - A separate React Query client is seeded with `SceneFixtures.queries`, for the hand and the chat.
- **Panel** (hidden with `ui=0`):
  - play/pause, speed, a scrubber over the whole match, jumps to each mark, ±0.1 s;
  - every variant, and links to en/pt/ja;
  - a HUD of the frame: area, screen, show, beat with its elapsed time and length, look, tag/clock/history times, next.
- **Fixtures:** drawn portraits (SVG data URIs: initials on a colour, no art, no network).
  - Short names Bia, Rafa, Leo, Nina.
  - Long names: guests 532, 956, 843, 99 = RaposaMisteriosa, PandaAventureiro, PandaTrabalhador, GatoAconchegante (16 characters in pt).
  - Themes from `THEME_SET_EXAMPLES`. The `set` param's first theme wins.
- **Scene stubs:** each `lab/scenarios/<scene>.ts` returns `SceneFixtures`:
  - `themes`, `examples`, `typedTheme`, `characters`, `draft`, `question`, `queries`;
  - later files win for single values, and `queries` add up;
  - `scenarios.test.ts` builds all 24 variants, so a fixture that breaks the engine fails a test.
- **`demo=1`:** the 4-second `TimelineDemo`. Dots hop into a measured jar, the jar shakes, and a bar and a readout follow the clock. It is the proof of seek, resync and rebuild below.

### `e2e/stage-shots.spec.ts`
- `STAGE_SHOTS=1 pnpm exec playwright test e2e/stage-shots.spec.ts`.
- Each moment is shot on desktop 1280×800 and phone 390×844, light and dark, with `ui=0` and the dev overlay hidden.
- **Output:** `.data/shots/stage/<moment>-<lang>-<device>-<theme>[-reduced].png`, never `test-results/`. `STAGE_SHOTS_DIR` changes it.
- **Default matrix:** every mark, the three shows at three moments each, and the long names in pt.
- **Scene WPs need no edit:**
  - `STAGE_SHOTS_SET="show=theme&at=1.5;pt:show=cast&at=2&players=2"`: a `pt:` or `ja:` prefix shoots that moment in that language only;
  - `STAGE_SHOTS_LANGS=en,pt,ja`;
  - `STAGE_SHOTS_REDUCED=1`.

## Deviations from the plan

1. **`ServerClock` also has `rate`.** The lab can run at 0.5× or 0.25×; the timer and the timelines follow it. Rooms always use 1.
2. **`labRoom(params)`** returns `{ viewer, marks, start, end, state(now), view(now), queries }`. The plan had a single `state`; a match is a series of states, so `state` is a function of time.
3. **More lab params and files than listed** (see above): `timeout, speed, ui, backdrop, demo, reduced`. `show` also takes the step marks (`lobby, vote, pick, turn, result`). The extra files are `params.ts`, `fixtures.ts`, `timeline-demo.tsx` and `scenarios.test.ts`, all inside `lab/`.
4. **Screenshot path:** `.data/shots/stage/`, per the lead and WP1's report, not `test-results/stage-shots/`.
5. **The lab shows a room-level `StageBackdrop`** from `stageLook`, so the looks can be checked before WP4 mounts the real one. `backdrop=0` turns it off. During turns `TurnScreen` still renders its own, with the same look, on top.
6. **Measuring:** the plan says to measure with `getBoundingClientRect`. During a rebuild the elements still wear the last frame's transforms, so I added `layoutRect` and recommend it in the hook's doc.
7. **Theme-show routing:** vote vs theming is `view.vote || the show has a settle beat`, where the plan uses only `view.vote`. Reason: when every card is confirmed during the theme show, the cast queues with the theme show as `prev`, and `view.vote` is then `null` (see requests). The case is reachable through the API or clock skew.
8. **`RoomProblem`** moved to `room-stage.tsx` with `PhaseScreens`, because the closed phase renders it there. `room-screen.tsx` imports it back.
9. **"Always" is `0`** for `themeFrom` / `historyFrom` (a time in the past), not a separate flag.

## Verification

- `pnpm exec vitest run src/features/stage`: `Test Files 2 passed`, `Tests 48 passed` (stage 21, lab 27).
- `pnpm test`: `Test Files 21 passed (21)`, `Tests 268 passed (268)`. This includes WP5's and WP9a's in-progress tests.
- `pnpm typecheck`: passes.
- `pnpm lint`: 0 errors. There are 3 warnings, the old `globals.css` `!important` ones, plus 1 info on `data/characters.json`.
- **Full e2e:** run against my own server so other agents' runs on 3100 couldn't stop it mid-run (one did, twice, during my shots).
  - Server: `next dev -p 3103` with the e2e env (`DARE_SHOW_SCALE=0.25`, Supabase vars empty, its own data dir).
  - Command: a scratch Playwright config pointing at it, removed afterwards.
  - Result: `13 passed (4.0m)`, 17 stage shots skipped. The extraction changes nothing visible.
- **Timeline proof** (Playwright script on the lab's `demo=1`): `ALL PASS`.
  - **Reload:** at 0.2, 0.7, 1.1, 1.45, 2.1 and 6 s, reloading gives the identical frame: the dot transforms, the bar, the jar rotation and the readout. Past the end it is held at 4.00.
  - **Resize:** at 1.5 s dot 0 sits on the jar (856 = 856). After resizing to 420 px it sits on the moved jar (360 = 360), so the measured hop was rebuilt.
  - **Running clock:** at 0.25× the readout shows 0.51 after 2 s.
  - **Tab switch:** with the clock pushed +4 s, a `visibilitychange` resyncs at once (1.56, expected 1.55).
  - **Drift:** a second +4 s jump is corrected by the 1 s check (2.88, expected 2.9).
  - **Reduced motion:** the reduced build has no hop and no shake.
- **Stage shots:** `STAGE_SHOTS=1 pnpm exec playwright test e2e/stage-shots.spec.ts` gave `16 passed (3.1m)`. Extra sets (pt long names, ja, typed, tie, later match, reduced) passed too, once rerun after another agent's run took 3100 down.
- **Console:** no errors on the lab apart from the blocked Vercel analytics scripts (sandbox network). Once, the 3100 server log showed React's "Can't perform a React state update on a component that hasn't mounted yet". I could not reproduce it on any matrix moment (desktop and phone, light and dark, captured in the page console). It may come from a context closed mid-hydration.

## Screenshots

`.data/shots/stage/` (92 files, each in desktop/phone × light/dark):
- **Default matrix:** `lobby@2`, `opening@{0.3,2,9}`, `vote@1`, `theme@{1,5,12}`, `pick@1`, `cast@{0.5,2.5,7}`, `turn@6`, `result@1`, all `-en-`.
- **Long names in pt:** `theme@1-names-long-pt-*`, `cast@2.5-names-long-pt-*`, `turn@6-names-long-pt-*` (also `-reduced`).
- **Variants:**
  - `opening@9-ja-*`;
  - `theme@5-typed-1-pt-*` (typed: pen and "?" glyphs on the theme wash);
  - `theme@0.5-tie-1-players-3-en-*`;
  - `opening@0.5-match-later-players-2-en-*`;
  - `theme@5-en-*-reduced`.
- **Early checks with the panel and HUD visible:** `.data/shots/wp3-check/`.

Today's screens are what you see inside the shows. For example, the vote screen shows its cards during the cold open, as WP1 warned. The backdrops are `stageLook`'s.

## Requests for WP12 and WP4 (shared files I could not edit)

- ~~`src/game/view.ts` (WP12): `voteView` while the theme show runs as `reveal.prev`~~: already fixed in `3fe4f68` (WP1 re-review); nothing to do.
- **`lab-screen.tsx` (WP4, which takes the lab over):**
  - remove `LabBackdrop` and the `backdrop` param once `RoomStage` mounts the room-level `StageBackdrop`;
  - the lab already wraps `RoomStage` in a `StageProvider` for its HUD, so a second one inside `RoomStage` is fine;
  - `TurnScreen`'s own `StageBackdrop` goes in WP4 as planned.
- **Scene WPs:** use `layoutRect` for distances, render from-styles inline, and keep the reduced build animating (or setting) the same values. Add fixtures in your own `lab/scenarios/<scene>.ts`. Shoot with `STAGE_SHOTS_SET` rather than editing the spec.
- **Optional (`next.config.ts`):** `devIndicators: false` would drop the dev "N" button from manual lab views. The shots already hide it.

## Notes for Jean

- **The lab:** `pnpm dev`, then `/en/dev/stage` (or `/pt/…`, `/ja/…`).
  - Pick any moment with the scrubber or the mark buttons, play it at 1×, 0.5× or 0.25×, and switch players, viewer, first or later match, rule cards, typed theme, tie, timeout, theme set, long names, light/dark.
  - The URL is always the current moment, so you can send me a link to a frame.
  - It returns 404 in production.
- **Shots:** `STAGE_SHOTS=1 pnpm exec playwright test e2e/stage-shots.spec.ts` writes the matrix to `.data/shots/stage/`.
- **Until the scene WPs land,** the lab shows today's screens inside each show, with the new backdrops. That is the expected interim state.

## Review (wave 2)

One review after the commit: passed, three lows. Fixed: `StageProvider` never steps back across a boundary when a new offset estimate makes a new clock a few ms behind (`stage-context.tsx`); the stale `view.ts` request above. Left for WP12: `stage.test.ts` has no later-match theme show or cast (the `later` marks of `targetWash` and `orderSpot` and the show without a rule beat).
