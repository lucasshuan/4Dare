# WP9a report: the pick card (the form)

## Files
- New: `src/features/pick/{pick-card,card-name-field,card-picture}.tsx`, `src/components/ui/use-image-intake.ts`, `src/app/[locale]/dev/pick-card/{page,pick-card-lab}.tsx`
- Changed: `src/game/character-search.ts` (+ test), `src/components/ui/image-drop.tsx` (now uses `useImageIntake`)
- `messages/*/pickCard.json` unchanged (WP2's strings fit en/pt/ja). No other file touched.

## What was built (API)
- `PickCard` (`pick-card.tsx`): the plan's props, plus two optional ones: `autoFocus` (desktop, when the pick starts) and `onFocusChange(focused)` (lets WP9b hold draft echoes while the field has focus). Re-exports `CardContent`, plus `PickCardState` and `CARD_SETTLED_SCALE` (1.08). Width is 224 / `sm:` 270. Override it with `className` (`cn` merges, e.g. `w-[230px]` for the short-window clamp). `data-pick-card={kind}` sits on the root for e2e.
- The card searches by itself: `useCharacterIndex(lang)`, and `/api/characters` until the index loads, as the old screen did. It shows 5 rows, the matched part in `<mark>`, and the origin under the name.
- `src/game/character-search.ts`:
  - `CardContent` (the plan's type), `cardText(content)`, `toCardView(item)`.
  - `searchMatches(items, q, limit): SearchItem[]`; `searchItems` now wraps it.
  - `exactMatch(items, name)`: the normalised name equals `nameKey`. Aliases and single words don't count, and the most popular of two same-name characters wins.
  - `matchRange(name, query)`: the `<mark>` offsets, folded the same way as the search.
  - The pure state machine: `cardStep(field, event)` / `closedField(content)` with `CardField { content, rows, highlight, open }`. Events: `input`, `rows` (late results), `move`, `hover`, `choose`, `enter`, `escape`, `blur`.
- The rules `cardStep` implements:
  - Rows → `typing`, previewing row 0.
  - No rows → `new` at once. A `new` keeps its picture while its name is edited.
  - ↓/↑ move the highlight. ↑ from row 0 clears it (no ghost).
  - Enter or a click picks the highlighted row (`via: "list"`). Enter with no highlight: an exact name → `picked` (`"exact"`), otherwise `new`.
  - Blur: an exact name → `picked`. No highlight → `new`. Otherwise the preview stays (`typing`).
  - Esc only closes the list.
- `useImageIntake({ onPicked, paste })` returns `{ accept, error, setError, over, dropHandlers, inputProps, exportError }`. Also exported: `cropToWebp`, `coverArea`, `IMAGE_ACCEPT`.
  - Checks type, 8 MB and decodability. Downloads a pasted or dropped web picture when its site allows it.
  - Ignores pastes inside `[data-chat]`, and a text paste into a field stays text.
  - `onPicked` receives an object URL, which the receiver owns.
- `CardPicture`:
  - Layers: the silhouette, then the ghost (.45; 0.3 s in, 0.15 s out), then the picture.
  - The flip on pick: `rotateY −70→0`, 0.6 s, `backOut(1.5)`. Not for `via: "restore"`. A new name's first picture pops (1.06→1).
  - The drop zone is shown for a new name without a picture, and on drag-over of any picked or new card (`.hot`, scale 1.02).
  - Drop, paste or browse: the centre crop is exported and sent at once. The card then shows react-easy-crop inline, with a zoom pill and a ✓ button. Each adjustment is exported and sent 500 ms after it settles. A press outside, Esc or ✓ ends the crop, and a pending export is flushed.
  - `new`: `onNewImage` sets `uploading: true` while it runs, then `imageUrl`. If it fails, the picture reverts. `picked`: `onLibraryImage`, and the crop stays shown on that card.
  - "Sending the picture…" status while an upload runs. Inline `common.image.*` errors, dismissible.
  - Swap pill on hover or focus-within, always visible on phones and coarse pointers. Tray: the current picture (ring) + "Upload yours", with `room.pick.imageHint` as its tooltip for library characters. It is placed per spec B §4.2 and closes on an outside press or Esc.
- Seal: shown in `new`, slams in (2.2/−20° → 1/8°, 0.45 s, `backOut(2.4)`), stays after the card freezes.
- `confirmed` / `timeUp`: the field is read-only, there is no list, pill, tray or crop, and the card scales to 1.08 from the top (0.5 s / 0.4 s, `backOut(2)`).
- Stamp (`stamp`): centred on the card at 42%, slams 2.4/−16° → 1/−8°.
- Seal and stamp use `AnimatePresence initial={false}`, so a reload doesn't replay them.
- Dev page `/[locale]/dev/pick-card` (dev only, local mode works):
  - Buttons for every preset and state.
  - Query parameters: `?preset=empty|typing|picked|restore|new|newPicture|uploading&state=…&stamp=1&names=long&fail=1`.
  - Fake uploads (900 ms), and a dump of the value and callbacks.

## Deviations from the plan
1. **Row sub-line is the origin alone.** `SearchItem` has no theme pick counts (spec B §8.3), so `rowPicks*` are not used yet. WP9b can annotate rows if it gets counts.
2. **`new` is immediate when the search has no rows** (plan), not spec B §6's 600 ms commit. The seal can flicker in and out while letters are added and removed around a match. That follows from the plan's rule.
3. **Until the index loads, a keystroke keeps the previous rows** (none on the first keystroke), and the server's rows replace them. The very first letters may show "New!" for a moment on a cold cache. The lobby prefetch normally avoids this.
4. **The phone picture shrinks to 62% while the field has focus** (plan §7 / WP9b acceptance). It lives in the card (`compact`), because the card owns the picture.
5. **The dev page has a second file** (`pick-card-lab.tsx`, its client body) next to `page.tsx`.
6. **`ImageDrop`: two small, intended changes.** A paste inside `[data-chat]` is ignored (plan 1.11), and the file input is cleared after each choice. Its API and everything else are unchanged; `profile-screen.tsx` and `pick-screen.tsx` compile untouched.
7. **No duplicate of the tray's picture tiles.** Spec B's pointer to "real tiles §8.4" leads nowhere. The tray holds the current picture + "Upload yours", per the acceptance.

## Requests
- No shared file needed editing.
- The global `:focus-visible` outline in `globals.css` is unlayered, so Tailwind's `outline-none` can't override it. The name input uses an inline `outline: none`, because its border is the ring. WP12 might move that rule into `@layer base`.
- For WP9b:
  - Disable Confirm/Random while `value.kind === "new" && value.uploading`.
  - A library picture swap has no `uploading` flag in `CardContent`: `onLibraryImage`'s promise is the signal.
  - `CardContent.typing.preview === null` (↑ past the first row) means "typed name, no library id".
  - On restore, pass `via: "restore"` so the card doesn't flip.
  - The card positions the stamp itself; the screen only passes `stamp`.

## Verification
- `pnpm exec vitest run src/game/character-search.test.ts` → `Tests 20 passed (20)`: exactMatch, matchRange and the reducer: rows → preview, no rows → new, arrows, Enter, click, blur, Esc, late rows.
- `pnpm typecheck` → `✓ Types generated successfully` and tsc clean. `pnpm exec biome check` (my 9 files) → `No fixes applied`, 0 errors.
- Scripted checks on the dev page:
  - `aria-expanded=true` and `aria-activedescendant` follow ↓.
  - "BATMAN" + blur → picked `exact`. "bat" + ↑ + blur → `new`. A click on a row → picked `list`. `maxlength=60`.
  - A paste in `[data-chat]` is ignored. A page paste on a picked card → `onLibraryImage`. A browsed file on a new card → `uploading: true`, then `imageUrl`.
- Screenshots in `.data/shots/WP9a/`:
  - Desktop and phone `01`…`11`: empty, typing, picked (mid-flip), pill, tray, new while typing, new, crop + uploading, new + picture, confirmed, timeUp + stamp.
  - `desktop-dark-{new,typing}`, `phone-pt-long-{new,stamp}`, `phone-ja-{new,stamp}`.
  - Remote library pictures don't load in this sandbox (`ERR_TUNNEL_CONNECTION_FAILED`), so library cards show the silhouette.

## Notes for Jean
- Pressing ↑ on the first row is how you say "my typed name, not the suggestion". Blur or Enter then makes it a new character.
