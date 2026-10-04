# WP9b report: the pick screen around the card

## Files
- Rewritten: `src/features/pick/pick-screen.tsx`, `src/game/show-timing/pick.ts` (adds `PICK_TABLE`), `src/features/stage/lab/scenarios/pick.ts`, `e2e/picture.spec.ts`, `e2e/helpers.ts` (`pickAll` only).
- New: `src/features/pick/{pick-hand.tsx,done-row.tsx,use-pick-draft.ts,draft-api.ts,draft-api.test.ts}`.
- Unchanged: `draw-feedback.tsx` (reused as is, placed by the screen), `messages/*/pickCard.json` (every string fits en/pt/ja).

## What was built
- `PickScreen`: `PickIntro({ show })` during draw/target (WP8's props only), otherwise the table. It asks for the hand as the draw starts.
- The table:
  - Title "A character for [av] Leo" (`withNames`).
  - From `lg`: `[spacer 210][card][actions 210]`. Below `lg`: a column `[card][actions row]`.
  - Confirm is `keyClass("yes")` at 56/64 px. Random is the 44 px `.s-btn` with the dice spin and "Draw another" after a draw. Random is hidden for a typed theme. The `not_enough_picks` note and the ⏱ rule (`lg` only) stay.
  - `DrawFeedback` shows over the card 650 ms after a draw.
  - Card width is `clamp(200, (sceneH − 360)/1.25 + 24, 270 | 224)`, passed to `PickCard` through `--pick-w`.
- Entrance: `useStageTimeline` from the theme show's `entrance` beat, with `PICK_TABLE` = title 0, card 0.1, hand 0.6 + 0.06·i, actions 0.8, label 0.9. Elements carry their from-styles inline. Reduced motion keeps the same times with 0.2 s fades. A second timeline on the root fades the table over the last 0.4 s of the cast's `picked` beat.
- Confirm sends `confirmCard`:
  - picked → `{ characterId }`;
  - typing over a highlighted row → that row's id;
  - a new name, or typing with no highlight → `{ name }`, after `flush()` so the stored draft holds the picture.
  - Confirm and Random are disabled while a new picture or a library swap uploads, until `stepStartsAt`, and once the card is frozen.
- Card state:
  - `timeUp` = the deadline passed (`usePast`, server clock) while the card was open and not confirmed before it. Confirmed → `confirmed`.
  - A frozen card ignores late `onChange` calls (a crop or upload that ends after Confirm).
  - Once the server has the pick: a card left empty flips to the drawn character (`via: "random"`), and a half-typed name shows the character it became (`restore`). A new name keeps its seal.
- `PickHand` / `usePickHand(theme, lang)`:
  - query `handKey(themeId, lang)` = `["theme-hand", id, lang]`;
  - `drawHand(hand, "<youId>:<round>")` shows 5 of the 8, in the route's order;
  - fan `rotate(k·6°) translateY(|k|·8px)`, 92/70 px `MiniCard`s, heart and likes only when > 0 (aria "name, Liked by N players");
  - a tap → `picked` via `hand` (flips) → saved at once;
  - fixed at the bottom (`-70px`, phones `-60px + var(--dock)`); it drops away on confirm (0.5 s `p2In`) or timeout (0.4 s).
- `DoneRow`: 36 px avatars in `view.players` order (.45 → 1), ticks pop (0.4 s `backOut(3)`), and "Done! Waiting for [av]A and [av]B" (`Intl.ListFormat` conjunction, wraps) → "Everyone has picked!". It rises in 0.35 s after Confirm. Fixed at the bottom (34, phones 78 + dock).
- `usePickDraft({ code, pick, content, setContent, focused, deadline, items, active }) → { flush, pause }`:
  - when it saves: 600 ms debounce while typing; at once on a row, a hand card, a picture or a blur;
  - one ordered PUT at a time; nothing while uploading, after the deadline, or before the restore;
  - a final flush at `deadline − 1500 + rand(400)` only if dirty, plus a `keepalive` PUT on `pagehide`;
  - a 403/409 answer stops it;
  - restores on mount (a library id waits for the index); later only when the server's draft is new to this page and the field is neither focused nor dirty;
  - Random's draw is taken as already saved.
- `draft-api.ts` (pure, tested): `toDraft`, `fromDraft`, `draftKey`, `putDraft`, `uploadDraftImage`, `fetchHand`, `handKey`, `drawHand`, `HAND_SHOWN`.

## Deviations from the plan
1. **Hand and done row are `position: fixed`** to the window, not absolute in the scene. `MatchFrame`'s `<main>` has no definite height, and the window's bottom edge is the scene's.
2. **The row layout starts at `lg`** (1024 px). The 770 px row doesn't fit between 640 and 1023 px, so those widths stack, with the 270 px card.
3. **The stamp is per mount.** A page loaded after the server's `TIMEOUT` (a reload inside the 1.3 s `picked` beat) shows no stamp, because nothing in the view says which card timed out. In the lab, shoot it with `play=1` from before the deadline.
4. **Restoring a library id the index lacks** shows it as picked with the saved name and no picture.
5. **`pickAll` and `picture.spec` add a per-run tag to the names** ("Zqxj Hero k3f9a1"). Local e2e data keeps created characters in the index, so a fixed name would come back as a row on the next run. `picture.spec` drops (rather than browses) the .jfif. It waits until the view's `pick.draft.imageUrl` is set before pressing Confirm, so it never races the crop export.
6. **Entrance times live in `show-timing/pick.ts` as `PICK_TABLE`**, client only. They are not in `SHOW_MARKS`, because `index.ts` is not mine and nothing on the server needs them.
7. **The lab seeds `["character-index", lang]` and the hand.** Both hooks keep their own 60 s `staleTime`, so a remount after a minute refetches from local mode, where the hand is empty.

## Requests
- Paste guard (WP4's request): the card's paste listener lives in WP9a's `use-image-intake.ts`, which already skips targets inside `[data-chat]` (its own `inChat`). The screen adds no listener. WP12 may switch it to `insideChat` from `src/lib/focus.ts`.
- `card-picture.tsx` (WP9a) is untouched by me. WP9a-review findings 1, 2 and 4, if still open, belong there. The screen only blocks the late `onChange` side of finding 4.
- WP4/WP12: on phones the match header wraps to two rows on the pick screen too (tag, then leave + clock). That pushes the table down about 60 px; it still fits at 390×844.
- WP12: the `room.pick` keys in plan §4's "unused" list are now unused. `random`, `randomAgain`, `randomHint`, `searchLabel`, `imageHint` and `rate*` are still used. `pickCard.rowPicks*` stays unused (no counts per row).
- e2e not run (WP12): `pickAll` now uses `getByRole("combobox", { name: /character for/i })`, the "New!" text and `button /^confirm$/i`.

## Verification
- `pnpm exec vitest run src/features/pick/draft-api.test.ts src/features/stage/lab/scenarios.test.ts src/i18n/messages.test.ts`: 3 files, 53 tests passed.
- `pnpm typecheck`: clean. `pnpm exec biome check` on my 11 files: no errors.
- Lab screenshots (`.data/shots/WP9b/01-18`): entrance at 0.35 s, the table, typing with the ghost and list, a hand pick, "New!" with the drop zone, the tray over the actions, all picked, the stamp, dark, pt long names (phone), ja, a typed theme (no Random, no hand), the picked fade. No page errors.
- Live run on :3100, 2 players (`20-24`): picture paste → `POST draft/image 200`, then `PUT draft 204`. Confirm was disabled during the upload. The draft held `{characterId: null, name, imageUrl}` before Confirm. Typing "Bat" + blur saved `{characterId: Batman, name: "Bat"}`. After a reload the card came back as typing "Bat". "Done! Waiting for [av]PillowPony". The other player received the new character with its picture.

## Notes for Jean
- At 800 px tall, the hand shows only the top of its pictures: the prototype's −70 px bleed hides the names. Raising it is one class in `pick-hand.tsx`.
