# WP4 review (commit 8953358)

Verdict: **passed** (no high or medium defect).

## Checked
- `pnpm typecheck`: passes. `pnpm exec vitest run src/features/stage`: 2 files, 48 tests pass. `biome check` on the commit's 18 source files: clean.
- Acceptance, against the code:
  - Header never remounts: `MatchFrame` is one keyed child (`"match"`) of the area presence; the screens swap in an inner presence under it. The area stays `match` for every match phase and show (`stageFrame`).
  - Tag from `themeFrom` with pop, clock hidden during shows and popping at `stepStartsAt`, recharge kept for answers/guess (`rechargeFrom` = reveal start when `clockPops` is false), header parts use `AnimatePresence initial={false}` so a reload does not pop them.
  - `useReached` is exact: every moment it is asked about (`themeFrom`, `clockFrom`, `historyFrom`, `stepStartsAt`) is in `stageFrame`'s `moments`, so `at < next` means "already past".
  - History button and give up only on the turn screen from `historyFrom`; remembered sidebar waits for the button; sidebar pushes header and main at >= 1024 (sticky, width 0 to 360, `p3Out`/`p3In`); phone drawer 88vw, z-40, scrim, Escape, focus back to the button.
  - Lobby `leave` variants propagate to `Screen`'s `motion.header`/`motion.main` (no intermediate animated motion parent in the lobby); header fades in only when mounted during `curtain`.
  - Backdrop is room-level (`RoomBackdrop` in `RoomStage`), the lab's `LabBackdrop` is gone.
  - `RevealOverlay` keeps the answers/guess whitelist and ignores keys from inside `[data-chat]` only.
  - Ask/Guess: autofocus only when `focusIsFree()` at mount; submit disabled until `useStepStarted()` (Guess also guards `onSubmit`; Ask's implicit submission is blocked by the disabled default button). Turn steps start at once under reveals (`startStep`), so Guess is not held by the answers reveal.
  - `useRoomTab` holds the alert while a show holds the step.
  - `RoomChat` stub mounted for lobby, match and result, not on `closed`; stubs carry the 3.1 props and render nothing.
  - `e2e/reveal.spec.ts` asserts the Guess-field half; its strings (`press any key to close`, `your guess`) match `messages/en`.
- No new i18n keys; names in the history still go through `PlayerName` / `withNames`.
- Engineer screenshots in `.data/shots/WP4/` (desktop push, phone drawer with pt long names) match the plan's look; no new screenshots were needed.

## Defects

### Low: the phone drawer's close button steals focus on every re-render
- File: `src/features/turn/history-panel.tsx` (HistoryBody, the close button's `ref`).
- Problem: `ref={focusClose ? (el) => el?.focus() : undefined}` is a new callback on every render. React detaches and re-attaches a ref whose identity changed on each commit, so `el.focus()` runs on every re-render of `HistoryBody`, not only when the drawer opens. `HistoryBody` re-renders on every room view update (it reads `useRoomContext`), on every `MatchFrame` render (new `onClose`), and on its own filter clicks.
- Effect: with the drawer open (phones and windows under 1024 px), activating a filter with the keyboard, or any incoming view (another player's question or answer), moves focus back to the X; a screen-reader user is thrown back to the top repeatedly. The pattern predates WP4, but WP4 rewrote this file and the acceptance asks that focus behave.
- Fix: focus once on open, e.g. a `useRef` on the button and `useEffect(() => { if (focusClose) closeRef.current?.focus(); }, [focusClose])`, or a stable `useCallback` ref.
