# WP4 report: room tree, match frame, history, focus guards

## Files
- New: `src/features/room/match-frame.tsx`, `src/lib/focus.ts`; stubs `src/features/stage/{cold-open,theme-stage,pick-intro,cast-scene}.tsx`, `src/features/chat/room-chat.tsx`; `e2e/reveal.spec.ts`.
- Rewritten: `src/features/room/room-stage.tsx`, `src/features/turn/history-panel.tsx`.
- Changed: `turn-screen.tsx`, `vote-screen.tsx`, `theme-screen.tsx`, `pick-screen.tsx` (no `GameFrame`, scene stubs mounted), `reveal-overlay.tsx` (chat key guard), `screen.tsx` (`leave` variants), `lab/lab-screen.tsx` + `lab/params.ts` (no `LabBackdrop`, no `backdrop` param).
- Deleted: `src/features/room/game-header.tsx`, `src/features/turn/turn-backdrop.tsx`. `lobby-screen.tsx` and `timer.tsx` unchanged.

## What was built
- `RoomStage` = `StageProvider` > room-level `StageBackdrop` (look from `useStage()`, set from `view.theme`) > `AnimatePresence mode="wait"` keyed by area > `RevealOverlay` > `RoomChat` (not on `closed`). The lobby wrapper plays `exit="leave"`; `Screen`'s plain header slides up (`y −100%`, opacity 0) and its main fades and scales to .97 (0.45 s `gs.p2In`). Match: `MatchFrame` (one instance for the match) holds an inner `AnimatePresence mode="wait"` keyed by screen, opacity only (0.2 s in, 0.15 s out). Result: `finishedWait ? null : <ResultScreen/>`. Tab alerts are held while a show holds the step (`useRoomTab`).
- `match-frame.tsx` exports:
  - `MatchFrame({ children })`: row `[sidebar] [column: MatchHeader + <main>]`; column padding `pb-[calc(2rem+var(--dock))]` (short 1rem). History state lives here: the button exists only on the turn screen from `historyFrom`; the remembered sidebar (`useHistorySidebar`, same key) opens only once the button exists; the phone drawer resets when the button goes.
  - `MatchHeader({ history })`: left `[HistoryButton][ThemeTag]`, right `LeaveMatchButton · GiveUpButton · Timer`; 64 px phone, 76 px desktop (py 12/18 around 40 px pills). Pops when crossing live (`AnimatePresence initial={false}` each): history and give up 0.3→1 `backOut(2.4)` 0.5 s, tag 0.4→1 `backOut(2.2)` 0.5 s, show clock 0.6→1 `backOut(2.5)` 0.4 s; the answers/guess clock keeps its recharge and doesn't pop. The header fades in (0.4 s) only when mounted during the `curtain` beat.
  - `useReached(at)`: true once server time `at` has passed, read from `frame.next` (no clock read, exact at the boundary because the stage wakes at every listed moment). Valid for `themeFrom`, `clockFrom`, `historyFrom`, `stepStartsAt`.
  - `useStepStarted()`: `stepStartsAt` null or reached.
  - `useSceneShow(kind, beats)`: the show while one of those beats runs; scene WPs mount their scene with it.
- `history-panel.tsx`: `HistoryButton({ open, onClick, ref })` (PanelLeft icons, count pill, phone 40 px with sky corner count), `HistorySidebar({ onClose })` (sticky full-height, width 0↔360, open 0.55 s `p3Out`, close 0.4 s `p3In`, 360 px flat panel anchored right), `HistoryDrawer({ open, onClose })` (88vw, from the left, scrim 0.3 s, z-40, `role=dialog aria-modal`, Escape/scrim/X close, focus to X on open and back to the button on close), `HistoryBody` (you first then turn order, 26 px extrabold title, spec C 4.4 paddings), `WIDE`, `useHistorySidebar`.
- `focus.ts`: `CHAT_SELECTOR`, `insideChat(target)`, `focusIsFree()`. `RevealOverlay` ignores keydowns inside `[data-chat]` only. `Ask`/`Guess` autofocus only when `focusIsFree()` at mount; their submit (and Enter) is disabled until `useStepStarted()`.
- Stubs (final 3.1 props, render `null`): `ColdOpen({ show })`, `ThemeStage({ show, from })`, `PickIntro({ show })`, `CastScene({ show })`, `RoomChat()`. Mounted: vote/theme screens (`ColdOpen` on curtain/intro/round, `ThemeStage` on theme/rule with `from` "vote"/"typed"), pick screen (`PickIntro` on draw/target), turn screen (`CastScene` on received/order), each via a local `Scenes`/`useSceneShow`.

