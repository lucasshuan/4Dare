# WP9a review (commit 57bd5c1)

Verdict: **not passed** (one high, one medium).

Checked: `pnpm exec vitest run src/game/character-search.test.ts` (20 passed), `pnpm typecheck` (clean). Combobox ARIA, keys, 5 rows with `<mark>`, empty query, ghost at .45, flip, seal rules, exact match on blur, `maxLength` 60, paste ignored in `[data-chat]`, i18n keys in en/pt/ja, tokens in dark theme, reduced motion (`useAnimate` honours `MotionConfig reducedMotion="user"`), reload (`initial={false}`, no flip on `restore`), and the phone stamp width (en at 390 px: 368 px wide, no horizontal scroll) all hold.

## High

### 1. The crop export loops forever once the crop is touched
- `src/components/ui/use-image-intake.ts:212` returns `exportError` as a new arrow function on every render. `src/features/pick/card-picture.tsx:151` lists it in the deps of the debounced export effect.
- So every render re-arms the 500 ms timer. When the timer fires, `commit` sets `local` and `busy` and emits `onChange`. That render re-arms the timer again, because `session.touched` and `session.area` are still set. The cycle repeats until the crop session ends (outside press, Esc or ✓).
- Measured on `/en/dev/pick-card?preset=new`: browse a picture, move the zoom slider once, then leave it. `canvas.toBlob` ran 2, 5, 9 and 15 times at +1, +3, +6 and +10 s, and the log shows a new `onNewImage` each cycle.
- Effect in the app: a new name re-uploads its picture every ~0.5 s plus upload time. A library character calls `replaceCharacterImage` again and again. That rewrites the hand-fed library row, piles files into storage, and hits the `upload:{id}` rate limit (30 per minute). The same limit also blocks the player's other uploads.
- Fix: make `exportError` stable (`useCallback` over `t`), or drop it from the deps and read it through a ref. Also, only re-arm the timer when `session.area` actually changes.

## Medium

### 2. A library character without a picture can't be given one on a phone
- `card-picture.tsx:418`: the swap pill (and so the tray with "Upload yours") renders only when `picture` is truthy. The drop zone (line 241) shows only for a `new` name without a picture, or while a file is dragged over the card.
- So a picked library character with `imageUrl: null` has no browse control at all. That covers 871 of the 15,042 library characters (read-only `select ... from characters`). The only ways in are paste or drag, which a phone or keyboard user doesn't have.
- The old pick screen showed "Change picture" for every chosen character, whether or not it had a picture, so this breaks something that works today.
- Fix: show the pill (or the drop zone button) on a picked card whose picture is empty too. The tray then holds only "Upload yours".

## Low

### 3. A failed upload reverts silently
- `card-picture.tsx:100` (new name) and `:106` (library) just drop the local picture when the upload fails. No message is shown, so the picture vanishes with no reason given.
- Fix: call `intake.setError(...)` with a `common.image.*` message (or a generic one) in both branches.

### 4. The flush on freeze sends a picture after Confirm or the deadline
- When the card freezes, the effect at `card-picture.tsx:168` calls `endSession`, which flushes the pending export. `commit` (line 80) never checks `editable`.
- Case: a player drags the crop and presses Confirm within 500 ms. The `pointerdown` flush starts `cropToWebp` asynchronously, so `uploading` is not yet true when Confirm's click runs. The server confirms with the older draft picture. The upload then runs anyway and sets `imageUrl` on the frozen card, so the card shows a crop that the saved character doesn't have. At time-up the same flush uploads after the deadline.
- Fix: set `uploading` synchronously before the async crop export, or skip `commit` once the card is no longer editable.