## Deviations from the plan
1. `MatchFrame`'s root is a `motion.div` with an exit fade (`dur.base`), so match → result fades out as today's screens did (a plain component would vanish at once under the outer `AnimatePresence`).
2. No `initial={false}` on the area/screen presences: in motion 13 it reaches every descendant motion component through `PresenceContext` and would kill the screens' own entrance animations. The header decides its fade from the beat instead; only the small header presences use `initial={false}`.
3. The phone header still wraps to two rows during turns (history + tag, then leave/give up/clock), as today's header did; a one-row header would cut the theme name to about 90 px.
4. The lab's `TimelineDemo` and HUD stay; only `LabBackdrop` and `backdrop` went.
5. Low contrast finding fixed locally: the turn screen root mixes `--ink-muted` 80% with `--ink` for its descendant `.text-ink-muted` (one arbitrary variant, no token). Light wash: 4.44 → 5.39-5.74:1 on seats 1-4; dark 5.07-5.35 → 5.83-6.16:1. At the exact centre of a corner glow it stays under 4.5 (light 3.6, dark ~3.1), as WP2 measured for the seat ink.
6. `e2e/reveal.spec.ts` is new (plan 6: "Reveal overlay (WP4, e2e)"): the Guess-field half. Not run (e2e waits for WP12).

## Requests
- WP11: the chat root needs `data-chat`; the "key typed in the chat input does not close the reveal" assertion belongs in `e2e/chat.spec.ts`. `RoomChat` is mounted after `RevealOverlay` in the DOM and outside `<main>`; it sets `--dock` itself.
- WP9a (`image-drop.tsx`) / WP9b (pick card paste listener): ignore paste targets with `insideChat(e.target)` from `src/lib/focus.ts`.
- WP7, WP8, WP10: replace the `Scenes` helpers in your screens freely; `useSceneShow` and `useReached` are the intended hooks. WP10: `TurnScreen` no longer renders a backdrop; the strip/body entrance is yours.
- Lead: while deleting `game-header.tsx` and `turn-backdrop.tsx` I staged the deletions by mistake (`git rm --cached`), and commit `e2ac2d0` took them in. That commit's tree doesn't compile without this package's edits; the working tree is consistent again.
- WP12: `playToEnd`'s "Take a guess" click now also waits for the button to be enabled (step start); Playwright's actionability wait covers it. Check the history drawer/sidebar and the header pops in the matrix.

## Verification
- `pnpm typecheck`: passes (whole tree).
- `pnpm exec biome check` on my 18 files: no fixes.
- `pnpm exec vitest run src/features/stage`: 2 files, 48 tests passed (lab params changed). WP4 has no unit tests of its own.
- Screenshots in `.data/shots/WP4/`: `live-opening-{0.1,0.25,0.6,1.2}-{desktop,phone}-light.png` (lobby bar sliding up and content fading over the brand wash; no clock during the opening), `opening-{0.2,0.6,1.2}-desktop-light.png`, `turn-{closed,open}-{desktop,phone}.png` (push and drawer), `turn-*-desktop-theme-dark.png`, `turn-*-phone-names-long.png` (pt), `vote-clock.png`, `lobby-dark-phone.png`. On the phone, Escape closed the drawer and focus returned to the button. No page errors (only blocked external fetches).

